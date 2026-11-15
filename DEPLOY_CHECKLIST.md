# เช็กลิสต์ Deploy ClassMate

ใช้ GitHub `Sumxmer/ClassMate` สาขา `main`, Vercel และโปรเจกต์ Supabase ชื่อ **ClassMate** เท่านั้น เริ่ม deploy เมื่อ build สำเร็จและแก้ประเด็นระดับสูงจากการตรวจสิทธิ์และค่าลับครบแล้ว

## 1. เตรียม Supabase และรัน migrations

- [ ] เปิด Supabase Dashboard สร้างหรือเลือกโปรเจกต์ **ClassMate** แล้วจด Project URL และ project ref จาก **Connect** หรือหน้าตั้งค่าของโปรเจกต์
- [ ] เปิด **SQL Editor** ของ ClassMate แล้วรันทีละไฟล์ตามลำดับ ตรวจว่าแต่ละไฟล์สำเร็จก่อนรันไฟล์ถัดไป

  1. `supabase/migrations/202611140001_schema.sql`
  2. `supabase/migrations/202611140002_access.sql`
  3. `supabase/migrations/202611140003_notifications.sql`
  4. `supabase/migrations/202611140004_bound_cron_batch.sql`

## 2. Import ClassMate เข้า Vercel และตั้ง env 7 ตัว

- [ ] ใน Vercel เลือก **Add New → Project** แล้ว Import `Sumxmer/ClassMate` ใช้ Framework Preset **Next.js** และ Root Directory ค่าเดิม ตรวจให้ Production Branch เป็น `main` และตั้ง Node.js เป็น `22.x` ใน **Settings → Build and Deployment** [Import Git repository](https://vercel.com/docs/git) · [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [ ] กรอกค่าต่อไปนี้ใน **Environment Variables** ของโปรเจกต์สำหรับ Production หากจะทดสอบ Preview ให้กำหนดค่าของ Preview ด้วย เปิด **Sensitive** สำหรับคีย์ลับฝั่งเซิร์ฟเวอร์เมื่อมีตัวเลือก แล้ว Deploy หรือ Redeploy เพื่อใช้ค่าชุดใหม่ [ตั้งค่า Environment Variables](https://vercel.com/docs/environment-variables/managing-environment-variables) · [Sensitive variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)

| ตัวแปร | ค่ามาจากไหน | การเปิดเผย |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase ClassMate → **Connect** → Project URL | ใช้ในเบราว์เซอร์ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase ClassMate → **Settings → API Keys** → Publishable key หรือ legacy `anon` | ใช้ในเบราว์เซอร์ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase ClassMate → **Settings → API Keys → Legacy API keys** → `service_role` ตามชื่อ env ที่โค้ดใช้ | คีย์ลับฝั่งเซิร์ฟเวอร์ ห้ามเติม `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `publicKey` จากคู่คีย์ VAPID ที่สร้างในเครื่อง | ใช้ในเบราว์เซอร์ |
| `VAPID_PRIVATE_KEY` | `privateKey` จากคู่เดียวกับ `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | คีย์ลับฝั่งเซิร์ฟเวอร์ ห้ามเติม `NEXT_PUBLIC_` |
| `VAPID_SUBJECT` | อีเมลติดต่อผู้ดูแลในรูป `mailto:you@example.com` ซึ่งต้องแทนด้วยอีเมลของคุณ | ตั้งฝั่งเซิร์ฟเวอร์ตามชื่อนี้ |
| `CRON_SECRET` | ค่าสุ่มอย่างน้อย 32 อักขระจากตัวสร้างรหัสผ่านที่เชื่อถือได้ ใช้ค่าเดียวกันใน Vercel และ Supabase Vault | คีย์ลับฝั่งเซิร์ฟเวอร์ ห้ามเติม `NEXT_PUBLIC_` |

เก็บค่าลับใน Vercel, Supabase Vault หรือที่เก็บรหัสผ่านส่วนตัวตามหน้าที่ อย่าใส่ค่าจริงในไฟล์โปรเจกต์ที่แชร์, SQL Editor, log หรือรายงาน หากหน้า API Keys ไม่มี legacy `service_role` ให้ตรวจและทดสอบการใช้ Supabase secret key กับโค้ดเซิร์ฟเวอร์ก่อนใช้จริง [Supabase API Keys](https://supabase.com/docs/guides/getting-started/api-keys)

สร้างคู่ VAPID ครั้งเดียวหลังติดตั้ง dependencies แล้ว วิธีด้านล่างเก็บผลไว้ในหน่วยความจำ หากจะคัดลอก private key ให้ปิด Clipboard history และการซิงก์คลิปบอร์ดก่อน วางค่าทีละตัวลงช่องที่ตรงกันใน Vercel แล้วล้างคลิปบอร์ด [web-push](https://github.com/web-push-libs/web-push)

```powershell
$classmateVapid = node -e "process.stdout.write(JSON.stringify(require('web-push').generateVAPIDKeys()))" | ConvertFrom-Json
Set-Clipboard -Value $classmateVapid.publicKey
# วางใน NEXT_PUBLIC_VAPID_PUBLIC_KEY แล้วค่อยรันบรรทัดถัดไป
Set-Clipboard -Value $classmateVapid.privateKey
# วางใน VAPID_PRIVATE_KEY แล้วล้างคลิปบอร์ด
Set-Clipboard -Value ' '
Remove-Variable classmateVapid
```

- [ ] หลัง Deploy สำเร็จ ใช้โดเมน Production แบบ HTTPS จากหน้า **Domains** ของ ClassMate สำหรับ Auth, PWA และ Cron เช่น `https://YOUR_DOMAIN` ใช้โดเมนที่ Supabase เรียกถึงและมือถือทั้งสองเครื่องเปิดได้ [Vercel Deployment Protection](https://vercel.com/docs/deployment-protection)

## 3. ตั้ง Supabase Auth และ Google OAuth

- [ ] ที่ Supabase **Authentication → URL Configuration** ตั้ง **Site URL** เป็น `https://YOUR_DOMAIN` และเพิ่ม **Redirect URLs** เป็น `https://YOUR_DOMAIN/groups` เพิ่ม `http://localhost:3000/groups` เฉพาะเมื่อต้องทดสอบในเครื่อง สำหรับ Preview ให้เพิ่ม URL จริงที่ลงท้ายด้วย `/groups` [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [ ] ที่ Supabase **Authentication → Sign In / Providers → Google** คัดลอก callback URL ที่หน้าตั้งค่าแสดง เช่น `https://PROJECT_REF.supabase.co/auth/v1/callback`
- [ ] ใน Google Cloud Console เปิด **Google Auth Platform** ตั้ง **Branding** และ **Audience** ของแอป หากใช้ `External` แบบ `Testing` ให้เพิ่มบัญชีที่จะใช้ทดสอบใน **Test users** ตามการตั้งค่าของแอป [Google OAuth Audience](https://support.google.com/cloud/answer/15549945)
- [ ] เลือก **Clients → Create Client → Web application** ใส่ `https://YOUR_DOMAIN` ใน **Authorized JavaScript origins** และใส่ callback ของ Supabase ที่คัดลอกมาใน **Authorized redirect URIs** Google ส่งกลับไปยัง callback ของ Supabase แล้ว Supabase ส่งผู้ใช้ต่อไปที่ `/groups` [Google OAuth Client](https://developers.google.com/workspace/guides/create-credentials) · [Supabase Sign in with Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [ ] นำ Client ID และ Client Secret ไปใส่ใน Google provider ของ Supabase ClassMate แล้วเปิดใช้งานและ Save ทดสอบจากโดเมนจริงว่ากด **เข้าสู่ระบบด้วย Google** แล้วกลับมาที่ `/groups`

## 4. ตั้ง Cron หลังได้โดเมนจริง

- [ ] เมื่อ migrations `001` ถึง `004` สำเร็จและมีโดเมน HTTPS จริงแล้ว ให้ใช้การตั้งค่าจาก `supabase/cron.sql` ลำดับด้านล่างใช้ Vault ผ่าน Dashboard เพื่อเก็บ `CRON_SECRET` โดยไม่มีค่าจริงในคำสั่ง SQL
  1. ใน Supabase ClassMate → **SQL Editor** รันส่วนเปิด extensions จาก `supabase/cron.sql`

     ```sql
     create extension if not exists pg_cron;
     create extension if not exists pg_net;
     create extension if not exists supabase_vault with schema vault;
     ```

  2. เปิดหน้า **Vault** ของ ClassMate สร้าง secret ชื่อ `classmate_cron_secret` ด้วยค่าเดียวกับ `CRON_SECRET` ของ Vercel หากมีชื่อนี้อยู่แล้วให้อัปเดตรายการเดิม [Supabase Vault](https://supabase.com/docs/guides/database/vault)
  3. รันส่วนตั้งตารางเวลาที่ดัดแปลงจาก `supabase/cron.sql` โดยแทน `YOUR_DOMAIN` ด้วย hostname จริงเท่านั้น เช่น `classmate.vercel.app` หากเป็นโดเมนของคุณ [Supabase Cron](https://supabase.com/docs/guides/cron)

     ```sql
     select cron.schedule(
       'classmate-notifications',
       '* * * * *',
       $job$
         select net.http_get(
           url := 'https://YOUR_DOMAIN/api/cron',
           headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
           timeout_milliseconds := 10000
         )
         from vault.decrypted_secrets s
         where s.name = 'classmate_cron_secret';
       $job$
     );
     ```

- [ ] รอหนึ่งถึงสองนาที ตรวจ job `classmate-notifications` ใน **Integrations → Cron** แล้วดู HTTP status ใน SQL Editor ด้วย `select id, status_code, timed_out, created from net._http_response order by created desc limit 10;` เวลา job สำเร็จใน Cron แสดงว่าคำสั่งเข้าคิว ส่วนสถานะ HTTP ยืนยันผลที่แอปตอบ ควรเห็น `200` สำหรับรอบของ ClassMate [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net)

### ตรวจและแก้ Cron `401`

เปิด `https://YOUR_DOMAIN/api/cron` ในเบราว์เซอร์ควรได้ `401` และ JSON `{"error":"Unauthorized"}` เพราะเบราว์เซอร์ไม่ได้ส่ง header สำหรับ Cron หากอยากตรวจค่าผิด ให้ใช้ PowerShell 7 จากเครื่องของคุณกับค่าทดสอบด้านล่างและคาดหวัง `401`

```powershell
(Invoke-WebRequest 'https://YOUR_DOMAIN/api/cron' -Headers @{ Authorization = 'Bearer invalid-test-value' } -SkipHttpErrorCheck).StatusCode
```

ถ้า **job ใน Supabase** ตอบ `401` ให้เช็กว่า URL เป็น `GET https://YOUR_DOMAIN/api/cron` ของ Production และแหล่งตอบ `401` คือแอป หากเป็นหน้า Vercel Authentication ให้ใช้โดเมน Production ที่เข้าถึงได้ตามการตั้งค่า Deployment Protection หากเป็น JSON `Unauthorized` ให้ตรวจว่า `CRON_SECRET` อยู่ใน Vercel environment ที่ถูกต้องและตรงกับ `classmate_cron_secret` ใน Vault ทุกตัวอักษร job ต้องส่ง `Authorization: Bearer <CRON_SECRET>` โดยมีช่องว่างหนึ่งตัวหลัง `Bearer` แล้ว Redeploy ถ้าแก้ env และรอตรวจรอบ Cron ใหม่

## 5. ทดสอบ Web Push ด้วยมือถือสองเครื่อง

- [ ] ใช้โดเมน HTTPS เดียวกันบนเครื่อง A และ B เข้าสู่ระบบด้วย Google คนละบัญชี ให้ A สร้างกลุ่มแล้วส่งรหัสเชิญให้ B เข้ากลุ่ม
- [ ] เครื่อง iPhone ใช้ iOS 16.4 ขึ้นไป เปิด Safari แล้วเลือก **แชร์ → เพิ่มไปยังหน้าจอโฮม** เครื่อง Android ใช้ Chrome แล้วเลือก **⋮ → ติดตั้งแอป** หรือ **เพิ่มลงในหน้าจอหลัก** จากนั้นเปิดจากไอคอน เข้า `/install` แตะ **เปิดการแจ้งเตือน** และอนุญาตที่ระดับระบบ ทำทั้งสองเครื่อง [WebKit Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [ ] สลับเครื่อง B ออกจากแอปหรือล็อกหน้าจอ จาก A ไปที่ **เพื่อนในกลุ่ม → ส่งแจ้งเตือน** แล้วตรวจว่า B เห็นแจ้งเตือนจากระบบ เมื่อแตะควรเปิดกล่องแจ้งเตือนของกลุ่ม จากนั้นทดสอบส่งกลับจาก B ไป A
- [ ] ส่ง **แบบปลุก** จาก A ไป B รอหนึ่งถึงสองรอบ Cron โดยยังไม่กดรับทราบเพื่อทดสอบการส่งซ้ำ แล้วให้ B กด **รับทราบและหยุดปลุก** ตรวจว่าไม่มีรอบใหม่หลังรับทราบ
- [ ] ถ้ามีข้อความในกล่องแจ้งเตือนแต่ไม่มี Push ให้ตรวจ permission ของมือถือ, คีย์ VAPID ว่ามาจากคู่เดียวกัน และ HTTP status ของ Cron หากเพิ่งเปลี่ยนคู่คีย์ ให้เปิด `/install` และลงทะเบียนแจ้งเตือนใหม่ทั้งสองเครื่อง
