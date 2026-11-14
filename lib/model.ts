export type Profile={id:string;display_name:string;color:string};
export type Group={id:string;name:string;owner_id:string;invite_code:string};
export type Schedule={id:string;owner_id:string;name:string;group_id:string};
export type Lesson={id:string;schedule_id:string;subject:string;day_of_week:number;start_time:string;end_time:string;room:string;color:string};
export type Task={id:string;group_id:string;title:string;subject:string;description:string;due_at:string;created_by:string|null};
export type Completion={task_id:string;user_id:string};
export type Ping={id:string;group_id:string;from_user:string|null;to_user:string;message:string;is_alarm:boolean;repeat_count:number;acknowledged_at:string|null;read_at:string|null;created_at:string};
export const days=['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์','อาทิตย์'];
export const fmtDate=(value:string)=>new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(value));
export const bangkokInput=(iso:string)=>new Date(new Date(iso).getTime()+7*3600000).toISOString().slice(0,16);
export const utcDue=(local:string)=>new Date(local+'+07:00').toISOString();
export const clock=(time:string)=>time.slice(0,5);
export const minutes=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3,5));
export function freeWindows(lessons:Pick<Lesson,'start_time'|'end_time'>[],open=480,close=1200){
 let cursor=open;
 const free:Array<[number,number]>=[];
 for(const lesson of [...lessons].sort((a,b)=>minutes(a.start_time)-minutes(b.start_time))){
  const start=Math.min(close,minutes(lesson.start_time)),end=Math.min(close,minutes(lesson.end_time));
  if(start-cursor>=30) free.push([cursor,start]);
  cursor=Math.max(cursor,end);
 }
 if(close-cursor>=30) free.push([cursor,close]);
 return free;
}
export const timeLabel=(n:number)=>[Math.floor(n/60),n%60].map(x=>String(x).padStart(2,'0')).join(':');
