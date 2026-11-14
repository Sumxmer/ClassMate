'use client';
import {useEffect,useState} from 'react';
import {ActionButton} from '../ui';
import {browserDb,check} from '../../lib/browser';
import {api} from '../../lib/api-client';
export function PushControls({uid,token}:{uid:string;token:string}){
 const [enabled,setEnabled]=useState(false);
 useEffect(()=>{
  if(!('serviceWorker' in navigator))return;
  let active=true;
  navigator.serviceWorker.getRegistration().then(async reg=>{
   const sub=await reg?.pushManager?.getSubscription();
   if(!sub)return;
   const {data}=await browserDb().from('push_subscriptions').select('id').eq('endpoint',sub.endpoint).eq('user_id',uid).maybeSingle();
   if(active)setEnabled(Boolean(data));
  }).catch(()=>{});
  return()=>{active=false};
 },[uid]);
 return <><ActionButton className="button" action={async()=>{
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw Error('อุปกรณ์นี้ยังเปิด Web Push ไม่ได้ ลองเปิดจากไอคอนบนหน้าจอโฮม');
  if(enabled){
   const reg=await navigator.serviceWorker.getRegistration(),sub=await reg?.pushManager.getSubscription();
   if(sub){check(await browserDb().from('push_subscriptions').delete().eq('endpoint',sub.endpoint));await sub.unsubscribe()}
   setEnabled(false);return;
  }
  const key=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if(!key)throw Error('ยังไม่ได้ตั้งค่า VAPID Public Key');
  if(await Notification.requestPermission()!=='granted')throw Error('ต้องอนุญาตแจ้งเตือนจากการตั้งค่าเบราว์เซอร์');
  const reg=await navigator.serviceWorker.register('/sw.js');
  const ready=reg.active?reg:await navigator.serviceWorker.ready;
  const bytes=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  const current=await ready.pushManager.getSubscription();
  const sameKey=current?.options.applicationServerKey&&current.options.applicationServerKey.byteLength===bytes.byteLength&&new Uint8Array(current.options.applicationServerKey).every((b,i)=>b===bytes[i]);
  if(current&&!sameKey){check(await browserDb().from('push_subscriptions').delete().eq('endpoint',current.endpoint));await current.unsubscribe()}
  const sub=current&&sameKey?current:await ready.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
  await api('/api/subscriptions',token,{subscription:sub.toJSON()});setEnabled(true);
 }}>{enabled?'ปิดการแจ้งเตือนอุปกรณ์นี้':'เปิดการแจ้งเตือน'}</ActionButton>{enabled&&<p role="status">เปิดการแจ้งเตือนแล้ว</p>}</>;
}
