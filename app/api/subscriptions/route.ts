import {authenticate,failure,serviceDb,validEndpoint} from '../../../lib/server';
export async function POST(request:Request){
 try{
  const user=await authenticate(request);
  if(!user)return failure('กรุณาเข้าสู่ระบบ',401);
  const input=await request.json().catch(()=>null);
  const sub=input?.subscription;
  const key=(v:unknown,length:number):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]+$/.test(v)&&Buffer.from(v,'base64url').length===length;
  if(!validEndpoint(sub?.endpoint)||!key(sub?.keys?.p256dh,65)||!key(sub?.keys?.auth,16))return failure('ข้อมูลอุปกรณ์ไม่ถูกต้องหรือผู้ให้บริการ Push ยังไม่รองรับ',400);
  const {data,error}=await serviceDb().rpc('register_push',{actor:user.id,sub_endpoint:sub.endpoint,sub_p256dh:sub.keys.p256dh,sub_auth:sub.keys.auth,agent:request.headers.get('user-agent')?.slice(0,500)??null});
  if(error)return failure('ลงทะเบียนอุปกรณ์ไม่สำเร็จ',500);
  if(!data)return failure('อุปกรณ์นี้ผูกกับอีกบัญชี โปรดออกจากระบบในบัญชีเดิมก่อน',409);
  return Response.json({ok:true});
 }catch{return failure('บริการลงทะเบียนไม่พร้อมใช้งาน',503)}
}
