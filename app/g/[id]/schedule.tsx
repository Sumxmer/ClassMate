'use client';
import {useState} from 'react';
import type {CSSProperties} from 'react';
import {CalendarPlus,Clock3} from 'lucide-react';
import {browserDb,check} from '../../../lib/browser';
import {days,clock,minutes,timeLabel,freeWindows,type Profile,type Schedule,type Lesson} from '../../../lib/model';
import {ActionButton,ActionForm,useData} from '../../ui';
export function ScheduleBoard({gid,uid,people}:{gid:string;uid:string;people:Profile[]}){
 const [hidden,setHidden]=useState<string[]>([]),[showFree,setFree]=useState(false);
 const {data,error,loading,refresh}=useData(gid+uid,['schedules','classes'],async()=>{
  const db=browserDb(),schedules=check(await db.from('schedules').select('*').eq('group_id',gid).order('created_at').returns<Schedule[]>());
  const lessons=schedules.length?check(await db.from('classes').select('*').in('schedule_id',schedules.map(s=>s.id)).order('start_time').returns<Lesson[]>()):[];
  return {schedules,lessons};
 });
 const selected=people.filter(p=>!hidden.includes(p.id));
 const owners=new Map(data?.schedules.map(s=>[s.id,s.owner_id]));
 const own=data?.schedules.filter(s=>s.owner_id===uid)??[];
 const visible=data?.lessons.filter(l=>selected.some(p=>p.id===owners.get(l.schedule_id)))??[];
 return <div className="stack"><section className="panel"><div className="section-head"><h2>ตารางรายสัปดาห์</h2><button className="secondary" onClick={()=>setFree(!showFree)} aria-pressed={showFree} disabled={!selected.length}><Clock3 size={17}/> หาเวลาว่างตรงกัน</button></div><div className="chips">{people.map(p=><label key={p.id} className="chip"><input type="checkbox" checked={!hidden.includes(p.id)} onChange={()=>setHidden(old=>old.includes(p.id)?old.filter(id=>id!==p.id):[...old,p.id])}/><i style={{background:p.color}}/>{p.display_name}{p.id===uid?' (ฉัน)':''}</label>)}</div>
 {loading&&<p role="status">กำลังโหลดตาราง…</p>}{error&&<p role="alert">{error}</p>}{data&&!visible.length&&<p className="muted">ยังไม่มีคาบจากคนที่เลือก</p>}
 <div className="week-scroll"><div className="week">{days.map((day,index)=>{
 const today=visible.filter(l=>l.day_of_week===index);
 const hourStart=Math.min(480,...visible.map(l=>Math.floor(minutes(l.start_time)/60)*60));
 const hourEnd=Math.max(1200,...visible.map(l=>Math.ceil(minutes(l.end_time)/60)*60));
 const offset=(value:number)=>((value-hourStart)/(hourEnd-hourStart))*100+'%';
 return <section key={day}><h3>{day}</h3><div className="timeline">{showFree&&selected.length>0&&freeWindows(today).map(([start,end])=><div key={start} className="free" style={{top:offset(start),height:offset(hourStart+end-start)}} title={'ว่าง '+timeLabel(start)+'–'+timeLabel(end)}>{timeLabel(start)}–{timeLabel(end)}</div>)}
 <div className="lanes" style={{'--lanes':Math.max(1,selected.length)} as CSSProperties}>{selected.map(p=><div key={p.id} className="lane">{today.filter(l=>owners.get(l.schedule_id)===p.id).map(l=><div className="lesson" key={l.id} style={{borderColor:p.color,backgroundColor:l.color+'40',top:offset(minutes(l.start_time)),height:offset(hourStart+minutes(l.end_time)-minutes(l.start_time))}} title={p.display_name+' · '+l.subject+' · '+clock(l.start_time)+'–'+clock(l.end_time)+' '+l.room}><strong>{l.subject}</strong><small>{clock(l.start_time)}–{clock(l.end_time)} {l.room}</small></div>)}</div>)}</div></div></section>})}</div></div>{showFree&&<small>ช่วงว่างอย่างน้อย 30 นาที ระหว่าง 08:00–20:00 เวลาไทย</small>}</section>
 <section className="panel"><h2><CalendarPlus/> ตารางของฉัน</h2><ActionForm className="inline" action={async f=>{check(await browserDb().from('schedules').insert({group_id:gid,name:String(f.get('name')).trim()}));refresh()}}><label>ชื่อตารางใหม่<input name="name" placeholder="เช่น เทอม 1" required maxLength={80}/></label><button>เพิ่มตาราง</button></ActionForm>{data&&!own.length&&<p className="muted">สร้างตารางก่อนเพิ่มคาบเรียน</p>}
 {own.map(s=><details key={s.id} className="record"><summary>{s.name}</summary><ActionForm className="inline" reset={false} action={async f=>{check(await browserDb().from('schedules').update({name:f.get('name')}).eq('id',s.id));refresh()}}><label>ชื่อตาราง<input name="name" required maxLength={80} defaultValue={s.name}/></label><button>เปลี่ยนชื่อ</button></ActionForm>
 <h3>เพิ่มคาบ</h3><LessonForm schedule={s.id} refresh={refresh}/>{data?.lessons.filter(l=>l.schedule_id===s.id).map(l=><details className="record" key={l.id}><summary>{days[l.day_of_week]} · {clock(l.start_time)} · {l.subject}</summary><LessonForm schedule={s.id} lesson={l} refresh={refresh}/><ActionButton action={async()=>{if(confirm('ลบคาบนี้หรือไม่?')){check(await browserDb().from('classes').delete().eq('id',l.id));refresh()}}}>ลบคาบ</ActionButton></details>)}
 <ActionButton className="danger" action={async()=>{if(confirm('ลบตารางและคาบทั้งหมดหรือไม่?')){check(await browserDb().from('schedules').delete().eq('id',s.id));refresh()}}}>ลบตาราง</ActionButton></details>)}</section></div>;
}
function LessonForm({schedule,lesson,refresh}:{schedule:string;lesson?:Lesson;refresh:()=>void}){
 return <ActionForm className="fields" reset={!lesson} action={async f=>{
 const values={subject:String(f.get('subject')).trim(),day_of_week:Number(f.get('day')),start_time:String(f.get('start')),end_time:String(f.get('end')),room:String(f.get('room')),color:String(f.get('color'))};
 if(values.start_time>=values.end_time)throw Error('เวลาจบต้องอยู่หลังเวลาเริ่ม');
 const table=browserDb().from('classes');
 check(await (lesson?table.update(values).eq('id',lesson.id):table.insert({...values,schedule_id:schedule})));refresh();
 }}><label>วิชา<input name="subject" required maxLength={100} defaultValue={lesson?.subject}/></label><label>วัน<select name="day" defaultValue={lesson?.day_of_week??0}>{days.map((d,i)=><option value={i} key={d}>{d}</option>)}</select></label><label>เริ่ม<input name="start" type="time" required defaultValue={lesson?clock(lesson.start_time):undefined}/></label><label>จบ<input name="end" type="time" required defaultValue={lesson?clock(lesson.end_time):undefined}/></label><label>ห้อง<input name="room" maxLength={80} defaultValue={lesson?.room}/></label><label>สีคาบ<input name="color" type="color" defaultValue={lesson?.color??'#6366f1'}/></label><button>{lesson?'บันทึกคาบ':'เพิ่มคาบ'}</button></ActionForm>;
}
