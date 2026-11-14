'use client';
import {CalendarDays,ListChecks,BellRing,UsersRound,ArrowRight} from 'lucide-react';
import Link from 'next/link';
import {useState} from 'react';
import {browserDb,check} from '../lib/browser';
import {useSession} from './session';
export default function Home(){
 const {session,configured,loading}=useSession();
 const [status,setStatus]=useState(''), [busy,setBusy]=useState(false);
 async function login(){
  setBusy(true);setStatus('');
  try{
   const redirect=location.origin+'/groups';
   // Set up custom SMTP in Supabase before adding email login.
   check(await browserDb().auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect}}));
  }catch(e){setStatus((e as Error).message)}finally{setBusy(false)}
 }
 return <><section className="hero"><div className="hero-copy"><div className="hero-icon"><UsersRound size={27}/></div><h1>เรียนด้วยกัน<br/><em>ง่ายขึ้นทุกวัน</em></h1><p>ดูตารางเพื่อน หาเวลาว่างตรงกัน ตามงานกลุ่ม และส่งแจ้งเตือนถึงเพื่อนในที่เดียว</p><div className="features"><span><CalendarDays/> ตารางเรียน</span><span><ListChecks/> การบ้าน</span><span><BellRing/> แจ้งเตือน</span></div></div><div className="login panel"><h2>{session?'ยินดีต้อนรับ':'เข้าสู่ ClassMate'}</h2>{loading?<p>กำลังโหลดบัญชี…</p>:session?<Link className="button" href="/groups">เปิดกลุ่มของฉัน <ArrowRight size={16}/></Link>:<><button className="secondary full" disabled={busy||!configured} onClick={()=>login()}>เข้าสู่ระบบด้วย Google</button>{!configured&&<p className="muted">ต้องตั้งค่า Supabase ก่อนเปิดเข้าสู่ระบบ</p>}{status&&<p role="status">{status}</p>}</>}</div></section><Link className="install-link" href="/install">วิธีเพิ่ม ClassMate ลงหน้าจอโฮม <ArrowRight size={16}/></Link></>;
}
