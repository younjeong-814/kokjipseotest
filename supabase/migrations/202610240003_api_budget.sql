begin;
create table public.api_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('recipes','ocr','recognize')),
  calls integer not null check (calls > 0),
  primary key(user_id,day,kind)
);
alter table public.api_usage enable row level security;
revoke all on public.api_usage from public, anon, authenticated;
-- No client table privileges: users cannot reset their own budget.
create function public.consume_api_budget(api_kind text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare owner uuid:=auth.uid(); maximum integer; count_now integer;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  maximum:=case api_kind when 'recipes' then 50 when 'ocr' then 10 when 'recognize' then 5 else 0 end;
  if maximum=0 then raise exception 'invalid_api_kind'; end if;
  insert into public.api_usage(user_id,day,kind,calls)
  values(owner,(now() at time zone 'Asia/Seoul')::date,api_kind,1)
  on conflict(user_id,day,kind) do update set calls=public.api_usage.calls+1 where public.api_usage.calls < maximum
  returning calls into count_now;
  return count_now is not null;
end;
$$;
revoke all on function public.consume_api_budget(text) from public,anon;
grant execute on function public.consume_api_budget(text) to authenticated;
commit;
