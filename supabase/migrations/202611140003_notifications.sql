begin;
create table public.ping_rate_events(actor uuid not null references public.profiles on delete cascade, created_at timestamptz not null default now());
create index on public.ping_rate_events(actor,created_at);
create index on public.ping_rate_events(created_at);
alter table public.ping_rate_events enable row level security;
revoke all on public.ping_rate_events from public,anon,authenticated;
create function public.send_ping(actor uuid,gid uuid,recipient uuid,body text,alarm boolean) returns public.pings
language plpgsql security definer set search_path='' as $$
declare item public.pings; begin
  if actor=recipient or not exists(select 1 from public.group_members where group_id=gid and user_id=actor) or not exists(select 1 from public.group_members where group_id=gid and user_id=recipient) then
    raise exception 'not_group_peer';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,13));
  if (select count(*) from public.ping_rate_events e where e.actor=send_ping.actor and e.created_at>now()-interval '1 minute')>=10 then raise exception 'rate_limit'; end if;
  insert into public.ping_rate_events(actor) values(actor);
  insert into public.pings(group_id,from_user,to_user,message,is_alarm,next_repeat_at)
  values(gid,actor,recipient,body,alarm,case when alarm then now()+interval '1 minute' end) returning * into item;
  insert into public.notification_jobs(dedupe_key,user_id,group_id,ping_id,title,body)
  values('ping:'||item.id||':0',recipient,gid,item.id,case when alarm then 'ClassMate · ปลุก' else 'ClassMate · ข้อความจากเพื่อน' end,body);
  return item;
end $$;
create function public.register_push(actor uuid,sub_endpoint text,sub_p256dh text,sub_auth text,agent text) returns uuid
language sql security definer set search_path='' as $$
 insert into public.push_subscriptions as p(user_id,endpoint,p256dh,auth,user_agent)
 values(actor,sub_endpoint,sub_p256dh,sub_auth,agent)
 on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth,user_agent=excluded.user_agent
 where p.user_id=excluded.user_id returning id $$;
revoke all on function public.register_push(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.register_push(uuid,text,text,text,text) to service_role;
create function public.read_ping(pid uuid,ack boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare found_id uuid; begin
 update public.pings set read_at=coalesce(read_at,now()),acknowledged_at=case when ack and is_alarm then coalesce(acknowledged_at,now()) else acknowledged_at end,
 next_repeat_at=case when ack then null else next_repeat_at end
 where id=pid and to_user=auth.uid() returning id into found_id;
 return found_id;
end $$;
create function public.enqueue_notifications() returns void language plpgsql security definer set search_path='' as $$
begin
 with due as (
   select p.id from public.pings p where p.next_repeat_at<=now() and p.acknowledged_at is null and p.repeat_count<10
     and exists(select 1 from public.group_members m where m.group_id=p.group_id and m.user_id=p.to_user)
     and exists(select 1 from public.group_members m where m.group_id=p.group_id and m.user_id=p.from_user)
   order by p.next_repeat_at limit 200 for update skip locked
 ), advanced as (
   update public.pings p set repeat_count=p.repeat_count+1,
   next_repeat_at=case when p.repeat_count+1<10 then now()+interval '1 minute' end
   from due where p.id=due.id returning p.*
 )
 insert into public.notification_jobs(dedupe_key,user_id,group_id,ping_id,title,body)
 select 'ping:'||id||':'||repeat_count,to_user,group_id,id,'ClassMate · ปลุก',message from advanced on conflict do nothing;

 insert into public.notification_jobs(dedupe_key,user_id,group_id,title,body,expires_at)
 select 'task:'||t.id||':'||m.user_id||':'||extract(epoch from t.due_at)||':'||r.label,
 m.user_id,t.group_id,'ClassMate · การบ้านใกล้ถึงกำหนด',left(t.title,120)||' · เหลือประมาณ '||r.label,least(t.due_at, now()+interval '5 minutes')
 from public.tasks t join public.group_members m using(group_id)
 left join public.notification_settings s on s.user_id=m.user_id
 cross join lateral (values ('1 วัน',interval '1 day',coalesce(s.remind_task_1d,true)),('1 ชั่วโมง',interval '1 hour',coalesce(s.remind_task_1h,true))) r(label,lead,enabled)
 where r.enabled and t.due_at>now() and t.due_at-r.lead between now()-interval '5 minutes' and now()
 and not exists(select 1 from public.task_completions c where c.task_id=t.id and c.user_id=m.user_id)
 on conflict do nothing;

 with local_dates as (
 select (now() at time zone 'Asia/Bangkok')::date+delta as dt from generate_series(0,1) delta
 )
 insert into public.notification_jobs(dedupe_key,user_id,group_id,title,body,expires_at)
 select 'class:'||c.id||':'||extract(epoch from timing.starts),s.owner_id,s.group_id,'ClassMate · คาบเรียนถัดไป',
 left(c.subject||' · '||to_char(c.start_time,'HH24:MI')||' '||left(c.room,80),200),least(timing.starts,now()+interval '5 minutes')
 from local_dates d join public.classes c on c.day_of_week=extract(isodow from d.dt)-1
 join public.schedules s on s.id=c.schedule_id join public.group_members m on m.group_id=s.group_id and m.user_id=s.owner_id
 left join public.notification_settings n on n.user_id=s.owner_id
 cross join lateral (select (d.dt+c.start_time) at time zone 'Asia/Bangkok' as starts) timing
 where coalesce(n.remind_class_30m,true) and timing.starts-interval '30 minutes' between now()-interval '5 minutes' and now()
 on conflict do nothing;
 delete from public.ping_rate_events where created_at < now()-interval '1 day';
 delete from public.notification_jobs where expires_at < now()-interval '7 days';
end $$;
create function public.claim_notifications(only_ping uuid default null) returns setof public.notification_jobs
language sql security definer set search_path='' as $$
with pending as (
 select j.id from public.notification_jobs j
 where j.delivered_at is null and j.run_at<=now() and j.expires_at>now() and coalesce(j.lease_until,'-infinity')<now()
 and (only_ping is null or j.ping_id=only_ping)
 and exists(select 1 from public.group_members m where m.group_id=j.group_id and m.user_id=j.user_id)
 and (j.ping_id is null or exists(select 1 from public.pings p join public.group_members m on m.group_id=p.group_id and m.user_id=p.from_user where p.id=j.ping_id and p.acknowledged_at is null))
 order by j.run_at limit 40 for update skip locked
)
update public.notification_jobs j set lease_until=now()+interval '2 minutes' from pending where j.id=pending.id returning j.* $$;
revoke all on function send_ping(uuid,uuid,uuid,text,boolean),read_ping(uuid,boolean),enqueue_notifications(),claim_notifications(uuid) from public,anon,authenticated;
grant execute on function send_ping(uuid,uuid,uuid,text,boolean),enqueue_notifications(),claim_notifications(uuid) to service_role;
grant execute on function read_ping(uuid,boolean) to authenticated;
commit;
