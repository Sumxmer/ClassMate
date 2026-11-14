'use client';
import {useParams,useRouter} from 'next/navigation';
import {useEffect,useState} from 'react';
import {CalendarDays,ListChecks,UsersRound,Inbox} from 'lucide-react';
import {Guard} from '../../session';
import {ActionButton,useData} from '../../ui';
import {browserDb,check} from '../../../lib/browser';
import type {Group,Profile} from '../../../lib/model';
import {ScheduleBoard} from './schedule';
import {TaskBoard} from './tasks';
import {Friends,PingInbox} from './pings';
import type {Session} from '@supabase/supabase-js';
const tabs=[['ตาราง',CalendarDays],['การบ้าน',ListChecks],['เพื่อน',UsersRound],['กล่องแจ้งเตือน',Inbox]] as const;
export default function GroupPage(){const {id}=useParams<{id:string}>();return <Guard>{session=><Workspace gid={id} session={session}/>}</Guard>}
function Workspace({gid,session}:{gid:string;session:Session}){
 const uid=session.user.id,router=useRouter(),[tab,setTab]=useState(0);
 useEffect(()=>{
 const view=new URLSearchParams(location.search).get('tab');
 setTab(view==='inbox'?3:view==='tasks'?1:0);
 },[gid]);
 const {data,error,loading,refresh}=useData(gid+uid,['groups','group_members','profiles'],async()=>{
  const db=browserDb();
  const group=check(await db.from('groups').select('*').eq('id',gid).maybeSingle<Group>());
  if(!group) return null;
  const members=check(await db.from('group_members').select('user_id,role').eq('group_id',gid));
  const people=check(await db.from('profiles').select('id,display_name,color').in('id',members.map(m=>m.user_id)).returns<Profile[]>());
  return {group,people};
 });
 if(loading)return <p role="status">กำลังโหลดกลุ่ม…</p>;
 if(error)return <p role="alert" className="error">{error}</p>;
 if(!data)return <p className="empty">ไม่พบกลุ่มหรือคุณไม่มีสิทธิ์เข้าใช้</p>;
 const {group,people}=data;
 return <><div className="heading group-heading"><div><h1>{group.name}</h1><p>{people.length} คนในกลุ่ม</p></div><ActionButton action={()=>navigator.clipboard.writeText(group.invite_code)}>คัดลอกโค้ด {group.invite_code}</ActionButton></div><nav className="tabs" aria-label="พื้นที่กลุ่ม">{tabs.map(([name,Icon],i)=><button key={name} aria-pressed={i===tab} onClick={()=>setTab(i)}><Icon size={19}/>{name}</button>)}</nav>
 {tab===0&&<ScheduleBoard gid={gid} uid={uid} people={people}/>}
 {tab===1&&<TaskBoard group={group} uid={uid} people={people}/>}
 {tab===2&&<><Friends group={group} session={session} people={people} refresh={refresh}/>{group.owner_id===uid&&<ActionButton className="danger" action={async()=>{if(confirm('ลบกลุ่มและข้อมูลทั้งหมดในกลุ่มหรือไม่?')){check(await browserDb().from('groups').delete().eq('id',gid));router.push('/groups')}}}>ลบกลุ่ม</ActionButton>}</>}
 {tab===3&&<PingInbox gid={gid} people={people} session={session}/>}</>;
}
