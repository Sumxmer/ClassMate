'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {UsersRound,ArrowRight,Plus,KeyRound} from 'lucide-react';
import {Guard} from '../session';
import {browserDb,check} from '../../lib/browser';
import {useData,ActionForm} from '../ui';
export default function Groups(){return <Guard>{session=><GroupList uid={session.user.id}/>}</Guard>}
function GroupList({uid}:{uid:string}){
 const router=useRouter();
 const {data,error,loading}=useData(uid,['groups','group_members'],async()=>check(await browserDb().from('groups').select('id,name,owner_id').order('created_at')));
 return <><div className="heading"><h1>กลุ่มของฉัน</h1><p>เปิดพื้นที่เรียนร่วมกัน หรือเข้ากลุ่มด้วยโค้ดจากเพื่อน</p></div><div className="two"><section className="panel"><h2><Plus/> สร้างกลุ่ม</h2><ActionForm action={async f=>{router.push('/g/'+check(await browserDb().rpc('create_group',{group_name:f.get('name')})))}}><label>ชื่อกลุ่ม<input name="name" required maxLength={80} placeholder="เช่น เพื่อนปี 3"/></label><button>สร้างกลุ่ม</button></ActionForm></section><section className="panel"><h2><KeyRound/> เข้ากลุ่ม</h2><ActionForm action={async f=>{const id=check(await browserDb().rpc('join_group',{code:f.get('code')}));if(!id)throw Error('ไม่พบโค้ดนี้ หรือลองถี่เกินไป');router.push('/g/'+id)}}><label>โค้ดเชิญ 6 ตัวอักษร<input name="code" required pattern="[A-Za-z]{6}" maxLength={6} placeholder="ABCDEF" autoCapitalize="characters"/></label><button>เข้ากลุ่ม</button></ActionForm></section></div><section className="stack"><h2>กลุ่มที่เป็นสมาชิก</h2>{loading&&<p role="status">กำลังโหลดกลุ่ม…</p>}{error&&<p role="alert">{error}</p>}{data?.length===0&&<p className="empty">ยังไม่มีกลุ่ม ลองสร้างกลุ่มหรือใส่โค้ดเชิญด้านบน</p>}{data?.map(g=><Link key={g.id} href={'/g/'+g.id} className="panel group-row"><span className="square"><UsersRound/></span><span><strong>{g.name}</strong><small>{g.owner_id===uid?'เจ้าของกลุ่ม':'สมาชิก'}</small></span><ArrowRight size={18}/></Link>)}</section></>;
}
