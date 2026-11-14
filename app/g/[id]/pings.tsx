'use client';
import {useState} from 'react';
import {BellRing,Send} from 'lucide-react';
import type {Session} from '@supabase/supabase-js';
import {api} from '../../../lib/api-client';
import {browserDb,check} from '../../../lib/browser';
import {fmtDate,type Group,type Ping,type Profile} from '../../../lib/model';
import {ActionButton,ActionForm,useData} from '../../ui';
import {acknowledge} from '../../../lib/alarm';
export function Friends({group,people,session,refresh}:{group:Group;people:Profile[];session:Session;refresh:()=>void}){
 const uid=session.user.id,[selected,setSelected]=useState<Profile|null>(null),[message,setMessage]=useState(''),[sent,setSent]=useState('');
 return <section className="stack"><h2>เพื่อนในกลุ่ม</h2>{sent&&<p role="status">{sent}</p>}{people.map(p=><div className="panel member" key={p.id}><span className="avatar" style={{background:p.color}} aria-hidden="true">{Array.from(p.display_name)[0]}</span><strong>{p.display_name}{p.id===uid?' (ฉัน)':''}</strong>{p.id===group.owner_id&&<small className="muted">เจ้าของกลุ่ม</small>}{p.id!==uid&&<div className="member-actions"><button className="secondary" onClick={()=>{setSelected(p);setMessage('');setSent('')}}><BellRing size={17}/> ส่งแจ้งเตือน</button>{uid===group.owner_id&&<ActionButton className="danger" action={async()=>{if(confirm('นำ '+p.display_name+' ออกจากกลุ่มหรือไม่?')){check(await browserDb().from('group_members').delete().eq('group_id',group.id).eq('user_id',p.id));if(selected?.id===p.id)setSelected(null);refresh()}}}>นำออก</ActionButton>}</div>}</div>)}
 {selected&&<section className="panel" aria-label="เขียนข้อความ"><h2>ส่งถึง {selected.display_name}</h2><div className="chips">{['ตื่นได้แล้ว!','ส่งงานหรือยัง?'].map(text=><button key={text} className="secondary" onClick={()=>setMessage(text)}>{text}</button>)}</div><ActionForm action={async f=>{await api('/api/pings',session.access_token,{groupId:group.id,recipient:selected.id,message,alarm:f.has('alarm')});setSent('บันทึกแจ้งเตือนถึง '+selected.display_name+' แล้ว');setSelected(null);setMessage('')}}><label>ข้อความ<textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={180} required rows={3}/></label><label className="checkline"><input name="alarm" type="checkbox"/> ส่งแบบปลุก</label><div className="chips"><button><Send size={17}/> ส่ง</button><button type="button" className="secondary" onClick={()=>setSelected(null)}>ยกเลิก</button></div></ActionForm></section>}</section>;
}
export function PingInbox({gid,people,session}:{gid:string;people:Profile[];session:Session}){
 const uid=session.user.id;
 const {data,error,loading,refresh}=useData(gid+uid,['pings'],async()=>check(await browserDb().from('pings').select('*').eq('group_id',gid).order('created_at',{ascending:false}).limit(100).returns<Ping[]>()));
 const [sent,setSent]=useState(false);
 const messages=data?.filter(p=>sent?p.from_user===uid:p.to_user===uid)??[];
 return <div className="stack"><div className="section-head"><h2>กล่องแจ้งเตือน</h2><div className="chips"><button className="secondary" aria-pressed={!sent} onClick={()=>setSent(false)}>ได้รับ</button><button className="secondary" aria-pressed={sent} onClick={()=>setSent(true)}>ส่งแล้ว</button></div></div>{loading&&<p role="status">กำลังโหลดข้อความ…</p>}{error&&<p role="alert">{error}</p>}{data&&!messages.length&&<p className="empty">ยังไม่มีข้อความ</p>}
 {messages.map(p=><article className="panel task" key={p.id}><div className="section-head"><strong>{p.is_alarm&&'ปลุก · '}{sent?'ถึง ':'จาก '}{people.find(x=>x.id===(sent?p.to_user:p.from_user))?.display_name??'อดีตสมาชิก'}</strong><small>{p.read_at?'อ่านแล้ว':'ยังไม่ได้อ่าน'}</small></div><p className="preserve">{p.message}</p><small className="muted">{fmtDate(p.created_at)}{p.acknowledged_at&&' · รับทราบแล้ว'}</small>{!sent&&(!p.read_at||(p.is_alarm&&!p.acknowledged_at))&&<ActionButton action={async()=>{await acknowledge(p.id,p.is_alarm);refresh()}}>{p.is_alarm?'รับทราบและหยุดปลุก':'ทำเครื่องหมายว่าอ่านแล้ว'}</ActionButton>}</article>)}</div>;
}
