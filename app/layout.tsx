import type {Metadata, Viewport} from 'next';
import Link from 'next/link';
import {CalendarDays, Settings, Download} from 'lucide-react';
import {SessionProvider} from './session';
import './globals.css';
export const metadata: Metadata = {title:'ClassMate — ตารางเรียนและงานกลุ่ม',description:'จัดตารางเรียน ตามงาน และส่งแจ้งเตือนถึงเพื่อน',manifest:'/manifest.json',appleWebApp:{capable:true,title:'ClassMate'},icons:{apple:'/icon-192.png'}};
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover',themeColor:[{media:'(prefers-color-scheme: light)',color:'#f6f7fc'},{media:'(prefers-color-scheme: dark)',color:'#151728'}]};
export default function Layout({children}:{children:React.ReactNode}) {
 return <html lang="th"><body><SessionProvider><header className="top"><div className="wrap"><Link href="/" className="wordmark"><span><CalendarDays size={20}/></span>ClassMate</Link><nav><Link href="/groups">กลุ่มของฉัน</Link><Link href="/install" aria-label="ติดตั้งแอป"><Download size={19}/></Link><Link href="/settings" aria-label="ตั้งค่า"><Settings size={19}/></Link></nav></div></header><main className="wrap content">{children}</main></SessionProvider></body></html>;
}
