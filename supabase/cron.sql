-- Run in Supabase SQL Editor only. Use a bare hostname for YOUR_DOMAIN.
-- Replace YOUR_CRON_SECRET with the same random value configured in Vercel.
-- Keep the edited SQL private. The job command reads the secret from Vault.
begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

do $setup$
declare
  domain_name constant text := 'YOUR_DOMAIN';
  cron_secret constant text := 'YOUR_CRON_SECRET';
  secret_id uuid;
begin
  if domain_name !~ '^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$'
     or cron_secret = 'YOUR_CRON_SECRET' or length(cron_secret) < 32 then
    raise exception 'Set the bare Vercel hostname and a cron secret of at least 32 characters';
  end if;

  select id into secret_id from vault.secrets where name = 'classmate_cron_secret';
  if secret_id is null then
    perform vault.create_secret(cron_secret, 'classmate_cron_secret');
  else
    perform vault.update_secret(secret_id, cron_secret);
  end if;

  perform cron.schedule(
    'classmate-notifications',
    '* * * * *',
    format($job$
      select net.http_get(
        url := %L,
        headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
        timeout_milliseconds := 10000
      )
      from vault.decrypted_secrets s
      where s.name = 'classmate_cron_secret';
    $job$, 'https://' || domain_name || '/api/cron')
  );
end
$setup$;

commit;
