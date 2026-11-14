import {browserDb,check} from './browser';
export async function acknowledge(id:string,alarm:boolean){
 const result=check(await browserDb().rpc('read_ping',{pid:id,ack:alarm}));
 if(!result)throw Error('ไม่พบข้อความสำหรับบัญชีนี้');
 if(alarm)navigator.serviceWorker?.controller?.postMessage({type:'ACK_ALARM',id});
}
