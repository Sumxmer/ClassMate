import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
let client: SupabaseClient | undefined;
export function browserDb() {
  if (!supabaseUrl || !supabaseKey) throw new Error('โปรดตั้งค่า Supabase ใน .env.local');
  return client ??= createClient(supabaseUrl, supabaseKey);
}
export function check<T>(result: {data:T;error:null}|{data:unknown;error:{message:string}}):T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

