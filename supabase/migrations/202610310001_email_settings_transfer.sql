-- Additive only. 임시 계정에서 인증한 알림 이메일을, 이미 다른 계정에 연결돼 있던 Google 계정으로 로그인할 때 옮긴다.
-- 임시 계정이 로그인 직전에 일회용 티켓을 만들고(원문은 브라우저 탭에만), 로그인한 계정이 그 티켓으로 가져간다.
begin;

create table public.email_settings_transfers (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  from_user uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
-- 정책 없음: 아래 RPC로만 접근한다.
alter table public.email_settings_transfers enable row level security;

create function public.start_email_settings_transfer() returns text
language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid(); token text;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.email_notification_settings where user_id=owner and email_verified_at is not null) then return null; end if;
  if (select count(*) from public.email_settings_transfers where from_user=owner and created_at>now()-interval '1 day')>=20 then raise exception 'request_limit'; end if;
  token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
  insert into public.email_settings_transfers(token_hash,from_user,expires_at)
    values(encode(sha256(convert_to(token,'UTF8')),'hex'),owner,now()+interval '15 minutes');
  return token;
end $$;

create function public.claim_email_settings_transfer(p_token text) returns boolean
language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid(); source uuid; s public.email_notification_settings;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  update public.email_settings_transfers set claimed_at=now()
    where token_hash=encode(sha256(convert_to(coalesce(p_token,''),'UTF8')),'hex') and claimed_at is null and expires_at>now()
    returning from_user into source;
  -- 같은 계정(연결 성공)이면 설정이 이미 그대로 있다.
  if source is null or source=owner then return false; end if;
  -- 로그인한 계정에 인증된 알림 이메일이 이미 있으면 덮어쓰지 않는다.
  if exists(select 1 from public.email_notification_settings where user_id=owner and email_verified_at is not null) then return false; end if;
  select * into s from public.email_notification_settings where user_id=source and email_verified_at is not null for update;
  if not found then return false; end if;
  insert into public.email_notification_settings(user_id,email,email_verified_at,enabled,consent_at,consent_version,revision)
    values(owner,s.email,s.email_verified_at,s.enabled,s.consent_at,s.consent_version,1)
    on conflict(user_id) do update set email=excluded.email,email_verified_at=excluded.email_verified_at,enabled=excluded.enabled,
      consent_at=excluded.consent_at,consent_version=excluded.consent_version,revision=public.email_notification_settings.revision+1,updated_at=now();
  if s.consent_at is not null then
    insert into public.user_consents(user_id,scope,accepted,version,recorded_at) values(owner,'email_reminders',s.enabled,s.consent_version,s.consent_at);
  end if;
  -- 더 이상 쓰지 않는 임시 계정으로 같은 메일이 중복 발송되지 않게 끈다.
  update public.email_notification_settings set enabled=false,revision=revision+1,updated_at=now() where user_id=source;
  update public.email_notification_deliveries set status='cancelled',last_error='settings_transferred'
    where user_id=source and status in ('pending','processing','failed');
  return true;
end $$;

revoke all on function public.start_email_settings_transfer(),public.claim_email_settings_transfer(text) from public,anon;
grant execute on function public.start_email_settings_transfer(),public.claim_email_settings_transfer(text) to authenticated;
commit;
