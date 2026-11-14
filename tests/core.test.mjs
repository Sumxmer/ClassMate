import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {bangkokInput,utcDue,freeWindows,timeLabel} from '../lib/model.ts';

test('Bangkok input converts to UTC and round-trips across midnight',()=>{
 const local='2026-11-14T01:25';
 assert.equal(utcDue(local),'2026-11-13T18:25:00.000Z');
 assert.equal(bangkokInput(utcDue(local)),local);
});
test('shared free time merges overlapping lessons and omits short gaps',()=>{
 const classes=[
  {start_time:'09:25',end_time:'11:00'},
  {start_time:'07:30',end_time:'09:00'},
  {start_time:'10:00',end_time:'12:00'},
  {start_time:'19:30',end_time:'21:00'},
 ];
 assert.deepEqual(freeWindows(classes),[[720,1170]]);
 assert.deepEqual(freeWindows([]),[[480,1200]]);
 assert.equal(timeLabel(720),'12:00');
});
test('PWA manifest includes real PNG icons matching declared dimensions',()=>{
 const manifest=JSON.parse(readFileSync('public/manifest.json','utf8'));
 assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){
  const bytes=readFileSync('public'+icon.src);
  assert.equal(bytes.subarray(1,4).toString(),'PNG');
  assert.equal(bytes.readUInt32BE(16)+'x'+bytes.readUInt32BE(20),icon.sizes);
 }
});
test('service worker uses sticky alarm options and navigates on notification click',async()=>{
 const handlers={},notifications=[],opened=[];
 const origin='https://classmate.example';
 const self={
  addEventListener:(type,fn)=>{handlers[type]=fn},
  registration:{showNotification:async(title,options)=>notifications.push({title,options})},
  location:{origin},
  clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}
 };
 vm.runInNewContext(readFileSync('public/sw.js','utf8'),{self,URL});
 const promises=[];
 const waitUntil=promise=>promises.push(promise);
 const data={title:'ปลุก',body:'ตื่นได้แล้ว!',alarm:true,tag:'alarm-id',path:'/g/group?tab=inbox'};
 handlers.push({data:{json:()=>data},waitUntil});
 await Promise.all(promises);
 assert.equal(notifications[0].options.requireInteraction,true);
 assert.equal(notifications[0].options.renotify,true);
 assert.equal(notifications[0].options.tag,'alarm-id');
 assert.ok(notifications[0].options.vibrate.length>4);
 handlers.notificationclick({notification:{data:{path:data.path},close(){}},waitUntil});
 await Promise.all(promises);
 assert.deepEqual(opened,[origin+data.path]);
});
test('service worker returns the offline shell when navigation fails',async()=>{
 const handlers={};
 const offline={body:'offline'};
 const self={addEventListener:(type,fn)=>{handlers[type]=fn},location:{origin:'https://classmate.example'}};
 vm.runInNewContext(readFileSync('public/sw.js','utf8'),{
  self,URL,fetch:async()=>{throw Error('offline')},
  caches:{match:async path=>path==='/offline.html'?offline:undefined}
 });
 let response;
 handlers.fetch({request:{mode:'navigate',url:'https://classmate.example/groups'},respondWith:value=>{response=value}});
 assert.equal(await response,offline);
});
