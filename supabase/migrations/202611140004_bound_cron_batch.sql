begin;
drop function public.claim_notifications(uuid);

create function public.claim_notifications(only_ping uuid default null, max_jobs integer default 8) returns setof public.notification_jobs
language sql security definer set search_path='' as $$
with pending as (
 select j.id from public.notification_jobs j
 where j.delivered_at is null and j.run_at<=now() and j.expires_at>now() and coalesce(j.lease_until,'-infinity')<now()
 and (only_ping is null or j.ping_id=only_ping)
 and exists(select 1 from public.group_members m where m.group_id=j.group_id and m.user_id=j.user_id)
 and (j.ping_id is null or exists(select 1 from public.pings p join public.group_members m on m.group_id=p.group_id and m.user_id=p.from_user where p.id=j.ping_id and p.acknowledged_at is null))
 order by j.run_at limit least(greatest(coalesce(max_jobs,8),1),8) for update skip locked
)
update public.notification_jobs j set lease_until=now()+interval '2 minutes' from pending where j.id=pending.id returning j.* $$;
revoke all on function public.claim_notifications(uuid,integer) from public,anon,authenticated;
grant execute on function public.claim_notifications(uuid,integer) to service_role;

commit;
