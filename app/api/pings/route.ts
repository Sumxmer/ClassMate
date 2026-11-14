import {authenticate,failure,serviceDb,uuid} from '../../../lib/server';
import {dispatch} from '../../../lib/push';
export const runtime='nodejs';
export async function POST(request:Request){
 try{
  const user=await authenticate(request);
  if(!user)return failure('กรุณาเข้าสู่ระบบ',401);
  const data=await request.json().catch(()=>null);
  const message=typeof data?.message==='string'?data.message.trim():'';
  if(!uuid(data?.groupId)||!uuid(data?.recipient)||!message||[...message].length>180||typeof data.alarm!=='boolean')return failure('ข้อมูลแจ้งเตือนไม่ถูกต้อง',400);
  const {data:ping,error}=await serviceDb().rpc('send_ping',{actor:user.id,gid:data.groupId,recipient:data.recipient,body:message,alarm:data.alarm});
  if(error?.message==='rate_limit')return failure('ส่งได้สูงสุด 10 ครั้งต่อนาที',429);
  if(error?.message==='not_group_peer')return failure('ผู้รับต้องเป็นเพื่อนในกลุ่มเดียวกัน',403);
  if(error||!ping)return failure('บันทึกแจ้งเตือนไม่สำเร็จ',500);
  try{await dispatch(ping.id)}catch{console.warn('Immediate push unavailable; queued for cron')}
  return Response.json({id:ping.id},{status:201});
 }catch{return failure('บริการแจ้งเตือนไม่พร้อมใช้งาน',503)}
}
