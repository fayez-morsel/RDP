-- Player progression is changed exclusively through the RPCs below. Browser clients only receive SELECT access.
create schema if not exists security;

-- Replace broad owner-write policies with read-only access. Profile/privacy edits are handled by a validated server action.
drop policy if exists "own rows" on public.player_progression; drop policy if exists "own rows" on public.player_attributes; drop policy if exists "own rows" on public.player_skills; drop policy if exists "own rows" on public.player_achievements; drop policy if exists "own rows" on public.player_inventory; drop policy if exists "own rows" on public.player_loadouts; drop policy if exists "own rows" on public.activity_events; drop policy if exists "own rows" on public.player_preferences;
create policy "read own progression" on public.player_progression for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own attributes" on public.player_attributes for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own skills" on public.player_skills for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own achievements" on public.player_achievements for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own inventory" on public.player_inventory for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own loadout" on public.player_loadouts for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own activity" on public.activity_events for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own preferences" on public.player_preferences for select to authenticated using ((select auth.uid()) = user_id);

create or replace function security.require_authenticated_user() returns uuid language plpgsql stable security definer set search_path = '' as $$ declare v_user uuid := auth.uid(); begin if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if; return v_user; end; $$;

create or replace function public.complete_quest(p_quest_id uuid, p_idempotency_key text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := security.require_authenticated_user(); v_quest public.quests%rowtype; v_progression public.player_progression%rowtype; v_event_id uuid; v_new_xp bigint; v_level integer;
begin
 if char_length(trim(p_idempotency_key)) < 12 then raise exception 'Invalid idempotency key'; end if;
 select * into v_quest from public.quests where id = p_quest_id and user_id = v_user for update; if not found then raise exception 'Quest not found'; end if;
 if exists(select 1 from public.activity_events where user_id=v_user and idempotency_key=p_idempotency_key) then return jsonb_build_object('duplicate',true); end if;
 if v_quest.status = 'completed' then raise exception 'Quest already completed'; end if;
 update public.quests set status='completed',progress=100,completed_at=now() where id=v_quest.id;
 select * into v_progression from public.player_progression where user_id=v_user for update; if not found then raise exception 'Player progression not initialized'; end if;
 v_new_xp := v_progression.xp + v_quest.xp_reward; v_level := greatest(1, floor(sqrt(v_new_xp::numeric / 500))::integer + 1);
 update public.player_progression set xp=v_new_xp, coins=coins+v_quest.coin_reward, level=v_level, next_level_xp=((v_level::bigint)^2*500) where user_id=v_user;
 insert into public.activity_events(user_id,type,source_id,route,metadata,idempotency_key) values(v_user,'quest_completed',v_quest.id::text,'/quests',jsonb_build_object('xp',v_quest.xp_reward,'coins',v_quest.coin_reward),p_idempotency_key) returning id into v_event_id;
 insert into public.notifications(user_id,event_id,kind,title,message,route,metadata) values(v_user,v_event_id,'xp','Quest complete',format('+%s XP secured.',v_quest.xp_reward),'/quests',jsonb_build_object('amount',v_quest.xp_reward));
 return jsonb_build_object('duplicate',false,'eventId',v_event_id,'xp',v_quest.xp_reward,'coins',v_quest.coin_reward,'level',v_level);
end; $$;

create or replace function public.complete_habit_occurrence(p_habit_id uuid, p_occurred_on date, p_idempotency_key text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := security.require_authenticated_user(); v_habit public.habits%rowtype; v_occurrence public.habit_occurrences%rowtype; v_event_id uuid;
begin
 if char_length(trim(p_idempotency_key)) < 12 then raise exception 'Invalid idempotency key'; end if;
 select * into v_habit from public.habits where id=p_habit_id and user_id=v_user and active for update; if not found then raise exception 'Habit not found'; end if;
 insert into public.habit_occurrences(habit_id,user_id,occurred_on,progress,status,completed_at,rewarded_at) values(v_habit.id,v_user,p_occurred_on,100,'Completed',now(),now()) on conflict(habit_id,occurred_on) do nothing returning * into v_occurrence;
 if not found then return jsonb_build_object('duplicate',true); end if;
 update public.player_progression set xp=xp+v_habit.xp_reward where user_id=v_user;
 insert into public.activity_events(user_id,type,source_id,route,metadata,idempotency_key) values(v_user,'habit_completed',v_habit.id::text,'/habits',jsonb_build_object('xp',v_habit.xp_reward,'occurredOn',p_occurred_on),p_idempotency_key) returning id into v_event_id;
 insert into public.notifications(user_id,event_id,kind,title,message,route,metadata) values(v_user,v_event_id,'xp','Habit complete',format('+%s XP secured.',v_habit.xp_reward),'/habits',jsonb_build_object('amount',v_habit.xp_reward));
 return jsonb_build_object('duplicate',false,'eventId',v_event_id,'xp',v_habit.xp_reward);
end; $$;

create or replace function public.claim_achievement_reward(p_achievement_id uuid, p_idempotency_key text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := security.require_authenticated_user(); v_achievement public.player_achievements%rowtype; v_score integer; v_event_id uuid;
begin
 if char_length(trim(p_idempotency_key)) < 12 then raise exception 'Invalid idempotency key'; end if;
 select pa.* into v_achievement from public.player_achievements pa where pa.id=p_achievement_id and pa.user_id=v_user for update; if not found or v_achievement.unlocked_at is null then raise exception 'Achievement is not unlocked'; end if;
 if v_achievement.claimed_at is not null then return jsonb_build_object('duplicate',true); end if;
 select score into v_score from public.achievement_definitions where id=v_achievement.achievement_id; update public.player_achievements set claimed_at=now() where id=v_achievement.id;
 update public.player_progression set coins=coins+coalesce(v_score,0) where user_id=v_user;
 insert into public.activity_events(user_id,type,source_id,route,metadata,idempotency_key) values(v_user,'reward_claimed',v_achievement.id::text,'/achievements',jsonb_build_object('coins',coalesce(v_score,0)),p_idempotency_key) returning id into v_event_id;
 insert into public.notifications(user_id,event_id,kind,title,message,route,metadata) values(v_user,v_event_id,'reward','Achievement reward claimed',format('+%s coins secured.',coalesce(v_score,0)),'/inventory',jsonb_build_object('coins',coalesce(v_score,0)));
 return jsonb_build_object('duplicate',false,'eventId',v_event_id,'coins',coalesce(v_score,0));
end; $$;

create or replace function public.equip_owned_item(p_player_item_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := security.require_authenticated_user(); v_item public.player_inventory%rowtype; v_kind text;
begin
 select pi.*, d.kind into v_item, v_kind from public.player_inventory pi join public.item_definitions d on d.id=pi.item_id where pi.id=p_player_item_id and pi.user_id=v_user and pi.quantity>0 for update; if not found then raise exception 'Owned item not found'; end if;
 update public.player_inventory pi set equipped=false from public.item_definitions d where pi.item_id=d.id and pi.user_id=v_user and d.kind=v_kind;
 update public.player_inventory set equipped=true where id=v_item.id; return jsonb_build_object('itemId',v_item.id,'equipped',true);
end; $$;

create or replace function public.allocate_attribute_points(p_attribute_id uuid, p_points integer, p_idempotency_key text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := security.require_authenticated_user(); v_points integer;
begin
 if p_points < 1 or p_points > 20 or char_length(trim(p_idempotency_key)) < 12 then raise exception 'Invalid allocation'; end if;
 select attribute_points into v_points from public.player_progression where user_id=v_user for update; if not found or v_points < p_points then raise exception 'Insufficient attribute points'; end if;
 if not exists(select 1 from public.player_attributes where id=p_attribute_id and user_id=v_user for update) then raise exception 'Attribute not found'; end if;
 if exists(select 1 from public.activity_events where user_id=v_user and idempotency_key=p_idempotency_key) then return jsonb_build_object('duplicate',true); end if;
 update public.player_progression set attribute_points=attribute_points-p_points where user_id=v_user; update public.player_attributes set value=value+p_points where id=p_attribute_id and user_id=v_user;
 insert into public.activity_events(user_id,type,source_id,route,metadata,idempotency_key) values(v_user,'attribute_milestone',p_attribute_id::text,'/profile',jsonb_build_object('points',p_points),p_idempotency_key);
 return jsonb_build_object('duplicate',false,'points',p_points);
end; $$;

revoke all on function public.complete_quest(uuid,text) from public, anon; revoke all on function public.complete_habit_occurrence(uuid,date,text) from public, anon; revoke all on function public.claim_achievement_reward(uuid,text) from public, anon; revoke all on function public.equip_owned_item(uuid) from public, anon; revoke all on function public.allocate_attribute_points(uuid,integer,text) from public, anon;
grant execute on function public.complete_quest(uuid,text), public.complete_habit_occurrence(uuid,date,text), public.claim_achievement_reward(uuid,text), public.equip_owned_item(uuid), public.allocate_attribute_points(uuid,integer,text) to authenticated;

-- Onboarding is idempotent and never accepts a user id from the client.
create or replace function public.initialize_player(p_display_name text, p_username text, p_title text default 'Awakened Developer') returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := security.require_authenticated_user(); v_profile public.profiles%rowtype; v_attribute text;
begin
 if char_length(trim(p_display_name)) not between 1 and 80 then raise exception 'Invalid display name'; end if;
 if trim(p_username) !~ '^[a-zA-Z0-9_-]{3,32}$' then raise exception 'Invalid username'; end if;
 select * into v_profile from public.profiles where user_id=v_user for update;
 if found then return jsonb_build_object('created',false,'onboardingComplete',v_profile.onboarding_completed_at is not null); end if;
 insert into public.profiles(user_id,display_name,username,title,onboarding_completed_at) values(v_user,trim(p_display_name),lower(trim(p_username)),coalesce(nullif(trim(p_title),''),'Awakened Developer'),now());
 insert into public.player_progression(user_id) values(v_user);
 foreach v_attribute in array array['strength','intelligence','discipline','creativity','focus','communication'] loop insert into public.player_attributes(user_id,attribute_key) values(v_user,v_attribute); end loop;
 insert into public.player_preferences(user_id) values(v_user); insert into public.player_loadouts(user_id) values(v_user);
 return jsonb_build_object('created',true,'onboardingComplete',true);
exception when unique_violation then raise exception 'Username is already in use' using errcode='23505';
end; $$;
revoke all on function public.initialize_player(text,text,text) from public, anon; grant execute on function public.initialize_player(text,text,text) to authenticated;
