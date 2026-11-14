'use client';
import Link from 'next/link';
import {Smartphone,BellRing} from 'lucide-react';
import {useSession} from '../session';
import {PushControls} from './push-controls';
export default function Install(){
 const {session,loading}=useSession();
 return <div className="stack"><div className="heading"><h1>เพิ่มลงหน้าจอโฮม</h1><p>เปิด ClassMate จากไอคอนบนมือถือและรับแจ้งเตือนจากเพื่อน</p></div><div className="two"><section className="panel"><h2><Smartphone/> iPhone · Safari</h2><ol><li>เปิด ClassMate ใน Safari</li><li>แตะปุ่มแชร์ แล้วเลือก “เพิ่มไปยังหน้าจอโฮม”</li><li>เปิดจากไอคอนและเข้าสู่ระบบ จากนั้นกด “เปิดการแจ้งเตือน” (iOS 16.4 ขึ้นไป)</li></ol></section><section className="panel"><h2><Smartphone/> Android · Chrome</h2><ol><li>เปิด ClassMate ใน Chrome</li><li>แตะเมนู ⋮ และเลือก “ติดตั้งแอป” หรือ “เพิ่มลงในหน้าจอหลัก”</li><li>เปิดจากไอคอนและเข้าสู่ระบบ จากนั้นกด “เปิดการแจ้งเตือน”</li></ol></section></div><section className="panel"><h2><BellRing/> การแจ้งเตือน</h2>{loading?<p>กำลังโหลด…</p>:session?<PushControls uid={session.user.id} token={session.access_token}/>:<Link href="/">เข้าสู่ระบบเพื่อเปิดการแจ้งเตือน</Link>}</section></div>;
}
