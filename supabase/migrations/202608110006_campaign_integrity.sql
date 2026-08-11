-- Part 9 integrity: ownership, acyclic quest chains, authoritative locks,
-- soft-history protection, and automatic boss contribution settlement.

create or replace function public.validate_campaign_child()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.campaigns where id = new.campaign_id;
  if v_owner is null or v_owner <> new.user_id then
    raise exception 'Campaign ownership mismatch' using errcode = '42501';
  end if;
  if tg_table_name = 'campaign_quests' and not exists (
    select 1 from public.quests where id = new.quest_id and user_id = new.user_id
  ) then
    raise exception 'Quest ownership mismatch' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger validate_campaign_milestone_owner
before insert or update on public.campaign_milestones
for each row execute function public.validate_campaign_child();
create trigger validate_campaign_quest_owner
before insert or update on public.campaign_quests
for each row execute function public.validate_campaign_child();
create trigger validate_campaign_obstacle_owner
before insert or update on public.campaign_obstacles
for each row execute function public.validate_campaign_child();
create trigger validate_campaign_boss_owner
before insert or update on public.boss_encounters
for each row execute function public.validate_campaign_child();

create or replace function public.validate_quest_dependency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := security.require_authenticated_user();
begin
  if new.user_id <> v_owner then
    raise exception 'Dependency ownership mismatch' using errcode = '42501';
  end if;
  if not exists (select 1 from public.quests where id = new.quest_id and user_id = v_owner)
    or not exists (select 1 from public.quests where id = new.prerequisite_quest_id and user_id = v_owner) then
    raise exception 'Dependency quests must belong to the current player' using errcode = '42501';
  end if;
  if new.quest_id = new.prerequisite_quest_id then
    raise exception 'A quest cannot depend on itself' using errcode = '23514';
  end if;
  if exists (
    with recursive prerequisite_path(id) as (
      select new.prerequisite_quest_id
      union
      select dependency.prerequisite_quest_id
      from public.quest_dependencies dependency
      join prerequisite_path path on dependency.quest_id = path.id
      where dependency.id <> new.id and dependency.user_id = v_owner
    )
    select 1 from prerequisite_path where id = new.quest_id
  ) then
    raise exception 'Circular quest dependency rejected' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger validate_quest_dependency_graph
before insert or update on public.quest_dependencies
for each row execute function public.validate_quest_dependency();

create or replace function public.protect_campaign_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.campaign_quests link
    join public.quests quest on quest.id = link.quest_id
    where link.campaign_id = old.id and quest.status = 'completed'
  ) or exists (
    select 1 from public.boss_encounters boss
    join public.boss_contributions contribution on contribution.boss_id = boss.id
    where boss.campaign_id = old.id
  ) then
    raise exception 'Campaign has progression history; archive it instead of deleting it' using errcode = '23503';
  end if;
  return old;
end;
$$;

create trigger protect_campaign_progression_history
before delete on public.campaigns
for each row execute function public.protect_campaign_history();

create or replace function public.complete_quest(p_quest_id uuid, p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := security.require_authenticated_user();
  v_quest public.quests%rowtype;
  v_progression public.player_progression%rowtype;
  v_event_id uuid;
  v_new_xp bigint;
  v_level integer;
  v_boss record;
  v_boss_result jsonb;
begin
  if char_length(trim(p_idempotency_key)) < 12 then raise exception 'Invalid idempotency key'; end if;
  select * into v_quest from public.quests where id = p_quest_id and user_id = v_user for update;
  if not found then raise exception 'Quest not found'; end if;
  if exists(select 1 from public.activity_events where user_id=v_user and idempotency_key=p_idempotency_key) then
    return jsonb_build_object('duplicate',true);
  end if;
  if v_quest.status = 'completed' then raise exception 'Quest already completed'; end if;
  if exists (
    select 1
    from public.quest_dependencies dependency
    join public.quests prerequisite on prerequisite.id = dependency.prerequisite_quest_id
    where dependency.quest_id = v_quest.id
      and dependency.user_id = v_user
      and prerequisite.status <> 'completed'
  ) then
    raise exception 'Quest is locked by an incomplete prerequisite' using errcode = '23514';
  end if;

  update public.quests set status='completed',progress=100,completed_at=now() where id=v_quest.id;
  select * into v_progression from public.player_progression where user_id=v_user for update;
  if not found then raise exception 'Player progression not initialized'; end if;
  v_new_xp := v_progression.xp + v_quest.xp_reward;
  v_level := greatest(1, floor(sqrt(v_new_xp::numeric / 500))::integer + 1);
  update public.player_progression set xp=v_new_xp,coins=coins+v_quest.coin_reward,level=v_level,next_level_xp=((v_level::bigint)^2*500) where user_id=v_user;
  insert into public.activity_events(user_id,type,source_id,route,metadata,idempotency_key)
  values(v_user,'quest_completed',v_quest.id::text,'/quests',jsonb_build_object('xp',v_quest.xp_reward,'coins',v_quest.coin_reward),p_idempotency_key)
  returning id into v_event_id;
  insert into public.notifications(user_id,event_id,kind,title,message,route,metadata)
  values(v_user,v_event_id,'xp','Quest complete',format('+%s XP secured.',v_quest.xp_reward),'/quests',jsonb_build_object('amount',v_quest.xp_reward));

  for v_boss in
    select boss.id
    from public.campaign_quests link
    join public.boss_encounters boss on boss.campaign_id = link.campaign_id
    where link.quest_id = v_quest.id and link.user_id = v_user and boss.status = 'active'
  loop
    v_boss_result := public.contribute_boss(v_boss.id, v_event_id, least(1000, greatest(1, v_quest.xp_reward)));
    if coalesce((v_boss_result->>'defeated')::boolean, false) then
      perform public.settle_boss_reward(v_boss.id);
    end if;
  end loop;

  return jsonb_build_object('duplicate',false,'eventId',v_event_id,'xp',v_quest.xp_reward,'coins',v_quest.coin_reward,'level',v_level);
end;
$$;

revoke all on function public.validate_campaign_child(), public.validate_quest_dependency(), public.protect_campaign_history() from public, anon, authenticated;
