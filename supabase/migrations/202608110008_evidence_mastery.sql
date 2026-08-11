-- Part 11: Practice XP remains in player_skills. Readiness and evidence-backed
-- mastery live separately and never mutate existing earned progression.

create table public.skill_mastery_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skill_definitions(id) on delete restrict,
  practice_xp bigint not null default 0 check (practice_xp >= 0),
  legacy_level integer not null default 1 check (legacy_level >= 1),
  readiness smallint not null default 50 check (readiness between 0 and 100),
  mastery_tier text not null default 'unverified' check (mastery_tier in ('unverified','foundation','demonstrated','mastered')),
  description text not null default '',
  personal_reason text not null default '',
  portfolio_visibility text not null default 'private' check (portfolio_visibility in ('private','token','published-profile')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,skill_id)
);

insert into public.skill_mastery_profiles(user_id,skill_id,practice_xp,legacy_level)
select user_id,skill_id,xp,level from public.player_skills
on conflict(user_id,skill_id) do update set
  practice_xp=greatest(public.skill_mastery_profiles.practice_xp,excluded.practice_xp),
  legacy_level=greatest(public.skill_mastery_profiles.legacy_level,excluded.legacy_level);

create table public.mastery_criteria (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.skill_mastery_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  criterion_type text not null check (criterion_type in ('project','measurable-standard','sustained-practice','self-trial','mentor-confirmation')),
  description text not null default '',
  required boolean not null default true,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique(profile_id,position)
);

create table public.skill_evidence (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.skill_mastery_profiles(id) on delete cascade,
  criterion_id uuid references public.mastery_criteria(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('reflection','url','file','result','before-after','quest','campaign-milestone','achievement','certificate')),
  title text not null check (char_length(trim(title)) between 1 and 240),
  metadata jsonb not null default '{}'::jsonb,
  visibility text not null default 'private' check (visibility in ('private','mentor','portfolio')),
  authoritative_event_id uuid references public.activity_events(id) on delete restrict,
  verified_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evidence_attachments (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.skill_evidence(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf','text/plain')),
  size_bytes integer not null check (size_bytes between 1 and 8388608),
  created_at timestamptz not null default now()
);

create table public.mastery_trials (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.skill_mastery_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  objective text not null,
  success_criteria text not null,
  allowed_evidence_types text[] not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mastery_attempts (
  id uuid primary key default gen_random_uuid(),
  trial_id uuid not null references public.mastery_trials(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','submitted','passed','not-yet')),
  evidence_ids uuid[] not null default '{}',
  reflection text not null default '',
  result text,
  settlement_key text,
  submitted_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,settlement_key)
);

create table public.mentor_invitations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.skill_mastery_profiles(id) on delete cascade,
  invited_email text not null,
  token_hash text not null unique,
  evidence_ids uuid[] not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.mentor_reviews (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.mentor_invitations(id) on delete restrict,
  mentor_user_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('confirm','needs-more-evidence')),
  response text not null default '',
  created_at timestamptz not null default now(),
  unique(invitation_id,mentor_user_id)
);

create table public.portfolio_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.skill_mastery_profiles(id) on delete cascade,
  evidence_id uuid not null references public.skill_evidence(id) on delete restrict,
  title text not null,
  position integer not null default 0 check (position >= 0),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id,evidence_id)
);

create table public.portfolio_share_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.skill_practice_awards (
  event_id uuid not null references public.activity_events(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skill_definitions(id) on delete restrict,
  practice_xp integer not null check (practice_xp > 0),
  created_at timestamptz not null default now(),
  primary key(event_id,skill_id)
);

create index mastery_profiles_user on public.skill_mastery_profiles(user_id,mastery_tier);
create index mastery_criteria_profile on public.mastery_criteria(profile_id,position);
create index skill_evidence_profile on public.skill_evidence(profile_id,created_at desc) where deleted_at is null;
create index evidence_attachments_owner on public.evidence_attachments(user_id,evidence_id);
create index mastery_attempts_trial on public.mastery_attempts(trial_id,created_at desc);
create index mentor_invitations_owner on public.mentor_invitations(user_id,expires_at desc);
create index portfolio_entries_profile on public.portfolio_entries(profile_id,position) where published;
create index skill_practice_awards_user on public.skill_practice_awards(user_id,skill_id,created_at desc);

create trigger mastery_profiles_updated_at before update on public.skill_mastery_profiles for each row execute function public.set_updated_at();
create trigger skill_evidence_updated_at before update on public.skill_evidence for each row execute function public.set_updated_at();
create trigger mastery_trials_updated_at before update on public.mastery_trials for each row execute function public.set_updated_at();

create or replace function public.validate_mastery_child_owner()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_owner uuid;
begin
  if tg_table_name='mastery_criteria' then select user_id into v_owner from public.skill_mastery_profiles where id=new.profile_id;
  elsif tg_table_name='skill_evidence' then select user_id into v_owner from public.skill_mastery_profiles where id=new.profile_id;
  elsif tg_table_name='mastery_trials' then select user_id into v_owner from public.skill_mastery_profiles where id=new.profile_id;
  elsif tg_table_name='evidence_attachments' then select user_id into v_owner from public.skill_evidence where id=new.evidence_id and deleted_at is null;
  elsif tg_table_name='portfolio_entries' then select user_id into v_owner from public.skill_mastery_profiles where id=new.profile_id;
    if not exists(select 1 from public.skill_evidence where id=new.evidence_id and profile_id=new.profile_id and user_id=new.user_id and deleted_at is null) then raise exception 'Evidence ownership mismatch' using errcode='42501'; end if;
  end if;
  if v_owner is null or v_owner<>new.user_id then raise exception 'Mastery ownership mismatch' using errcode='42501'; end if;
  if tg_table_name='evidence_attachments' and new.storage_path not like new.user_id::text||'/%' then raise exception 'Invalid private storage path' using errcode='42501'; end if;
  return new;
end; $$;

create trigger validate_mastery_criteria_owner before insert or update on public.mastery_criteria for each row execute function public.validate_mastery_child_owner();
create trigger validate_skill_evidence_owner before insert or update on public.skill_evidence for each row execute function public.validate_mastery_child_owner();
create trigger validate_evidence_attachment_owner before insert or update on public.evidence_attachments for each row execute function public.validate_mastery_child_owner();
create trigger validate_mastery_trial_owner before insert or update on public.mastery_trials for each row execute function public.validate_mastery_child_owner();
create trigger validate_portfolio_entry_owner before insert or update on public.portfolio_entries for each row execute function public.validate_mastery_child_owner();

create or replace function public.prepare_skill_evidence()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  new.title := left(trim(regexp_replace(new.title,'[[:cntrl:]]','','g')),240);
  new.metadata := new.metadata - 'signedUrl' - 'accessToken' - 'storagePath';
  if new.authoritative_event_id is null then new.verified_at := null;
  elsif not exists(select 1 from public.activity_events event join public.skill_mastery_profiles profile on profile.id=new.profile_id where event.id=new.authoritative_event_id and event.user_id=new.user_id and ((event.type='attribute_milestone' and event.metadata->>'skillId'=profile.skill_id::text) or (event.type='quest_completed' and exists(select 1 from public.campaign_quests link join public.campaigns campaign on campaign.id=link.campaign_id where link.quest_id::text=event.source_id and link.user_id=new.user_id and profile.skill_id=any(campaign.linked_skill_ids))))) then raise exception 'Authoritative event is not valid evidence for this skill' using errcode='42501';
  else new.verified_at := coalesce(new.verified_at,now()); end if;
  return new;
end; $$;
create trigger prepare_private_skill_evidence before insert or update on public.skill_evidence for each row execute function public.prepare_skill_evidence();

create or replace function public.award_linked_skill_practice()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_skill uuid; v_xp integer;
begin
  if new.type<>'quest_completed' then return new; end if;
  select greatest(1,least(1000,quest.xp_reward)) into v_xp from public.quests quest where quest.id::text=new.source_id and quest.user_id=new.user_id;
  if v_xp is null then return new; end if;
  for v_skill in select distinct unnest(campaign.linked_skill_ids) from public.campaign_quests link join public.campaigns campaign on campaign.id=link.campaign_id where link.quest_id::text=new.source_id and link.user_id=new.user_id loop
    insert into public.skill_practice_awards(event_id,user_id,skill_id,practice_xp) values(new.id,new.user_id,v_skill,v_xp) on conflict do nothing;
    if found then
      insert into public.player_skills(user_id,skill_id,xp,level) values(new.user_id,v_skill,v_xp,1)
      on conflict(user_id,skill_id) do update set xp=public.player_skills.xp+excluded.xp,level=greatest(public.player_skills.level,floor((public.player_skills.xp+excluded.xp)/500)::integer+1);
      insert into public.skill_mastery_profiles(user_id,skill_id,practice_xp,legacy_level) select user_id,skill_id,xp,level from public.player_skills where user_id=new.user_id and skill_id=v_skill
      on conflict(user_id,skill_id) do update set practice_xp=greatest(public.skill_mastery_profiles.practice_xp,excluded.practice_xp),legacy_level=greatest(public.skill_mastery_profiles.legacy_level,excluded.legacy_level);
    end if;
  end loop;
  return new;
end; $$;
create trigger award_campaign_skill_practice after insert on public.activity_events for each row execute function public.award_linked_skill_practice();

alter table public.skill_mastery_profiles enable row level security;
alter table public.mastery_criteria enable row level security;
alter table public.skill_evidence enable row level security;
alter table public.evidence_attachments enable row level security;
alter table public.mastery_trials enable row level security;
alter table public.mastery_attempts enable row level security;
alter table public.mentor_invitations enable row level security;
alter table public.mentor_reviews enable row level security;
alter table public.portfolio_entries enable row level security;
alter table public.portfolio_share_tokens enable row level security;
alter table public.skill_practice_awards enable row level security;

create policy "own mastery profiles" on public.skill_mastery_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy "update own readiness profile" on public.skill_mastery_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "own mastery criteria" on public.mastery_criteria for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "own skill evidence" on public.skill_evidence for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "own evidence attachments" on public.evidence_attachments for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "own mastery trials" on public.mastery_trials for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "own mastery attempts" on public.mastery_attempts for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "own mentor invitations" on public.mentor_invitations for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "mentor reads own reviews" on public.mentor_reviews for select to authenticated using ((select auth.uid())=mentor_user_id);
create policy "owner reads mentor reviews" on public.mentor_reviews for select to authenticated using (exists(select 1 from public.mentor_invitations invitation where invitation.id=invitation_id and invitation.user_id=(select auth.uid())));
create policy "own portfolio entries" on public.portfolio_entries for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "own portfolio tokens" on public.portfolio_share_tokens for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "read own practice awards" on public.skill_practice_awards for select to authenticated using ((select auth.uid())=user_id);

revoke update on public.skill_mastery_profiles from authenticated;
grant update(readiness,description,personal_reason,portfolio_visibility) on public.skill_mastery_profiles to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('skill-evidence','skill-evidence',false,8388608,array['image/jpeg','image/png','image/webp','application/pdf','text/plain'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "evidence owners read" on storage.objects for select to authenticated using (bucket_id='skill-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "evidence owners upload" on storage.objects for insert to authenticated with check (bucket_id='skill-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "evidence owners delete" on storage.objects for delete to authenticated using (bucket_id='skill-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text);

create or replace function public.settle_mastery_trial(p_attempt_id uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=security.require_authenticated_user(); v_attempt public.mastery_attempts%rowtype; v_trial public.mastery_trials%rowtype; v_profile public.skill_mastery_profiles%rowtype; v_next text;
begin
  if char_length(trim(p_idempotency_key))<12 then raise exception 'Invalid idempotency key'; end if;
  select * into v_attempt from public.mastery_attempts where id=p_attempt_id and user_id=v_user for update;
  if not found then raise exception 'Attempt not found'; end if;
  if v_attempt.settled_at is not null then return jsonb_build_object('duplicate',true,'tier',(select mastery_tier from public.skill_mastery_profiles profile join public.mastery_trials trial on trial.profile_id=profile.id where trial.id=v_attempt.trial_id)); end if;
  if v_attempt.status<>'submitted' then raise exception 'Attempt is not submitted'; end if;
  select * into v_trial from public.mastery_trials where id=v_attempt.trial_id and user_id=v_user and active for update;
  select * into v_profile from public.skill_mastery_profiles where id=v_trial.profile_id and user_id=v_user for update;
  if exists(select 1 from public.mastery_criteria criterion where criterion.profile_id=v_profile.id and criterion.required and not exists(select 1 from public.skill_evidence evidence where evidence.criterion_id=criterion.id and evidence.id=any(v_attempt.evidence_ids) and evidence.user_id=v_user and evidence.verified_at is not null and evidence.deleted_at is null)) then raise exception 'Required criteria need verified evidence'; end if;
  if not exists(select 1 from public.mastery_criteria where profile_id=v_profile.id and required) then raise exception 'No mastery criteria configured'; end if;
  v_next:=case v_profile.mastery_tier when 'unverified' then 'foundation' when 'foundation' then 'demonstrated' else 'mastered' end;
  update public.skill_mastery_profiles set mastery_tier=v_next where id=v_profile.id;
  update public.mastery_attempts set status='passed',result='criteria-verified',settlement_key=p_idempotency_key,settled_at=now() where id=v_attempt.id;
  insert into public.notifications(user_id,kind,title,message,route,metadata) values(v_user,'mastery','Mastery trial settled',format('Evidence verified. %s mastery recorded.',v_next),'/skills',jsonb_build_object('profileId',v_profile.id,'tier',v_next));
  return jsonb_build_object('duplicate',false,'tier',v_next);
end; $$;

create or replace function public.create_portfolio_share(p_evidence_ids uuid[],p_expires_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=security.require_authenticated_user(); v_token text:=encode(gen_random_bytes(32),'hex');
begin
  if cardinality(p_evidence_ids)<1 or exists(select 1 from unnest(p_evidence_ids) id where not exists(select 1 from public.skill_evidence evidence where evidence.id=id and evidence.user_id=v_user and evidence.visibility='portfolio' and evidence.deleted_at is null)) then raise exception 'Invalid portfolio evidence selection'; end if;
  insert into public.portfolio_share_tokens(user_id,token_hash,expires_at) values(v_user,encode(digest(v_token,'sha256'),'hex'),p_expires_at);
  update public.portfolio_entries set published=true where user_id=v_user and evidence_id=any(p_evidence_ids);
  return jsonb_build_object('token',v_token,'expiresAt',p_expires_at);
end; $$;

create or replace function public.resolve_portfolio_share(p_token text)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('title',entry.title,'evidenceType',evidence.evidence_type,'evidenceTitle',evidence.title,'masteryTier',profile.mastery_tier) order by entry.position),'[]'::jsonb)
  from public.portfolio_share_tokens share
  join public.portfolio_entries entry on entry.user_id=share.user_id and entry.published
  join public.skill_evidence evidence on evidence.id=entry.evidence_id and evidence.visibility='portfolio' and evidence.deleted_at is null
  join public.skill_mastery_profiles profile on profile.id=entry.profile_id
  where share.token_hash=encode(digest(p_token,'sha256'),'hex') and share.revoked_at is null and (share.expires_at is null or share.expires_at>now());
$$;

create or replace function public.create_mentor_invitation(p_profile_id uuid,p_invited_email text,p_evidence_ids uuid[],p_expires_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=security.require_authenticated_user(); v_token text:=encode(gen_random_bytes(32),'hex');
begin
  if p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'Invalid invitation expiry'; end if;
  if p_invited_email!~*'^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Invalid mentor email'; end if;
  if not exists(select 1 from public.skill_mastery_profiles where id=p_profile_id and user_id=v_user) or cardinality(p_evidence_ids)<1 or exists(select 1 from unnest(p_evidence_ids) id where not exists(select 1 from public.skill_evidence where skill_evidence.id=id and profile_id=p_profile_id and user_id=v_user and deleted_at is null)) then raise exception 'Invalid shared evidence selection'; end if;
  insert into public.mentor_invitations(user_id,profile_id,invited_email,token_hash,evidence_ids,expires_at) values(v_user,p_profile_id,lower(trim(p_invited_email)),encode(digest(v_token,'sha256'),'hex'),p_evidence_ids,p_expires_at);
  return jsonb_build_object('token',v_token,'expiresAt',p_expires_at);
end; $$;

create or replace function public.resolve_mentor_invitation(p_token text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_user uuid:=security.require_authenticated_user(); v_email text:=lower(coalesce(auth.jwt()->>'email','')); v_invitation public.mentor_invitations%rowtype;
begin
  select * into v_invitation from public.mentor_invitations where token_hash=encode(digest(p_token,'sha256'),'hex') and revoked_at is null and expires_at>now();
  if not found or v_email<>v_invitation.invited_email then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  return (select jsonb_build_object('invitationId',v_invitation.id,'skill',(select definition.name from public.skill_mastery_profiles profile join public.skill_definitions definition on definition.id=profile.skill_id where profile.id=v_invitation.profile_id),'evidence',coalesce(jsonb_agg(jsonb_build_object('id',evidence.id,'type',evidence.evidence_type,'title',evidence.title,'metadata',evidence.metadata)),'[]'::jsonb)) from public.skill_evidence evidence where evidence.id=any(v_invitation.evidence_ids) and evidence.profile_id=v_invitation.profile_id and evidence.deleted_at is null);
end; $$;

create or replace function public.submit_mentor_review(p_token text,p_decision text,p_response text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_mentor uuid:=security.require_authenticated_user(); v_email text:=lower(coalesce(auth.jwt()->>'email','')); v_invitation public.mentor_invitations%rowtype;
begin
  if p_decision not in ('confirm','needs-more-evidence') then raise exception 'Invalid decision'; end if;
  select * into v_invitation from public.mentor_invitations where token_hash=encode(digest(p_token,'sha256'),'hex') and revoked_at is null and expires_at>now() for update;
  if not found or v_email<>v_invitation.invited_email then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  insert into public.mentor_reviews(invitation_id,mentor_user_id,decision,response) values(v_invitation.id,v_mentor,p_decision,left(trim(p_response),1000)) on conflict(invitation_id,mentor_user_id) do update set decision=excluded.decision,response=excluded.response;
  if p_decision='confirm' then update public.skill_evidence set verified_at=coalesce(verified_at,now()),visibility='mentor' where id=any(v_invitation.evidence_ids) and profile_id=v_invitation.profile_id and deleted_at is null; end if;
  return jsonb_build_object('recorded',true,'decision',p_decision);
end; $$;

create or replace function public.revoke_portfolio_share(p_share_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=security.require_authenticated_user(); v_count integer;
begin update public.portfolio_share_tokens set revoked_at=coalesce(revoked_at,now()) where id=p_share_id and user_id=v_user; get diagnostics v_count=row_count; return v_count=1; end; $$;

revoke all on function public.validate_mastery_child_owner(),public.prepare_skill_evidence(),public.award_linked_skill_practice() from public,anon,authenticated;
revoke all on function public.settle_mastery_trial(uuid,text),public.create_portfolio_share(uuid[],timestamptz),public.resolve_portfolio_share(text),public.create_mentor_invitation(uuid,text,uuid[],timestamptz),public.resolve_mentor_invitation(text),public.submit_mentor_review(text,text,text),public.revoke_portfolio_share(uuid) from public,anon;
grant execute on function public.settle_mastery_trial(uuid,text),public.create_portfolio_share(uuid[],timestamptz),public.create_mentor_invitation(uuid,text,uuid[],timestamptz),public.resolve_mentor_invitation(text),public.submit_mentor_review(text,text,text),public.revoke_portfolio_share(uuid) to authenticated;
grant execute on function public.resolve_portfolio_share(text) to anon,authenticated;
