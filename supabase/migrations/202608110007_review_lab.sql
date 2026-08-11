-- Part 10: reflective reviews, reproducible weekly snapshots, transparent insights,
-- and voluntary experiments. None of these tables or functions mutate progression.

create table public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_date date not null,
  timezone text not null,
  planned_minutes integer not null default 0 check (planned_minutes >= 0),
  actual_minutes integer not null default 0 check (actual_minutes >= 0),
  win text not null default '',
  obstacle_or_lesson text not null default '',
  tomorrow_preview jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, review_date, timezone)
);

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  range_start date not null,
  range_end date not null,
  timezone text not null,
  next_week_capacity_minutes integer check (next_week_capacity_minutes between 1 and 10080),
  top_outcomes text[] not null default '{}',
  suggestions_confirmed jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (range_end = range_start + 6),
  unique(user_id, range_start, timezone)
);

create table public.review_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_review_id uuid references public.daily_reviews(id) on delete cascade,
  weekly_review_id uuid references public.weekly_reviews(id) on delete cascade,
  source_type text not null check (source_type in ('quest','habit','campaign','milestone','note')),
  source_id text,
  action text check (action in ('confirm','carry','rescope','schedule','pause','archive')),
  planned_minutes integer check (planned_minutes >= 0),
  actual_minutes integer check (actual_minutes >= 0),
  response text not null default '',
  created_at timestamptz not null default now(),
  check ((daily_review_id is not null)::integer + (weekly_review_id is not null)::integer = 1)
);

create table public.weekly_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  range_start date not null,
  range_end date not null,
  timezone text not null,
  source_max_event_at timestamptz,
  snapshot jsonb not null,
  generated_at timestamptz not null default now(),
  check (range_end = range_start + 6),
  unique(user_id, range_start, timezone)
);

create table public.personal_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  hypothesis text not null check (char_length(trim(hypothesis)) between 1 and 500),
  behavior_change text not null check (char_length(trim(behavior_change)) between 1 and 500),
  primary_metric text not null,
  baseline_start date not null,
  baseline_end date not null,
  experiment_start date not null,
  experiment_end date not null,
  context_tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','active','stopped','completed','archived')),
  result_summary text not null default '',
  reflection text not null default '',
  stopped_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (baseline_end >= baseline_start),
  check (experiment_end >= experiment_start),
  check (experiment_start > baseline_end)
);

create table public.experiment_observations (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.personal_experiments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  observed_on date not null,
  phase text not null check (phase in ('baseline','experiment')),
  metric_value numeric not null,
  context_tags text[] not null default '{}',
  note text not null default '',
  created_at timestamptz not null default now(),
  unique(experiment_id, observed_on, phase)
);

create table public.generated_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  range_start date not null,
  range_end date not null,
  timezone text not null,
  insight_key text not null,
  statement text not null,
  sample_size integer not null check (sample_size >= 0),
  inputs jsonb not null,
  calculation text not null,
  caution text not null,
  generated_at timestamptz not null default now(),
  unique(user_id, range_start, range_end, timezone, insight_key)
);

create index daily_reviews_user_date on public.daily_reviews(user_id, review_date desc);
create index weekly_reviews_user_range on public.weekly_reviews(user_id, range_start desc);
create index weekly_snapshots_user_range on public.weekly_snapshots(user_id, range_start desc);
create index experiments_user_status on public.personal_experiments(user_id, status);
create index observations_experiment_date on public.experiment_observations(experiment_id, observed_on);
create index insights_user_range on public.generated_insights(user_id, range_start desc);

create trigger daily_reviews_updated_at before update on public.daily_reviews for each row execute function public.set_updated_at();
create trigger weekly_reviews_updated_at before update on public.weekly_reviews for each row execute function public.set_updated_at();
create trigger experiments_updated_at before update on public.personal_experiments for each row execute function public.set_updated_at();

create or replace function public.validate_review_response_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id <> security.require_authenticated_user() then
    raise exception 'Review response ownership mismatch' using errcode = '42501';
  end if;
  if new.daily_review_id is not null and not exists (
    select 1 from public.daily_reviews review where review.id=new.daily_review_id and review.user_id=new.user_id
  ) then
    raise exception 'Daily review not found' using errcode = '42501';
  end if;
  if new.weekly_review_id is not null and not exists (
    select 1 from public.weekly_reviews review where review.id=new.weekly_review_id and review.user_id=new.user_id
  ) then
    raise exception 'Weekly review not found' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger validate_review_response_relationship
before insert or update on public.review_responses
for each row execute function public.validate_review_response_owner();

alter table public.daily_reviews enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.review_responses enable row level security;
alter table public.weekly_snapshots enable row level security;
alter table public.personal_experiments enable row level security;
alter table public.experiment_observations enable row level security;
alter table public.generated_insights enable row level security;

create policy "own daily reviews" on public.daily_reviews for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "own weekly reviews" on public.weekly_reviews for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "own review responses" on public.review_responses for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "read own weekly snapshots" on public.weekly_snapshots for select to authenticated using ((select auth.uid())=user_id);
create policy "own experiments" on public.personal_experiments for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "own observations" on public.experiment_observations for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id and exists (select 1 from public.personal_experiments experiment where experiment.id=experiment_id and experiment.user_id=(select auth.uid())));
create policy "read own insights" on public.generated_insights for select to authenticated using ((select auth.uid())=user_id);

create or replace function public.generate_weekly_snapshot(p_range_start date, p_timezone text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := security.require_authenticated_user();
  v_range_end date := p_range_start + 6;
  v_start timestamptz;
  v_end timestamptz;
  v_snapshot jsonb;
  v_max_event timestamptz;
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'Unknown timezone';
  end if;
  v_start := p_range_start::timestamp at time zone p_timezone;
  v_end := (v_range_end + 1)::timestamp at time zone p_timezone;
  select max(occurred_at) into v_max_event from public.activity_events where user_id=v_user and occurred_at>=v_start and occurred_at<v_end;
  select jsonb_build_object(
    'rangeStart', p_range_start,
    'rangeEnd', v_range_end,
    'timezone', p_timezone,
    'generatedFromEventsThrough', v_max_event,
    'questsCompleted', count(*) filter (where type='quest_completed'),
    'habitsCompleted', count(*) filter (where type='habit_completed'),
    'practiceEvents', count(*) filter (where type='attribute_milestone'),
    'xpAwarded', coalesce(sum((metadata->>'amount')::numeric) filter (where type='xp_awarded'),0),
    'eventCount', count(*)
  ) into v_snapshot
  from public.activity_events
  where user_id=v_user and occurred_at>=v_start and occurred_at<v_end;
  insert into public.weekly_snapshots(user_id,range_start,range_end,timezone,source_max_event_at,snapshot)
  values(v_user,p_range_start,v_range_end,p_timezone,v_max_event,v_snapshot)
  on conflict(user_id,range_start,timezone) do update set source_max_event_at=excluded.source_max_event_at,snapshot=excluded.snapshot,generated_at=now();
  return v_snapshot;
end;
$$;

revoke all on function public.generate_weekly_snapshot(date,text) from public, anon;
grant execute on function public.generate_weekly_snapshot(date,text) to authenticated;
revoke all on function public.validate_review_response_owner() from public, anon, authenticated;
