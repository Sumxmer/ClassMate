'use client';
import {useEffect,useRef,useState} from 'react';
import {BellRing} from 'lucide-react';
import type {Session} from '@supabase/supabase-js';
import {check,browserDb} from '../lib/browser';
import {type Ping} from '../lib/model';
import {acknowledge} from '../lib/alarm';
import {ActionButton,useData} from './ui';
export function AlarmOverlay({session}:{session:Session}){
 const uid=session.user.id;
 const {data,refresh}=useData(uid,['pings'],async()=>check(await browserDb().from('pings').select('*').eq('to_user',uid).eq('is_alarm',true).is('acknowledged_at',null).gte('created_at',new Date(Date.now()-15*60000).toISOString()).order('created_at').limit(10).returns<Ping[]>()));
 const [unlocked,unlock]=useState<AudioContext|null>(null),[closed,setClosed]=useState<string[]>([]);
 const overlay=useRef<HTMLDivElement>(null);
 const active=data?.find(p=>!closed.includes(p.id)),activeId=active?.id;
 useEffect(()=>{
  let context:AudioContext|undefined;
  function activate(){
   try{
    context??=new AudioContext();
    void context.resume().then(()=>unlock(context??null)).catch(()=>{});
   }catch{}
  }
  document.addEventListener('pointerdown',activate);
  document.addEventListener('keydown',activate);
  return()=>{document.removeEventListener('pointerdown',activate);document.removeEventListener('keydown',activate);void context?.close()};
 },[]);
 useEffect(()=>{
  if(!activeId||!unlocked)return;
  const gain=unlocked.createGain();
  const oscillator=unlocked.createOscillator();
  oscillator.type='sine';gain.gain.value=0.13;
  oscillator.connect(gain).connect(unlocked.destination);
  oscillator.start();
  let high=false;
  const timer=setInterval(()=>{oscillator.frequency.value=high?620:880;high=!high},350);
  return()=>{clearInterval(timer);oscillator.stop();oscillator.disconnect();gain.disconnect()};
 },[activeId,unlocked]);
 useEffect(()=>{
  if(!activeId)return;
  const previous=document.activeElement as HTMLElement|null;
  const button=overlay.current?.querySelector('button');
  button?.focus();
  function trap(e:KeyboardEvent){if(e.key==='Tab'){e.preventDefault();button?.focus()}}
  document.addEventListener('keydown',trap);
  return()=>{document.removeEventListener('keydown',trap);previous?.focus()};
 },[activeId]);
 if(!active)return null;
 return <div ref={overlay} className="alarm-overlay" role="alertdialog" aria-modal="true" aria-label="แจ้งเตือนปลุก"><BellRing size={55}/><h1>เพื่อนส่งเสียงปลุก</h1><p className="preserve">{active.message}</p><ActionButton className="secondary" action={async()=>{await acknowledge(active.id,true);setClosed(old=>[...old,active.id]);refresh()}}>หยุดปลุกและรับทราบ</ActionButton>{!unlocked&&<small>แตะหน้าจอเพื่ออนุญาตเสียง</small>}</div>;
}
