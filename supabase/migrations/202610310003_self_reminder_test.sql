-- Replace the broad temporary test entry points with owner-scoped service RPCs.
create function public.refresh_email_notification_schedule_for_user(p_user_id uuid,p_now timestamptz default now()) returns integer
language plpgsql security definer set search_path='' as $$
declare added integer;
begin
  update public.email_notification_deliveries d set status='cancelled',last_error='eligibility_changed'
    where d.user_id=p_user_id and status in ('pending','failed','processing') and (
      (d.scheduled_at at time zone 'Asia/Seoul')::date<(p_now at time zone 'Asia/Seoul')::date
      or not exists(select 1 from public.ingredients i join public.email_notification_settings s on i.user_id=s.user_id
        where i.user_id=d.user_id and i.id=d.ingredient_id and i.expiry_date=d.expiry_date
        and coalesce(i.payload->>'remainingPercent','100')<>'0' and s.enabled and s.email_verified_at is not null and s.revision=d.settings_revision));
  insert into public.email_notification_deliveries(user_id,ingredient_id,expiry_date,reminder_type,scheduled_at,settings_revision,next_attempt_at)
  select i.user_id,i.id,i.expiry_date,v.kind,((i.expiry_date-v.days)+time '09:00') at time zone 'Asia/Seoul',s.revision,p_now
    from public.ingredients i join public.email_notification_settings s on s.user_id=i.user_id
    cross join (values(3,'3_days'),(1,'1_day'),(0,'due_today')) v(days,kind)
    where i.user_id=p_user_id and i.expiry_date is not null and coalesce(i.payload->>'remainingPercent','100')<>'0'
      and s.enabled and s.email_verified_at is not null and s.consent_at is not null
      and s.consent_version='email-reminders-v1'
      -- Today overdue slots are created too, then expire at midnight KST. No past-day backfill.
      and i.expiry_date-v.days>=(p_now at time zone 'Asia/Seoul')::date
  on conflict(user_id,ingredient_id,expiry_date,reminder_type) do update
    set settings_revision=excluded.settings_revision,status='pending',last_error=null,next_attempt_at=p_now
    where email_notification_deliveries.status='cancelled' and email_notification_deliveries.attempt_count<3;
  get diagnostics added=row_count;
  return added;
end $$;

create function public.claim_email_deliveries_for_user_now(p_user_id uuid) returns setof public.email_notification_deliveries
language sql security definer set search_path='' as $$
  with candidates as (
    select d.id from public.email_notification_deliveries d
    where d.user_id=p_user_id and (status in ('pending','failed') or (status='processing' and lease_until<now()))
      and attempt_count<3 and next_attempt_at<=now()
      and public.email_delivery_is_eligible(d,now())
    order by scheduled_at,id for update skip locked limit 25
  ) update public.email_notification_deliveries d set status='processing',attempt_count=attempt_count+1,
      lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes'
    from candidates c where d.id=c.id returning d.*;
$$;

create function public.inspect_email_notification_targets_for_user(p_user_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(summary),'[]'::jsonb) from (
    select i.user_id,
      count(*)::integer as ingredients,
      count(*) filter(where i.expiry_date<(now() at time zone 'Asia/Seoul')::date)::integer as expired,
      (select count(*)::integer from public.email_notification_deliveries d where d.user_id=i.user_id
        and d.status in ('pending','failed') and d.attempt_count<3 and d.next_attempt_at<=now()
        and public.email_delivery_is_eligible(d,now())) as eligible
    from public.ingredients i where i.user_id=p_user_id group by i.user_id order by i.user_id
  ) summary;
$$;


create table public.email_self_test_lock(user_id uuid primary key references auth.users(id) on delete cascade,started_at timestamptz not null);
alter table public.email_self_test_lock enable row level security;
revoke all on public.email_self_test_lock from public,anon,authenticated;
create function public.claim_email_manual_test_run_for_user(p_user_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare claimed boolean;
begin
 insert into public.email_self_test_lock(user_id,started_at) values(p_user_id,now())
 on conflict(user_id) do update set started_at=excluded.started_at
 where email_self_test_lock.started_at<now()-interval '1 minute' returning true into claimed;
 return coalesce(claimed,false);
end;
$$;
revoke all on function public.refresh_email_notification_schedule_for_user(uuid,timestamptz),public.claim_email_deliveries_for_user_now(uuid),public.inspect_email_notification_targets_for_user(uuid),public.claim_email_manual_test_run_for_user(uuid) from public,anon,authenticated;
grant execute on function public.refresh_email_notification_schedule_for_user(uuid,timestamptz),public.claim_email_deliveries_for_user_now(uuid),public.inspect_email_notification_targets_for_user(uuid),public.claim_email_manual_test_run_for_user(uuid) to service_role;
revoke execute on function public.claim_email_deliveries_now(),public.inspect_email_notification_targets(),public.claim_email_manual_test_run() from service_role;
