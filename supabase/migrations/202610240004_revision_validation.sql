-- Reject null or negative versions without modifying existing data.
begin;
create or replace function public.save_fridge_snapshot(expected_revision bigint, snapshot jsonb)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare owner uuid := auth.uid(); current_revision bigint; field text;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if expected_revision is null or expected_revision < 0 then raise exception 'invalid_revision'; end if;
  foreach field in array array['ingredients','history','activities','recipes'] loop
    if jsonb_typeof(snapshot->field) is distinct from 'array' then raise exception 'invalid_snapshot'; end if;
    if jsonb_array_length(snapshot->field) > 10000 then raise exception 'snapshot_limit'; end if;
  end loop;
  insert into public.user_data_versions(user_id) values(owner) on conflict do nothing;
  select revision into current_revision from public.user_data_versions where user_id=owner for update;
  if current_revision <> expected_revision then raise exception 'revision_conflict'; end if;

  insert into public.ingredients(id,user_id,name,category,expiry_date,payload,created_at,updated_at)
  select (x->>'id')::uuid,owner,x->>'name',x->>'category',nullif(x->>'date','')::date,x,(x->>'createdAt')::timestamptz,(x->>'updatedAt')::timestamptz
  from jsonb_array_elements(snapshot->'ingredients') x
  on conflict(user_id,id) do update set name=excluded.name,category=excluded.category,expiry_date=excluded.expiry_date,payload=excluded.payload,updated_at=excluded.updated_at;
  delete from public.ingredients where user_id=owner and id not in (select (x->>'id')::uuid from jsonb_array_elements(snapshot->'ingredients') x);

  insert into public.ingredient_history(id,user_id,action,recorded_at,payload)
  select (x->>'id')::uuid,owner,x->>'action',(x->>'recordedAt')::timestamptz,x from jsonb_array_elements(snapshot->'history') x
  on conflict(user_id,id) do update set action=excluded.action,recorded_at=excluded.recorded_at,payload=excluded.payload;
  delete from public.ingredient_history where user_id=owner and id not in (select (x->>'id')::uuid from jsonb_array_elements(snapshot->'history') x);

  insert into public.ingredient_activities(id,user_id,item_id,type,recorded_at,payload)
  select x->>'id',owner,(x->>'itemId')::uuid,x->>'type',(x->>'at')::timestamptz,x from jsonb_array_elements(snapshot->'activities') x
  on conflict(user_id,id) do update set payload=excluded.payload,recorded_at=excluded.recorded_at;
  delete from public.ingredient_activities where user_id=owner and id not in (select x->>'id' from jsonb_array_elements(snapshot->'activities') x);

  insert into public.saved_recipes(user_id,id,payload)
  select owner,x->>'id',x from jsonb_array_elements(snapshot->'recipes') x
  on conflict(user_id,id) do update set payload=excluded.payload;
  delete from public.saved_recipes where user_id=owner and id not in (select x->>'id' from jsonb_array_elements(snapshot->'recipes') x);

  update public.user_data_versions set revision=revision+1 where user_id=owner returning revision into current_revision;
  return current_revision;
end;
$$;
commit;
