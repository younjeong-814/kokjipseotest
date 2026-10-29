-- Additive only. Existing ingredients, Auth users and snapshot RPCs are unchanged.
begin;

create table public.ut_participants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  participation_code text not null unique default ('UT-' || gen_random_uuid()::text),
  status text not null default 'active' check (status in ('active','withdrawn','completed')),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('ut','email_reminders')),
  accepted boolean not null,
  version text not null,
  recorded_at timestamptz not null default now()
);
create table public.email_notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  email_verified_at timestamptz,
  enabled boolean not null default false,
  consent_at timestamptz,
  consent_version text,
  revision integer not null default 0,
  updated_at timestamptz not null default now(),
  check (not enabled or (email is not null and email_verified_at is not null and consent_at is not null and consent_version='email-reminders-v1'))
);
create table public.email_change_requests (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  new_email text not null check (length(new_email) between 3 and 254),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  verified_at timestamptz,
  invalidated_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  delivery_status text not null default 'pending' check (delivery_status in ('pending','sent','failed')),
  consent_version text not null check (consent_version='email-reminders-v1'),
  created_at timestamptz not null default now()
);
create index email_change_requests_owner_created on public.email_change_requests(user_id,created_at desc);
create table public.email_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_id uuid not null, -- Historical ID: deliberately no cascading ingredient FK.
  expiry_date date not null,
  reminder_type text not null check (reminder_type in ('3_days','1_day','due_today')),
  scheduled_at timestamptz not null,
  settings_revision integer not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 3),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique(user_id,ingredient_id,expiry_date,reminder_type)
);
create index email_due_queue on public.email_notification_deliveries(status,scheduled_at,next_attempt_at);
create table public.ut_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key uuid not null,
  event_type text not null check (event_type in ('app_open','notification_click','ingredient_view','ingredient_manage')),
  ingredient_id uuid,
  delivery_id uuid references public.email_notification_deliveries(id),
  recorded_at timestamptz not null default now(),
  unique(user_id,event_key)
);

-- Owner reads only. Authentication state / code hashes / send status cannot be forged by a browser.
alter table public.ut_participants enable row level security;
alter table public.user_consents enable row level security;
alter table public.email_notification_settings enable row level security;
alter table public.email_change_requests enable row level security;
alter table public.email_notification_deliveries enable row level security;
alter table public.ut_events enable row level security;
revoke all on public.ut_participants,public.user_consents,public.email_notification_settings,
  public.email_change_requests,public.email_notification_deliveries,public.ut_events from public,anon,authenticated;
grant select on public.ut_participants,public.user_consents,public.email_notification_settings,public.email_notification_deliveries,public.ut_events to authenticated;
grant all on public.ut_participants,public.user_consents,public.email_notification_settings,
  public.email_change_requests,public.email_notification_deliveries,public.ut_events to service_role;
create policy ut_participants_owner on public.ut_participants for select to authenticated using ((select auth.uid())=user_id);
create policy user_consents_owner on public.user_consents for select to authenticated using ((select auth.uid())=user_id);
create policy email_settings_owner on public.email_notification_settings for select to authenticated using ((select auth.uid())=user_id);
create policy email_deliveries_owner on public.email_notification_deliveries for select to authenticated using ((select auth.uid())=user_id);
create policy ut_events_owner on public.ut_events for select to authenticated using ((select auth.uid())=user_id);

create function public.set_ut_participation(p_accepted boolean) returns void
language plpgsql security definer set search_path='' as $$
declare owner uuid := auth.uid();
begin
  if owner is null then raise exception 'authentication_required'; end if;
  insert into public.ut_participants(user_id,status) values(owner,case when p_accepted then 'active' else 'withdrawn' end)
    on conflict(user_id) do update set status=excluded.status,updated_at=now();
  insert into public.user_consents(user_id,scope,accepted,version) values(owner,'ut',p_accepted,'ut-v1');
end $$;

create function public.set_email_reminders_enabled(p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid(); s public.email_notification_settings;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  select * into s from public.email_notification_settings where user_id=owner for update;
  if not found or (p_enabled and s.email_verified_at is null) then raise exception 'email_verification_required'; end if;
  update public.email_notification_settings set enabled=p_enabled,
    consent_at=case when p_enabled then now() else consent_at end,
    consent_version='email-reminders-v1',updated_at=now() where user_id=owner;
  insert into public.user_consents(user_id,scope,accepted,version) values(owner,'email_reminders',p_enabled,'email-reminders-v1');
  if not p_enabled then
    update public.email_notification_deliveries set status='cancelled',last_error='notifications_disabled'
      where user_id=owner and status in ('pending','failed','processing');
  end if;
end $$;

-- Client event requests never accept a user_id or arbitrary properties containing PII.
create function public.record_ut_event(p_event_key uuid,p_event_type text,p_ingredient_id uuid default null,p_delivery_id uuid default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_event_type not in ('app_open','notification_click','ingredient_view','ingredient_manage') then raise exception 'invalid_event'; end if;
  if not exists(select 1 from public.ut_participants where user_id=owner and status='active') then return false; end if;
  if p_delivery_id is not null and not exists(select 1 from public.email_notification_deliveries where id=p_delivery_id and user_id=owner and status='sent') then return false; end if;
  if p_event_type='notification_click' and p_delivery_id is null then return false; end if;
  if p_ingredient_id is not null and not exists(select 1 from public.ingredients where user_id=owner and id=p_ingredient_id)
     and not exists(select 1 from public.ingredient_activities where user_id=owner and item_id=p_ingredient_id) then return false; end if;
  if (select count(*) from public.ut_events where user_id=owner and recorded_at>=date_trunc('day',now()))>=1000 then return false; end if;
  insert into public.ut_events(user_id,event_key,event_type,ingredient_id,delivery_id) values(owner,p_event_key,p_event_type,p_ingredient_id,p_delivery_id)
    on conflict(user_id,event_key) do nothing;
  return true;
end $$;

-- Server-only challenge creation: the old verified email remains until successful verification.
create function public.create_email_change_request(p_user_id uuid,p_id uuid,p_email text,p_hash text) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare deadline timestamptz:=now()+interval '5 minutes';
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  if p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'invalid_email'; end if;
  if exists(select 1 from public.email_change_requests where user_id=p_user_id and created_at>now()-interval '60 seconds') then raise exception 'resend_cooldown'; end if;
  if (select count(*) from public.email_change_requests where user_id=p_user_id and created_at>now()-interval '1 day')>=10 then raise exception 'request_limit'; end if;
  update public.email_change_requests set invalidated_at=now() where user_id=p_user_id and verified_at is null and invalidated_at is null;
  insert into public.email_change_requests(id,user_id,new_email,token_hash,expires_at,consent_version)
    values(p_id,p_user_id,lower(btrim(p_email)),p_hash,deadline,'email-reminders-v1');
  return deadline;
end $$;

create function public.verify_email_change_request(p_user_id uuid,p_id uuid,p_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.email_change_requests;
begin
  select * into r from public.email_change_requests where id=p_id and user_id=p_user_id for update;
  if not found then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  if r.verified_at is not null or r.invalidated_at is not null or r.delivery_status<>'sent' then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  if r.expires_at<=now() then return '{"ok":false,"reason":"expired"}'::jsonb; end if;
  if r.attempt_count>=5 then return '{"ok":false,"reason":"locked"}'::jsonb; end if;
  update public.email_change_requests set attempt_count=attempt_count+1 where id=r.id;
  if r.token_hash<>p_hash then return '{"ok":false,"reason":"mismatch"}'::jsonb; end if;
  update public.email_change_requests set verified_at=now() where id=r.id;
  insert into public.email_notification_settings(user_id,email,email_verified_at,enabled,consent_at,consent_version,revision)
    values(p_user_id,r.new_email,now(),true,r.created_at,r.consent_version,1)
    on conflict(user_id) do update set email=excluded.email,email_verified_at=now(),enabled=true,
      consent_at=r.created_at,consent_version=r.consent_version,revision=public.email_notification_settings.revision+1,updated_at=now();
  insert into public.user_consents(user_id,scope,accepted,version,recorded_at) values(p_user_id,'email_reminders',true,r.consent_version,r.created_at);
  update public.email_notification_deliveries set status='cancelled',last_error='email_changed'
    where user_id=p_user_id and status in ('pending','processing','failed');
  return '{"ok":true}'::jsonb;
end $$;

-- Eligibility is evaluated from current server data, not browser snapshots.
create function public.email_delivery_is_eligible(d public.email_notification_deliveries,p_now timestamptz)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.email_notification_settings s join public.ingredients i on i.user_id=s.user_id
  where s.user_id=d.user_id and i.id=d.ingredient_id and i.expiry_date=d.expiry_date
    and coalesce(i.payload->>'remainingPercent','100')<>'0'
    and s.enabled and s.email_verified_at is not null and s.consent_at is not null
    and s.consent_version='email-reminders-v1' and s.revision=d.settings_revision
    and (d.scheduled_at at time zone 'Asia/Seoul')::date=(p_now at time zone 'Asia/Seoul')::date);
$$;

create function public.refresh_email_notification_schedule(p_now timestamptz default now()) returns integer
language plpgsql security definer set search_path='' as $$
declare added integer;
begin
  update public.email_notification_deliveries d set status='cancelled',last_error='eligibility_changed'
    where status in ('pending','failed','processing') and (
      (d.scheduled_at at time zone 'Asia/Seoul')::date<(p_now at time zone 'Asia/Seoul')::date
      or not exists(select 1 from public.ingredients i join public.email_notification_settings s on i.user_id=s.user_id
        where i.user_id=d.user_id and i.id=d.ingredient_id and i.expiry_date=d.expiry_date
        and coalesce(i.payload->>'remainingPercent','100')<>'0' and s.enabled and s.email_verified_at is not null and s.revision=d.settings_revision));
  insert into public.email_notification_deliveries(user_id,ingredient_id,expiry_date,reminder_type,scheduled_at,settings_revision,next_attempt_at)
  select i.user_id,i.id,i.expiry_date,v.kind,((i.expiry_date-v.days)+time '09:00') at time zone 'Asia/Seoul',s.revision,p_now
    from public.ingredients i join public.email_notification_settings s on s.user_id=i.user_id
    cross join (values(3,'3_days'),(1,'1_day'),(0,'due_today')) v(days,kind)
    where i.expiry_date is not null and coalesce(i.payload->>'remainingPercent','100')<>'0'
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

create function public.claim_email_deliveries(p_now timestamptz default now()) returns setof public.email_notification_deliveries
language sql security definer set search_path='' as $$
  with candidates as (
    select d.id from public.email_notification_deliveries d
    where (status in ('pending','failed') or (status='processing' and lease_until<p_now))
      and attempt_count<3 and scheduled_at<=p_now and next_attempt_at<=p_now
      and public.email_delivery_is_eligible(d,p_now)
    order by scheduled_at,id for update skip locked limit 25
  ) update public.email_notification_deliveries d set status='processing',attempt_count=attempt_count+1,
      lease_token=gen_random_uuid(),lease_until=p_now+interval '5 minutes'
    from candidates c where d.id=c.id returning d.*;
$$;

create function public.prepare_email_delivery(p_id uuid,p_lease uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.email_notification_deliveries; result jsonb;
begin
  select * into d from public.email_notification_deliveries where id=p_id and status='processing' and lease_token=p_lease and lease_until>now() for update;
  if not found then return null; end if;
  if not public.email_delivery_is_eligible(d,now()) then
    update public.email_notification_deliveries set status='cancelled',last_error='eligibility_changed' where id=d.id;
    return null;
  end if;
  select jsonb_build_object('email',s.email,'name',i.name,'ingredientId',i.id,'expiryDate',i.expiry_date,'deliveryId',d.id,'reminderType',d.reminder_type)
    into result from public.email_notification_settings s join public.ingredients i on i.user_id=s.user_id
    where s.user_id=d.user_id and i.id=d.ingredient_id;
  return result;
end $$;

create function public.finish_email_delivery(p_id uuid,p_lease uuid,p_success boolean) returns void
language sql security definer set search_path='' as $$
  update public.email_notification_deliveries set status=case when p_success then 'sent' else 'failed' end,
    sent_at=case when p_success then now() else null end,last_error=case when p_success then null else 'provider_failed' end,
    next_attempt_at=now()+interval '10 minutes',lease_until=null
    where id=p_id and status='processing' and lease_token=p_lease;
$$;

-- Functions are otherwise executable by PUBLIC by default: revoke explicitly.
revoke all on function public.set_ut_participation(boolean),public.set_email_reminders_enabled(boolean),
  public.record_ut_event(uuid,text,uuid,uuid) from public,anon;
grant execute on function public.set_ut_participation(boolean),public.set_email_reminders_enabled(boolean),
  public.record_ut_event(uuid,text,uuid,uuid) to authenticated;
revoke all on function public.create_email_change_request(uuid,uuid,text,text),public.verify_email_change_request(uuid,uuid,text),
  public.email_delivery_is_eligible(public.email_notification_deliveries,timestamptz),
  public.refresh_email_notification_schedule(timestamptz),public.claim_email_deliveries(timestamptz),
  public.prepare_email_delivery(uuid,uuid),public.finish_email_delivery(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.create_email_change_request(uuid,uuid,text,text),public.verify_email_change_request(uuid,uuid,text),
  public.email_delivery_is_eligible(public.email_notification_deliveries,timestamptz),
  public.refresh_email_notification_schedule(timestamptz),public.claim_email_deliveries(timestamptz),
  public.prepare_email_delivery(uuid,uuid),public.finish_email_delivery(uuid,uuid,boolean) to service_role;
commit;
