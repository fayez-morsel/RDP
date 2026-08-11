-- Part 12: optional proposal-only Copilot. No function in this migration updates progression ledgers.
create table public.ai_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  consented_at timestamptz,
  retention_enabled boolean not null default false,
  memory_enabled boolean not null default false,
  analytics_sharing boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check(mode in ('plan','brief','rescue','review','ask')),
  status text not null default 'active' check(status in ('active','closed','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check(role in ('user','assistant','system')),
  content text not null check(char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table public.ai_proposals (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.ai_threads(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check(mode in ('plan','brief','rescue','review','ask')),
  summary text not null check(char_length(trim(summary)) between 1 and 600),
  provider text not null default 'manual-fallback',
  model text not null default 'rules-v1',
  status text not null default 'draft' check(status in ('draft','confirmed','applied','rejected','undone','failed','cancelled')),
  confirmation_key text,
  applied_records jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  applied_at timestamptz,
  unique(user_id,confirmation_key)
);

create table public.ai_proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.ai_proposals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check(operation in ('create_quest','create_campaign','rescope_quest','schedule_quest','pause_quest','reflection_question','answer')),
  title text not null check(char_length(trim(title)) between 1 and 160),
  before_value text not null default '',
  after_value text not null check(char_length(trim(after_value)) between 1 and 600),
  reason text not null check(char_length(trim(reason)) between 1 and 400),
  payload jsonb not null default '{}'::jsonb,
  reversible boolean not null default false,
  position smallint not null check(position between 0 and 7),
  created_at timestamptz not null default now(),
  unique(proposal_id,position)
);

create table public.ai_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id uuid references public.ai_proposals(id) on delete set null,
  action text not null check(action in ('generated','confirmed','applied','rejected','undone','failed','cancelled','deleted','feedback')),
  provider text,
  model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id uuid not null references public.ai_proposals(id) on delete cascade,
  rating text not null check(rating in ('helpful','not-helpful')),
  comment text check(comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique(user_id,proposal_id)
);

create index ai_threads_owner on public.ai_threads(user_id,created_at desc);
create index ai_messages_thread on public.ai_messages(thread_id,created_at);
create index ai_proposals_owner on public.ai_proposals(user_id,created_at desc);
create index ai_items_proposal on public.ai_proposal_items(proposal_id,position);
create index ai_audit_owner on public.ai_audit_events(user_id,created_at desc);

create trigger ai_preferences_updated_at before update on public.ai_preferences for each row execute function public.set_updated_at();
create trigger ai_threads_updated_at before update on public.ai_threads for each row execute function public.set_updated_at();

create or replace function public.prepare_ai_child()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_owner uuid;
begin
  if tg_table_name='ai_messages' then select user_id into v_owner from public.ai_threads where id=new.thread_id;
  elsif tg_table_name='ai_proposal_items' then select user_id into v_owner from public.ai_proposals where id=new.proposal_id;
  elsif tg_table_name='ai_feedback' then select user_id into v_owner from public.ai_proposals where id=new.proposal_id;
  end if;
  if v_owner is null or v_owner<>new.user_id then raise exception 'Copilot ownership mismatch' using errcode='42501'; end if;
  if tg_table_name='ai_messages' and not exists(select 1 from public.ai_preferences where user_id=new.user_id and retention_enabled) then raise exception 'Conversation retention is disabled' using errcode='42501'; end if;
  if tg_table_name='ai_proposal_items' and new.payload ?| array['xp','coins','rank','mastery','damage','bossDamage','inventory','achievement','completeQuest','completeHabit','verifyEvidence','leaderboardScore'] then raise exception 'Protected progression fields are forbidden' using errcode='42501'; end if;
  return new;
end; $$;
create trigger validate_ai_message before insert or update on public.ai_messages for each row execute function public.prepare_ai_child();
create trigger validate_ai_proposal_item before insert or update on public.ai_proposal_items for each row execute function public.prepare_ai_child();
create trigger validate_ai_feedback before insert or update on public.ai_feedback for each row execute function public.prepare_ai_child();

create or replace function public.sanitize_ai_audit()
returns trigger language plpgsql security definer set search_path='' as $$
begin new.metadata:=new.metadata-'prompt'-'messages'-'userContent'-'evidence'-'journal'; return new; end; $$;
create trigger sanitize_ai_audit_event before insert or update on public.ai_audit_events for each row execute function public.sanitize_ai_audit();

alter table public.ai_preferences enable row level security;
alter table public.ai_threads enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_proposals enable row level security;
alter table public.ai_proposal_items enable row level security;
alter table public.ai_audit_events enable row level security;
alter table public.ai_feedback enable row level security;
create policy "own ai preferences" on public.ai_preferences for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "own ai threads" on public.ai_threads for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "own retained ai messages" on public.ai_messages for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "own ai proposals" on public.ai_proposals for select to authenticated using((select auth.uid())=user_id);
create policy "insert own ai proposals" on public.ai_proposals for insert to authenticated with check((select auth.uid())=user_id);
create policy "own ai proposal items" on public.ai_proposal_items for select to authenticated using((select auth.uid())=user_id);
create policy "insert own ai proposal items" on public.ai_proposal_items for insert to authenticated with check((select auth.uid())=user_id);
create policy "own ai audit" on public.ai_audit_events for select to authenticated using((select auth.uid())=user_id);
create policy "own ai feedback" on public.ai_feedback for select to authenticated using((select auth.uid())=user_id);

create or replace function public.confirm_and_apply_ai_proposal(p_proposal_id uuid,p_item_ids uuid[],p_confirmation_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=security.require_authenticated_user(); v_proposal public.ai_proposals%rowtype; v_item public.ai_proposal_items%rowtype; v_record jsonb; v_records jsonb:='[]'::jsonb; v_created uuid; v_count integer:=0;
begin
  if char_length(trim(p_confirmation_key))<12 or cardinality(p_item_ids)<1 then raise exception 'Explicit confirmation and selected items are required'; end if;
  select * into v_proposal from public.ai_proposals where id=p_proposal_id and user_id=v_user for update;
  if not found then raise exception 'Proposal not found'; end if;
  if v_proposal.applied_at is not null then return jsonb_build_object('duplicate',true,'appliedCount',jsonb_array_length(v_proposal.applied_records)); end if;
  if v_proposal.status<>'draft' then raise exception 'Proposal is not applicable'; end if;
  if exists(select 1 from unnest(p_item_ids) selected where not exists(select 1 from public.ai_proposal_items item where item.id=selected and item.proposal_id=v_proposal.id and item.user_id=v_user)) then raise exception 'Invalid proposal selection' using errcode='42501'; end if;
  update public.ai_proposals set status='confirmed',confirmation_key=p_confirmation_key,confirmed_at=now() where id=v_proposal.id;
  insert into public.ai_audit_events(user_id,proposal_id,action,provider,model,metadata) values(v_user,v_proposal.id,'confirmed',v_proposal.provider,v_proposal.model,jsonb_build_object('selectedItemIds',p_item_ids));
  for v_item in select * from public.ai_proposal_items where proposal_id=v_proposal.id and id=any(p_item_ids) order by position for update loop
    v_record:=null;
    if v_item.operation='create_quest' then
      insert into public.quests(user_id,title,description,category,quest_type,difficulty,xp_reward,coin_reward,status,deadline) values(v_user,left(trim(v_item.title),160),left(trim(v_item.after_value),2000),'Planning','Side Quests','Easy',0,0,'draft',case when v_item.payload->>'deadline'~'^\d{4}-\d{2}-\d{2}' then (v_item.payload->>'deadline')::timestamptz else null end) returning id into v_created;
      v_record:=jsonb_build_object('operation','create_quest','id',v_created);
    elsif v_item.operation='create_campaign' then
      insert into public.campaigns(user_id,title,desired_outcome,life_area,status,privacy_level,weekly_capacity_minutes) values(v_user,left(trim(v_item.title),160),left(trim(v_item.after_value),1000),'Personal Growth','draft','private',greatest(15,least(10080,coalesce((v_item.payload->>'weeklyCapacityMinutes')::integer,120)))) returning id into v_created;
      v_record:=jsonb_build_object('operation','create_campaign','id',v_created);
    elsif v_item.operation='rescope_quest' then
      update public.quests set description=left(trim(v_item.after_value),2000) where id=(v_item.payload->>'targetId')::uuid and user_id=v_user and status<>'completed'; if found then v_record:=jsonb_build_object('operation','rescope_quest','id',v_item.payload->>'targetId'); end if;
    elsif v_item.operation='schedule_quest' then
      update public.quests set deadline=(v_item.payload->>'deadline')::timestamptz where id=(v_item.payload->>'targetId')::uuid and user_id=v_user and status<>'completed' and v_item.payload->>'deadline'~'^\d{4}-\d{2}-\d{2}'; if found then v_record:=jsonb_build_object('operation','schedule_quest','id',v_item.payload->>'targetId'); end if;
    elsif v_item.operation='pause_quest' then
      update public.quests set status='draft' where id=(v_item.payload->>'targetId')::uuid and user_id=v_user and status='active'; if found then v_record:=jsonb_build_object('operation','pause_quest','id',v_item.payload->>'targetId'); end if;
    else v_record:=jsonb_build_object('operation',v_item.operation,'id',v_item.id); end if;
    if v_record is not null then v_records:=v_records||jsonb_build_array(v_record); v_count:=v_count+1; end if;
  end loop;
  update public.ai_proposals set status='applied',applied_at=now(),applied_records=v_records where id=v_proposal.id;
  insert into public.ai_audit_events(user_id,proposal_id,action,provider,model,metadata) values(v_user,v_proposal.id,'applied',v_proposal.provider,v_proposal.model,jsonb_build_object('itemIds',p_item_ids,'appliedCount',v_count));
  insert into public.notifications(user_id,kind,title,message,route,metadata) values(v_user,'system','Copilot proposal applied',format('%s confirmed planning changes applied. No progression was awarded.',v_count),'/dashboard',jsonb_build_object('proposalId',v_proposal.id));
  return jsonb_build_object('duplicate',false,'appliedCount',v_count,'progressionDelta',0);
end; $$;

create or replace function public.undo_ai_proposal(p_proposal_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=security.require_authenticated_user(); v_proposal public.ai_proposals%rowtype; v_record jsonb; v_count integer:=0;
begin
  select * into v_proposal from public.ai_proposals where id=p_proposal_id and user_id=v_user for update;
  if not found or v_proposal.status<>'applied' then raise exception 'Applied proposal not found'; end if;
  for v_record in select * from jsonb_array_elements(v_proposal.applied_records) loop
    if v_record->>'operation'='create_quest' then delete from public.quests where id=(v_record->>'id')::uuid and user_id=v_user and status='draft' and progress=0; if found then v_count:=v_count+1; end if;
    elsif v_record->>'operation'='create_campaign' then delete from public.campaigns where id=(v_record->>'id')::uuid and user_id=v_user and status='draft'; if found then v_count:=v_count+1; end if;
    end if;
  end loop;
  update public.ai_proposals set status='undone' where id=v_proposal.id;
  insert into public.ai_audit_events(user_id,proposal_id,action,provider,model,metadata) values(v_user,v_proposal.id,'undone',v_proposal.provider,v_proposal.model,jsonb_build_object('removedDrafts',v_count));
  return jsonb_build_object('undone',true,'removedDrafts',v_count,'progressionDelta',0);
end; $$;

create or replace function public.delete_ai_data()
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=security.require_authenticated_user(); begin delete from public.ai_threads where user_id=v_user; delete from public.ai_proposals where user_id=v_user; delete from public.ai_audit_events where user_id=v_user; update public.ai_preferences set retention_enabled=false,memory_enabled=false where user_id=v_user; return true; end; $$;

revoke all on function public.prepare_ai_child(),public.sanitize_ai_audit() from public,anon,authenticated;
revoke all on function public.confirm_and_apply_ai_proposal(uuid,uuid[],text),public.undo_ai_proposal(uuid),public.delete_ai_data() from public,anon;
grant execute on function public.confirm_and_apply_ai_proposal(uuid,uuid[],text),public.undo_ai_proposal(uuid),public.delete_ai_data() to authenticated;
