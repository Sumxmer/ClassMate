'use client';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Guard} from '../session';
import {ActionButton,ActionForm,useData} from '../ui';
import {browserDb,check} from '../../lib/browser';
import {PushControls} from '../install/push-controls';
const options=[['remind_task_1d','เตือนงานก่อนครบกำหนด 1 วัน'],['remind_task_1h','เตือนงานก่อนครบกำหนด 1 ชั่วโมง'],['remind_class_30m','เตือนก่อนเข้าเรียน 30 นาที'],['show_completions','แสดงรายชื่อเพื่อนที่ทำงานเสร็จแล้ว']] as const;
export default function Settings(){return <Guard>{session=><Preferences uid={session.user.id} token={session.access_token}/>}</Guard>}
function Preferences({uid,token}:{uid:string;token:string}){
 const router=useRouter();
 const {data,error,loading,refresh}=useData(uid,[],async()=>{
  const db=browserDb();
  const [profile,settings]=await Promise.all([db.from('profiles').select('display_name,color').eq('id',uid).single(),db.from('notification_settings').select('*').eq('user_id',uid).maybeSingle()]);
  return {profile:check(profile),settings:check(settings)};
 });
 return <div className="stack"><div className="heading"><h1>ตั้งค่า</h1><p>จัดการโปรไฟล์และการแจ้งเตือนบนอุปกรณ์นี้</p></div>{loading&&<p role="status">กำลังโหลด…</p>}{error&&<p role="alert">{error}</p>}
 {data&&<><section className="panel"><h2>โปรไฟล์</h2><ActionForm reset={false} action={async f=>{check(await browserDb().from('profiles').update({display_name:String(f.get('name')).trim(),color:f.get('color')}).eq('id',uid));refresh()}}><label>ชื่อเล่น<input name="name" maxLength={50} required defaultValue={data.profile.display_name}/></label><label>สีของฉัน<input type="color" name="color" defaultValue={data.profile.color}/></label><button>บันทึกโปรไฟล์</button></ActionForm></section>
 <section className="panel"><h2>การเตือนและการแสดงผล</h2><ActionForm reset={false} action={async f=>{const values=Object.fromEntries(options.map(([key])=>[key,f.has(key)]));const db=browserDb();check(await (data.settings?db.from('notification_settings').update(values).eq('user_id',uid):db.from('notification_settings').insert(values)));refresh()}}>{options.map(([key,text])=><label className="checkline" key={key}><input type="checkbox" name={key} defaultChecked={data.settings?.[key]??true}/>{text}</label>)}<button>บันทึกการตั้งค่า</button></ActionForm></section></>}
 <section className="panel"><h2>การแจ้งเตือนบนอุปกรณ์นี้</h2><PushControls uid={uid} token={token}/><p><Link href="/install">วิธีเพิ่มลงหน้าจอโฮม</Link></p></section>
 <ActionButton action={async()=>{const reg=await navigator.serviceWorker?.getRegistration();const sub=await reg?.pushManager?.getSubscription();if(sub){check(await browserDb().from('push_subscriptions').delete().eq('endpoint',sub.endpoint));await sub.unsubscribe()}check(await browserDb().auth.signOut());router.push('/')}}>ออกจากระบบ</ActionButton></div>;
}
