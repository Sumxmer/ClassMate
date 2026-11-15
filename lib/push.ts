import webpush from 'web-push';
import {check} from './browser';
import type {Ping} from './model';
import {serviceDb,validEndpoint} from './server';
type Job={id:string;user_id:string;group_id:string;ping_id:string|null;title:string;body:string;dedupe_key:string};
export async function dispatch(onlyPing?:string, signal?:AbortSignal){
 const subject=process.env.VAPID_SUBJECT,publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY;
 if(!subject||!publicKey||!privateKey)throw Error('Missing VAPID configuration');
 const db=serviceDb();
 const claim = db.rpc('claim_notifications',{only_ping:onlyPing??null,max_jobs:8});
 const jobs=check(await (signal ? claim.abortSignal(signal) : claim)) as Job[];
 const errors=[];
 for(let i=0;i<jobs.length;i+=8){
  const results=await Promise.allSettled(jobs.slice(i,i+8).map(async job=>{
   signal?.throwIfAborted();
   let alarm=false;
   if(job.ping_id){
    const query=db.from('pings').select('is_alarm,acknowledged_at').eq('id',job.ping_id);
    if(signal)query.abortSignal(signal);
    const ping=check(await query.maybeSingle<Pick<Ping,'is_alarm'|'acknowledged_at'>>());
    if(!ping||ping.acknowledged_at)return;
    alarm=ping.is_alarm;
   }
   const query=db.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id',job.user_id);
   const subscriptions=check(await (signal ? query.abortSignal(signal) : query));
   const results=await Promise.allSettled(subscriptions.map(async sub=>{
    signal?.throwIfAborted();
    if(!validEndpoint(sub.endpoint))return;
    try{
     await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:job.title,body:job.body,alarm,tag:job.ping_id??job.dedupe_key,path:'/g/'+job.group_id+(job.ping_id?'?tab=inbox':'?tab=tasks')}),{TTL:60,urgency:alarm?'high':'normal',timeout:signal?2500:4000,vapidDetails:{subject,publicKey,privateKey}});
    }catch(error){
     const status=(error as {statusCode?:number}).statusCode;
     if(status===404||status===410){
      const remove=db.from('push_subscriptions').delete().eq('id',sub.id).eq('user_id',job.user_id);
      check(await (signal ? remove.abortSignal(signal) : remove));
      return;
     }
     if(!status||status===429||status>=500)throw Error('Push provider temporarily unavailable');
     console.warn('Push rejected by provider',status);
    }
   }));
   if(results.some(result=>result.status==='rejected'))throw Error('Push job has retryable failures');
   const complete=db.from('notification_jobs').update({delivered_at:new Date().toISOString()}).eq('id',job.id);
   check(await (signal ? complete.abortSignal(signal) : complete));
  }));
  errors.push(...results.filter(result=>result.status==='rejected'));
 }
 return {claimed:jobs.length,retry:errors.length};
}
