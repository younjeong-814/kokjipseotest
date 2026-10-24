-- Additive schema: existing localStorage records are NOT uploaded automatically.
begin;

create table public.ingredients (
  id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  category text not null,
  expiry_date date,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (payload ? 'id' and payload->>'id' = id::text),
  check (payload ? 'name' and payload->>'name' = name),
  check (payload ? 'category' and payload->>'category' = category)
);

create table public.ingredient_history (
  id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action text not null check (action in ('consumed', 'discarded')),
  recorded_at timestamptz not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  primary key (user_id, id),
  check (payload ? 'id' and payload->>'id' = id::text),
  check (payload ? 'action' and payload->>'action' = action)
);

create table public.ingredient_activities (
  id text not null check (char_length(id) between 1 and 300),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null,
  type text not null check (type in ('registered','condition','storage','partial','consumed','discarded')),
  recorded_at timestamptz not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  primary key (user_id, id),
  check (payload ? 'id' and payload->>'id' = id),
  check (payload ? 'itemId' and payload->>'itemId' = item_id::text),
  check (payload ? 'type' and payload->>'type' = type)
);

create index ingredients_owner_expiry_idx on public.ingredients (user_id, expiry_date);
create index history_owner_date_idx on public.ingredient_history (user_id, recorded_at);
create index activities_owner_date_idx on public.ingredient_activities (user_id, recorded_at);

alter table public.ingredients enable row level security;
alter table public.ingredient_history enable row level security;
alter table public.ingredient_activities enable row level security;

revoke all on public.ingredients, public.ingredient_history, public.ingredient_activities from anon, authenticated;
grant select, insert, update, delete on public.ingredients, public.ingredient_history, public.ingredient_activities to authenticated;

create policy ingredients_owner on public.ingredients for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ingredient_history_owner on public.ingredient_history for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ingredient_activities_owner on public.ingredient_activities for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

commit;
