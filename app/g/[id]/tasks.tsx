'use client';
import {useEffect,useState} from 'react';
import {ListPlus,Check} from 'lucide-react';
import {browserDb,check} from '../../../lib/browser';
import {bangkokInput,fmtDate,utcDue,type Group,type Profile,type Task,type Completion} from '../../../lib/model';
import {ActionButton,ActionForm,useData} from '../../ui';
export function TaskBoard({group,uid,people}:{group:Group;uid:string;people:Profile[]}){
 const {data,error,loading,refresh}=useData(group.id+uid,['tasks','task_completions'],async()=>{
 const db=browserDb(),tasks=check(await db.from('tasks').select('*').eq('group_id',group.id).order('due_at').returns<Task[]>());
 const completions=tasks.length?check(await db.from('task_completions').select('task_id,user_id').in('task_id',tasks.map(t=>t.id)).returns<Completion[]>()):[];
 const prefs=check(await db.from('notification_settings').select('show_completions').eq('user_id',uid).maybeSingle());
 return {tasks,completions,show:prefs?.show_completions??true};
 });
 const [now,setNow]=useState(0);
 useEffect(()=>{const tick=()=>setNow(Date.now());tick();const timer=setInterval(tick,30000);return()=>clearInterval(timer)},[]);
 return <div className="stack"><section className="panel"><h2><ListPlus/> เพิ่มการบ้านหรืองาน</h2><TaskForm gid={group.id} refresh={refresh}/></section>
 <section className="stack"><h2>งานของกลุ่ม</h2>{loading&&<p role="status">กำลังโหลดงาน…</p>}{error&&<p role="alert">{error}</p>}{data?.tasks.length===0&&<p className="empty">ยังไม่มีงานในกลุ่ม</p>}{data?.tasks.map(task=>{
 const done=data.completions.filter(c=>c.task_id===task.id);
 const mine=done.some(c=>c.user_id===uid);
 const remaining=new Date(task.due_at).getTime()-now;
 const due=remaining<0?'เลยกำหนด':remaining<86400000?'ใกล้ถึงกำหนด':'กำหนดส่ง';
 return <article className="panel task" key={task.id}><div className="section-head"><h3>{task.title}</h3><span className={remaining<0?'overdue':remaining<86400000?'soon':'muted'}>{due}</span></div><p className="muted">{task.subject&&task.subject+' · '}{fmtDate(task.due_at)} · เพิ่มโดย {people.find(p=>p.id===task.created_by)?.display_name??'อดีตสมาชิก'}</p>{task.description&&<p className="preserve">{task.description}</p>}<ActionButton className={mine?'secondary':'button'} action={async()=>{const table=browserDb().from('task_completions');if(mine)check(await table.delete().eq('task_id',task.id).eq('user_id',uid));else check(await table.insert({task_id:task.id}));refresh()}}>{mine?<><Check size={16}/> เสร็จแล้ว · ยกเลิก</>:'ทำเสร็จแล้ว'}</ActionButton>
 {data.show&&<p className="muted">เสร็จแล้ว {done.length} คน{done.length>0&&' · '+done.map(c=>people.find(p=>p.id===c.user_id)?.display_name??'อดีตสมาชิก').join(', ')}</p>}
 {(task.created_by===uid||group.owner_id===uid)&&<details className="record"><summary>แก้ไขงาน</summary><TaskForm gid={group.id} task={task} refresh={refresh}/><ActionButton className="danger" action={async()=>{if(confirm('ลบงานนี้หรือไม่?')){check(await browserDb().from('tasks').delete().eq('id',task.id));refresh()}}}>ลบงาน</ActionButton></details>}</article>;
 })}</section></div>;
}
function TaskForm({gid,task,refresh}:{gid:string;task?:Task;refresh:()=>void}){
 return <ActionForm className="fields" reset={!task} action={async f=>{
 const values={title:String(f.get('title')).trim(),subject:String(f.get('subject')),description:String(f.get('description')),due_at:utcDue(String(f.get('due')))};
 const table=browserDb().from('tasks');
 check(await (task?table.update(values).eq('id',task.id):table.insert({...values,group_id:gid})));refresh();
 }}><label>ชื่องาน<input name="title" required maxLength={120} defaultValue={task?.title}/></label><label>วิชา<input name="subject" maxLength={100} defaultValue={task?.subject}/></label><label>กำหนดส่ง (เวลาไทย)<input name="due" type="datetime-local" required defaultValue={task?bangkokInput(task.due_at):undefined}/></label><label className="wide">รายละเอียด<textarea name="description" rows={2} maxLength={2000} defaultValue={task?.description}/></label><button>{task?'บันทึกงาน':'เพิ่มงาน'}</button></ActionForm>;
}
