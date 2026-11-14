begin;
create function public.is_group_member(group_id uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.group_members m where m.group_id=$1 and m.user_id=auth.uid()) $$;
create function public.is_group_owner(group_id uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.group_members m where m.group_id=$1 and m.user_id=auth.uid() and m.role='owner') $$;
create function public.create_group(group_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare gid uuid; code text; alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  for attempt in 1..10 loop
    select string_agg(substr(alphabet,1+floor(random()*26)::int,1),'') into code from generate_series(1,6);
    insert into public.groups(name,invite_code,owner_id) values(trim(group_name),code,auth.uid()) on conflict(invite_code) do nothing returning id into gid;
    if gid is not null then
      insert into public.group_members values(gid,auth.uid(),'owner',now());
      return gid;
    end if;
  end loop;
  raise exception 'Could not generate invite code';
end $$;
create function public.join_group(code text) returns uuid language plpgsql security definer set search_path='' as $$
declare gid uuid; begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,12));
  -- Throttle invite guesses per signed-in account.
  insert into public.invite_attempts(user_id, bucket, attempts) values(auth.uid(),date_trunc('minute',now()),1)
  on conflict(user_id) do update set attempts=case when invite_attempts.bucket=excluded.bucket then invite_attempts.attempts+1 else 1 end,bucket=excluded.bucket;
  if (select attempts from public.invite_attempts where user_id=auth.uid())>10 then return null; end if;
  select id into gid from public.groups where invite_code=upper(trim(code));
  if gid is not null then
    insert into public.group_members values(gid,auth.uid(),'member',now()) on conflict do nothing;
  end if;
  return gid;
end $$;
create table invite_attempts(user_id uuid primary key references profiles on delete cascade,bucket timestamptz not null,attempts int not null);
do $$ declare t text; begin foreach t in array array['profiles','groups','group_members','schedules','classes','tasks','task_completions','pings','push_subscriptions','notification_settings','notification_jobs','invite_attempts'] loop
execute format('alter table public.%I enable row level security',t);
execute format('revoke all on public.%I from public, anon, authenticated',t);
execute format('grant all on public.%I to service_role',t);
end loop; end $$;
revoke all on function is_group_member(uuid),is_group_owner(uuid),create_group(text),join_group(text) from public,anon,authenticated;
grant execute on function is_group_member(uuid),is_group_owner(uuid),create_group(text),join_group(text) to authenticated;
grant select on profiles,groups,group_members,schedules,classes,tasks,task_completions,pings,push_subscriptions,notification_settings to authenticated;
grant update(display_name,color) on profiles to authenticated;
grant delete on groups,group_members,schedules,classes,tasks,task_completions,push_subscriptions to authenticated;
grant insert on schedules,classes,tasks,task_completions,push_subscriptions,notification_settings to authenticated;
grant update(name) on schedules to authenticated;
grant update(subject,day_of_week,start_time,end_time,room,color) on classes to authenticated;
grant update(title,subject,description,due_at) on tasks to authenticated;
grant update(p256dh,auth,user_agent) on push_subscriptions to authenticated;
grant update(remind_task_1d,remind_task_1h,remind_class_30m,show_completions) on notification_settings to authenticated;
create policy profile_select on profiles for select to authenticated using(id=auth.uid() or exists(select 1 from public.group_members where user_id=profiles.id));
create policy profile_update on profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy group_select on groups for select to authenticated using(is_group_member(id));
create policy group_delete on groups for delete to authenticated using(is_group_owner(id));
create policy member_select on group_members for select to authenticated using(is_group_member(group_id));
create policy member_delete on group_members for delete to authenticated using(role='member' and is_group_owner(group_id));
create policy schedule_select on schedules for select to authenticated using(is_group_member(group_id) and exists(select 1 from group_members m where m.group_id=schedules.group_id and m.user_id=schedules.owner_id));
create policy schedule_insert on schedules for insert to authenticated with check(owner_id=auth.uid() and is_group_member(group_id));
create policy schedule_update on schedules for update to authenticated using(owner_id=auth.uid() and is_group_member(group_id));
create policy schedule_delete on schedules for delete to authenticated using(owner_id=auth.uid() and is_group_member(group_id));
create policy class_select on classes for select to authenticated using(exists(select 1 from schedules where id=schedule_id));
create policy class_write on classes for all to authenticated using(exists(select 1 from schedules where id=schedule_id and owner_id=auth.uid())) with check(exists(select 1 from schedules where id=schedule_id and owner_id=auth.uid()));
create policy task_select on tasks for select to authenticated using(is_group_member(group_id));
create policy task_insert on tasks for insert to authenticated with check(is_group_member(group_id) and created_by=auth.uid());
create policy task_update on tasks for update to authenticated using(is_group_member(group_id) and (created_by=auth.uid() or is_group_owner(group_id)));
create policy task_delete on tasks for delete to authenticated using(is_group_member(group_id) and (created_by=auth.uid() or is_group_owner(group_id)));
create policy completion_select on task_completions for select to authenticated using(exists(select 1 from tasks where id=task_id));
create policy completion_write on task_completions for all to authenticated using(user_id=auth.uid() and exists(select 1 from tasks where id=task_id)) with check(user_id=auth.uid() and exists(select 1 from tasks where id=task_id));
create policy ping_select on pings for select to authenticated using(auth.uid() in (from_user,to_user));
create policy subscription_owner on push_subscriptions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy settings_owner on notification_settings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
alter publication supabase_realtime add table groups,group_members,profiles,schedules,classes,tasks,task_completions,pings;
commit;
