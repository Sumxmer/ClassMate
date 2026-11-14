'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import Link from 'next/link';
import {browserDb,supabaseKey,supabaseUrl} from '../lib/browser';
import {AlarmOverlay} from './alarm';
const Context=createContext<{session:Session|null;loading:boolean;configured:boolean}>({session:null,loading:true,configured:false});
export function useSession(){return useContext(Context)}
export function SessionProvider({children}:{children:React.ReactNode}){
 const configured=Boolean(supabaseUrl&&supabaseKey);
 const [state,set]=useState<{session:Session|null;loading:boolean}>({session:null,loading:configured});
 useEffect(()=>{
  if('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(()=>{});
  if(!configured) return;
  const {data:{subscription}}=browserDb().auth.onAuthStateChange((_event,session)=>set({session,loading:false}));
  return ()=>subscription.unsubscribe();
 },[configured]);
 return <Context.Provider value={{...state,configured}}>{children}{state.session&&<AlarmOverlay session={state.session}/>}</Context.Provider>;
}
export function Guard({children}:{children:(session:Session)=>React.ReactNode}){
 const {session,loading,configured}=useSession();
 if(loading) return <p role="status">กำลังโหลดบัญชี…</p>;
 if(!configured) return <p className="panel" role="status">ยังไม่ได้ตั้งค่า Supabase · ดูวิธีตั้งค่าใน README</p>;
 if(!session) return <div className="panel"><p>เข้าสู่ระบบเพื่อเปิดพื้นที่กลุ่มของคุณ</p><Link className="button" href="/">ไปหน้าเข้าสู่ระบบ</Link></div>;
 return children(session);
}
