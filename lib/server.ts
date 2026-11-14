import {createClient} from '@supabase/supabase-js';
export function serviceDb(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Missing server configuration');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function failure(error:string,status:number){return Response.json({error},{status})}
export async function authenticate(request:Request){
 const bearer=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!bearer)return null;
 const {data,error}=await serviceDb().auth.getUser(bearer);
 return error?null:data.user;
}
export const uuid=(x:unknown):x is string=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
export function validEndpoint(value:unknown):value is string{
 if(typeof value!=='string'||value.length>2048)return false;
 try{
  const endpoint=new URL(value);
  const hosts=['fcm.googleapis.com','updates.push.services.mozilla.com','push.services.mozilla.com','web.push.apple.com','notify.windows.com'];
  return endpoint.protocol==='https:'&&!endpoint.username&&!endpoint.password&&!endpoint.port&&!endpoint.hash&&hosts.some(host=>endpoint.hostname===host||((host==='web.push.apple.com'||host==='notify.windows.com')&&endpoint.hostname.endsWith('.'+host)));
 }catch{return false}
}
