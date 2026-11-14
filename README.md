# ClassMate

เว็บภาษาไทยสำหรับจัดตารางเรียน ตามการบ้าน และส่งแจ้งเตือนถึงเพื่อนในกลุ่ม ใช้ Next.js App Router, TypeScript, Tailwind CSS, Supabase และ Web Push

## 1. ตั้งค่า Supabase

1. สร้างโปรเจกต์ที่ [Supabase Dashboard](https://supabase.com/dashboard) เปิด SQL Editor แล้วรันไฟล์ใน `supabase/migrations` ตามลำดับ `001` → `002` → `003` → `004` หรือใช้ `supabase link` และ `supabase db push` จาก Supabase CLI
2. ใน Authentication → URL Configuration ตั้ง Site URL เป็นโดเมน HTTPS ของแอป เพิ่ม Redirect URLs สำหรับ http://localhost:3000/groups และ https://YOUR_DOMAIN/groups ใช้ Google สำหรับสมัครและเข้าสู่ระบบ หากจะเปิดอีเมลในอนาคตให้ตั้ง Custom SMTP ก่อน
3. เปิด Google ใน Authentication → Providers สร้าง OAuth client แบบ Web application ใน Google Cloud ตั้ง Authorized redirect URI ตามที่ Supabase แสดง เช่น `https://PROJECT_REF.supabase.co/auth/v1/callback` แล้วกรอก Client ID และ Client Secret ใน Supabase หาก OAuth consent screen อยู่ใน Testing ให้เพิ่มบัญชีเพื่อนใน Test users

เอกสาร [Supabase Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google) · [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

## 2. รันในเครื่อง

ใช้ Node.js 22.16 ขึ้นไป คำสั่งต่อไปนี้ใช้ PowerShell

```powershell
npm install
Copy-Item .env.example .env.local
npm run vapid
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) หลังกรอกค่าด้านล่างใน `.env.local` แล้ว หากแก้ค่าให้เริ่ม dev server ใหม่

| ตัวแปร | ค่า |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key หรือ legacy anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key ฝั่งเซิร์ฟเวอร์ |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public Key จาก `npm run vapid` |
| `VAPID_PRIVATE_KEY` | Private Key จากคำสั่งเดียวกัน ใช้ฝั่งเซิร์ฟเวอร์ |
| `VAPID_SUBJECT` | อีเมลผู้ดูแลในรูปแบบ `mailto:you@example.com` |
| `CRON_SECRET` | ค่าสุ่มจากคำสั่ง `node` ด้านบน ใช้ฝั่งเซิร์ฟเวอร์ |

เก็บไฟล์ `.env.local` ไว้ในเครื่องและตั้งค่าจริงใน Vercel Environment Variables หากเปลี่ยน VAPID keys ให้ผู้ใช้เปิดลงทะเบียนแจ้งเตือนใหม่

## 3. Deploy บน Vercel Hobby และตั้ง Cron ฟรี

1. Import Git repository ใน Vercel Hobby เลือก Next.js และ Node.js 22.x ใส่ env จากตารางใน Project → Settings → Environment Variables ให้ตรงกับ Preview
2. เพิ่ม URL ของแอปใน Supabase Auth ตามขั้นตอนแรก สำหรับ Preview เพิ่ม URL แบบเจาะจงที่ลงท้ายด้วย /groups โดเมนที่ใช้กับ Cron ต้องให้ Supabase เรียก HTTPS ถึง endpoint ได้ หากเปิด Deployment Protection คำขออาจถูก Vercel ปฏิเสธก่อนเข้าแอป
3. คัดลอก supabase/cron.sql ไปวางใน SQL Editor หลังรัน migrations ครบ แทน YOUR_DOMAIN ด้วย hostname อย่างเดียว เช่น classmate.vercel.app และแทน YOUR_CRON_SECRET ด้วยค่าเดียวกับที่ตั้งใน Vercel แล้วรัน SQL ให้คง placeholder ในไฟล์ต้นฉบับ
4. SQL เปิด pg_cron, pg_net และ Vault แล้วตั้ง job classmate-notifications ให้เรียก GET /api/cron ทุกนาที การรันซ้ำอัปเดตงานชื่อเดิม ตรวจประวัติใน Supabase Cron และตรวจ HTTP status ใน net._http_response เพราะ pg_net ส่งคำขอแบบ asynchronous
5. ลองเรียก /api/cron โดยไม่มี Authorization และตรวจว่าได้ 401 จากนั้นลองด้วย header Authorization: Bearer <CRON_SECRET> จากเครื่องของคุณ การตอบ 200 พร้อม claimed และ retry แสดงผลของรอบนั้น ส่วน 504 คือเกินเวลาประมวลผล ให้ตรวจ logs และคิว

### ทางเลือกสำรองด้วย cron-job.org

สร้าง job ฟรีแบบ GET ทุก 1 นาทีไปยัง https://YOUR_DOMAIN/api/cron ใน Advanced เพิ่ม Header ชื่อ Authorization และค่า Bearer <CRON_SECRET> แล้วทดสอบให้ได้ HTTP 200 หากสลับมาใช้ทางนี้ ให้ปิด job classmate-notifications ใน Supabase Cron เพื่อประหยัดโควตา

ระบบคิวใช้ dedupe key และล็อกแถวขณะรับงาน จำกัดสูงสุด 8 งานต่อรอบ งานค้างรอรอบถัดไป หาก Push provider รับข้อความแล้วแต่เซิร์ฟเวอร์ยังบันทึกผลไม่ทัน ผู้รับอาจเห็นข้อความซ้ำจากรอบ retry

[Supabase Cron](https://supabase.com/docs/guides/cron) · [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net) · [cron-job.org FAQ](https://cron-job.org/en/faq/)

## 4. ตรวจการทำงาน

```powershell
npm test
npm run check
npm run build
npm start
```

- เปิด Chrome และหน้าต่าง Incognito หรือใช้มือถืออีกเครื่อง ลงชื่อเข้าใช้คนละบัญชี ตั้งชื่อและสี สร้างกลุ่มจาก A และให้ B เข้าด้วยโค้ด ให้ C ที่อยู่นอกกลุ่มลองเปิด URL กลุ่ม
- สร้างตาราง 2 ตาราง เพิ่มคาบบน A แล้วตรวจว่า B เห็นข้อมูลสดและแก้คาบของ A ไม่ได้ ทดสอบคาบทับกันและการหาเวลาว่าง
- เพิ่มงานให้ B กดเสร็จ ตรวจรายชื่อจาก A และตรวจการแสดงผลเมื่อปิดที่ Settings ใช้งานใกล้ถึงกำหนดเพื่อทดสอบการเตือนอัตโนมัติ
- บนเครื่อง B เปิด `/install` แล้วติดตั้ง PWA และอนุญาตแจ้งเตือน ปิดหน้าต่างเว็บ จาก A ส่งข้อความธรรมดาแล้วแตะการแจ้งเตือน ตรวจว่าเปิดกล่องข้อความ
- ส่งปลุกจาก A ขณะ B ใช้แอป แตะหน้าจอ B หนึ่งครั้งเพื่อเปิดเสียงตามข้อกำหนดเบราว์เซอร์ รอ Cron 1–2 รอบ แล้วกดรับทราบ ตรวจว่าหยุดเสียงและรอบถัดไป ตรวจว่าเห็นสถานะอ่านแล้วจาก A
- เปิดโหมดเครื่องบินหลังโหลดแอปอย่างน้อยครั้งหนึ่ง ลองเปิดหน้าอีกครั้งและตรวจหน้าออฟไลน์

## การตัดสินใจ

- เลือก Next.js 16.4.6 เพราะ 16.6 ยังไม่พบในรายการ npm ที่ตรวจสอบ
- ตารางหนึ่งอยู่ในกลุ่มเดียวและแสดงทุกตารางของเพื่อนที่เลือก ช่วงว่างค้น 08:00–20:00 อย่างน้อย 30 นาที คาบรายสัปดาห์เก็บเป็นเวลาท้องถิ่น Asia/Bangkok โดยจันทร์ = 0 อาทิตย์ = 6 ส่วนกำหนดส่งและเวลาของเหตุการณ์เก็บเป็น `timestamptz`
- สถานะทำงานเสร็จเปิด/ปิดการแสดงผลสำหรับคนที่ตั้งค่า สมาชิกในกลุ่มยังอ่านข้อมูลความคืบหน้าได้ผ่าน RLS
- ปลุกส่งครั้งแรกทันที แล้วซ้ำอีกได้สูงสุด 10 ครั้งเมื่อยังไม่รับทราบ ระบบปฏิบัติการเป็นผู้ตัดสินการสั่น ระยะเวลาแสดง และเสียงเมื่อแอปปิด เสียงปลุกในแอปใช้ Web Audio หลังผู้ใช้โต้ตอบกับหน้า
- คิวมีการจำกัดอัตราต่อผู้ส่งและล็อกงานระหว่าง dispatch งานที่เจอข้อผิดพลาดชั่วคราวลองใหม่ภายในช่วงหมดอายุ ผู้ให้บริการ Push อาจส่งถึงช้าหรือส่งซ้ำระหว่างการ retry
- หน้าออฟไลน์เป็น shell ที่ไม่แคชตาราง งาน หรือข้อมูลบัญชี เบราว์เซอร์รองรับ Web Push ตามเงื่อนไขของผู้ให้บริการ และ iPhone ใช้แอปบนหน้าจอโฮมตั้งแต่ iOS 16.4

