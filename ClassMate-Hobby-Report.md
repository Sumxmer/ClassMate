# รายงานผลปรับ ClassMate สำหรับ Vercel Hobby

วันที่ 14 พฤศจิกายน 2569

ปรับซอร์สให้ใช้ Vercel Hobby, Supabase Free และ Web Push ผ่าน VAPID โดยให้ Supabase เรียกงานแจ้งเตือนทุกนาที เทสต์อัตโนมัติผ่าน 7 รายการ ส่วน production build, commit และ Preview ยังไม่สำเร็จในเครื่องนี้

## ไฟล์ที่แก้

| ไฟล์ | รายละเอียด |
| --- | --- |
| `vercel.json` | ลบส่วน `crons` |
| `app/page.tsx` | เหลือปุ่มเข้าสู่ระบบด้วย Google พร้อมคอมเมนต์ให้ตั้ง Custom SMTP ก่อนเปิดระบบอีเมลในอนาคต |
| `app/api/cron/route.ts`, `lib/cron-auth.ts` | ตรวจ Bearer token และตอบ 401 เมื่อค่าไม่ตรงหรือไม่ได้ตั้ง secret ตั้งกรอบประมวลผล 8 วินาทีและ Vercel `maxDuration` 10 วินาที |
| `lib/push.ts`, `supabase/migrations/202611140004_bound_cron_batch.sql` | จำกัดการรับงานสูงสุด 8 งานต่อรอบ ใช้คีย์ป้องกันงานซ้ำและล็อกแถวขณะรับงาน |
| `supabase/cron.sql` | เปิด `pg_cron` และ `pg_net` ตั้ง GET ทุกนาที อ่าน Bearer secret จาก Supabase Vault และใช้ placeholder ในซอร์ส |
| `README.md` | เพิ่มวิธีตั้งค่า Vercel Hobby, Supabase Cron และทางสำรอง cron-job.org |
| `.gitignore`, `tests/cron.test.mjs` | กัน ZIP รุ่นก่อนออกจาก Git และทดสอบ Bearer token กับการตั้งค่า Cron |

## ผลตรวจ

| คำสั่ง | ผล |
| --- | --- |
| `npm install` | ไม่ผ่าน เครื่อง resolve `registry.npmjs.org` ไม่ได้ (ENOTFOUND) |
| `npm test` | ผ่าน 7/7 |
| `npm run check` | ไม่ผ่าน เพราะยังไม่มี dependencies และ type declarations |
| `npm run build` | ไม่ผ่าน เพราะยังไม่มีคำสั่ง Next.js |
| `tsc --noEmit --noCheck --incremental false` | ผ่านการตรวจ syntax |

ตรวจจากซอร์สแล้วว่า `.env.example` มีตัวแปรครบ 7 ตัว ค่าลับเว้นว่างและไม่มีคำนำหน้า `NEXT_PUBLIC_` สำหรับตัวแปรฝั่งเซิร์ฟเวอร์ `.env.local` ถูก Git ignore การสแกนซอร์สไม่พบรูปแบบคีย์ลับ และ migrations เปิด RLS ครบ 13 ตารางของแอป

เริ่ม Git repo ในเครื่องแล้ว แต่ระบบปฏิเสธการเขียน `.git/index.lock` จึงยังไม่มี commit เครื่องนี้ไม่มี Vercel CLI จึงยังไม่ได้ deploy ทั้ง Preview และ Production

## สิ่งที่ยังต้องยืนยัน

- ทดสอบ migrations, RLS และ Cron บน Supabase Free จริง รวมถึง HTTP 401 เมื่อไม่มี Bearer token และ HTTP 200 เมื่อ token ถูกต้อง
- วัดเวลาตอบกลับบน Vercel และทดสอบ Push ขณะปิดแอป หากผู้ให้บริการ Push รับข้อความแล้วแต่คิวบันทึกผลไม่ทัน การ retry อาจทำให้รับข้อความซ้ำ

## เช็กลิสต์ก่อนใช้งาน

- [ ] รัน `npm install`, `npm test`, `npm run check` และ `npm run build` บนเครื่องที่เข้าถึง npm registry ได้ จากนั้นทำ commit
- [ ] ใส่ env ทั้ง 7 ตัวใน Vercel → Project → Settings → Environment Variables สำหรับ Preview
- [ ] ตั้ง Site URL และ Redirect URLs ใน Supabase Auth → URL Configuration ให้ตรงกับโดเมนที่จะใช้ และเพิ่ม URL ที่ลงท้ายด้วย `/groups`
- [ ] ตั้ง Google OAuth ใน Google Cloud แล้วกรอก Client ID และ Client Secret ใน Supabase
- [ ] รัน migrations ถึง `004` แล้วคัดลอก `supabase/cron.sql` ไป SQL Editor แทน `YOUR_DOMAIN` และ `YOUR_CRON_SECRET` ก่อนรัน เก็บไฟล์ต้นฉบับเป็น placeholder
- [ ] ทดสอบ Push ผ่าน HTTPS บนมือถือด้วยสองบัญชี ทั้งตอนปิดแอปและหลังผู้รับกดรับทราบการปลุก

