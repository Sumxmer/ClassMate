'use client';
import {useState,useEffect,useEffectEvent,useId,type ReactNode} from 'react';
import {browserDb} from '../lib/browser';
export function useData<T>(key:string,tables:string[],read:()=>Promise<T>){
 const [revision,revise]=useState(0);
 const [state,set]=useState<{key:string; data:T|null;error:string;loading:boolean}>({key,data:null,error:'',loading:true});
 const readCurrent=useEffectEvent(read);
 const id=useId();
 const tableKey=tables.join(',');
 useEffect(()=>{
  let active=true;
  readCurrent().then(data=>{if(active)set({key,data,error:'',loading:false})},e=>{if(active)set({key,data:null,error:e.message,loading:false})});
  return ()=>{active=false};
 },[key,revision]);
 useEffect(()=>{
  const db=browserDb();
  const channel=db.channel('data-'+id+'-'+key);
  let timer:ReturnType<typeof setTimeout>;
  function refresh(){clearTimeout(timer);timer=setTimeout(()=>revise(n=>n+1),120)}
  for(const table of tableKey.split(',')) if(table) channel.on('postgres_changes',{event:'*',schema:'public',table},refresh);
  if(tableKey) channel.subscribe(state=>{if(state==='SUBSCRIBED')refresh()});
  window.addEventListener('focus',refresh);
  const reconcile=tableKey?setInterval(()=>{if(!document.hidden)refresh()},30000):undefined;
  return ()=>{clearInterval(reconcile);clearTimeout(timer);window.removeEventListener('focus',refresh);void db.removeChannel(channel)};
 },[key,id,tableKey]);
 return {...(state.key===key?state:{data:null,error:'',loading:true}),refresh:()=>revise(n=>n+1)};
}
export function ActionForm({action,children,reset=true,className}:{action:(f:FormData)=>Promise<void>;children:ReactNode;reset?:boolean;className?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <form className={className} onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;setBusy(true);setError('');try{await action(new FormData(form));if(reset)form.reset()}catch(err){setError((err as Error).message)}finally{setBusy(false)}}}><fieldset disabled={busy}>{children}</fieldset>{busy&&<small role="status">กำลังบันทึก…</small>}{error&&<p className="error" role="alert">{error}</p>}</form>;
}
export function ActionButton({action,children,className='secondary'}:{action:()=>Promise<void>;children:ReactNode;className?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <><button type="button" disabled={busy} className={className} onClick={async()=>{setBusy(true);setError('');try{await action()}catch(err){setError((err as Error).message)}finally{setBusy(false)}}}>{busy?'กำลังดำเนินการ…':children}</button>{error&&<small className="error" role="alert">{error}</small>}</>;
}
