export async function api(path:string,token:string,data:unknown){
 const response=await fetch(path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data)});
 const result=await response.json();
 if(!response.ok)throw Error(result.error??'ดำเนินการไม่สำเร็จ');
 return result;
}
