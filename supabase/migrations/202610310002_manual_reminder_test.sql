-- Service-only test entry points. The production eligibility and delivery ledger are shared.
create function public.claim_email_deliveries_now() returns setof public.email_notification_deliveries
language sql security definer set search_path='' as $$
  with candidates as (
    select d.id from public.email_notification_deliveries d
    where (status in ('pending','failed') or (status='processing' and lease_until<now()))
      and attempt_count<3 and next_attempt_at<=now()
      and public.email_delivery_is_eligible(d,now())
    order by scheduled_at,id for update skip locked limit 25
  ) update public.email_notification_deliveries d set status='processing',attempt_count=attempt_count+1,
      lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes'
    from candidates c where d.id=c.id returning d.*;
$$;

create function public.inspect_email_notification_targets() returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(summary),'[]'::jsonb) from (
    select i.user_id,
      count(*)::integer as ingredients,
      count(*) filter(where i.expiry_date<(now() at time zone 'Asia/Seoul')::date)::integer as expired,
      (select count(*)::integer from public.email_notification_deliveries d where d.user_id=i.user_id
        and d.status in ('pending','failed') and d.attempt_count<3 and d.next_attempt_at<=now()
        and public.email_delivery_is_eligible(d,now())) as eligible
    from public.ingredients i group by i.user_id order by i.user_id
  ) summary;
$$;

create table public.email_manual_test_lock (id boolean primary key default true check(id), started_at timestamptz not null);
alter table public.email_manual_test_lock enable row level security;
revoke all on public.email_manual_test_lock from public,anon,authenticated;
create function public.claim_email_manual_test_run() returns boolean
language plpgsql security definer set search_path='' as $$
declare claimed boolean;
begin
  insert into public.email_manual_test_lock(id,started_at) values(true,now())
    on conflict(id) do update set started_at=excluded.started_at
    where email_manual_test_lock.started_at<now()-interval '1 minute'
    returning true into claimed;
  return coalesce(claimed,false);
end;
$$;
revoke all on function public.claim_email_deliveries_now(),public.inspect_email_notification_targets(),public.claim_email_manual_test_run() from public,anon,authenticated;
grant execute on function public.claim_email_deliveries_now(),public.inspect_email_notification_targets(),public.claim_email_manual_test_run() to service_role;
