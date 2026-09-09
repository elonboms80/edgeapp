-- Production data model proposal for EDGE Hockey Performance Coach
create extension if not exists "pgcrypto";

create table players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  birth_date date,
  gender text,
  competition_level text,
  primary_position text,
  created_at timestamptz default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade not null,
  session_date date not null,
  session_type text check (session_type in ('practice','game')) not null,
  opponent text,
  duration_minutes int,
  source text,
  created_at timestamptz default now()
);

create table session_metrics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  metric_key text not null,
  metric_label text not null,
  value numeric not null,
  unit text,
  extraction_confidence numeric,
  verified boolean default false,
  unique(session_id, metric_key)
);

create table session_images (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  storage_path text not null,
  created_at timestamptz default now()
);

create table analysis_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  summary text not null,
  strengths jsonb default '[]'::jsonb,
  focus_areas jsonb default '[]'::jsonb,
  model_version text,
  created_at timestamptz default now()
);

create table development_plans (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade not null,
  start_date date not null,
  end_date date,
  primary_focus text,
  drills jsonb default '[]'::jsonb,
  rationale text,
  created_at timestamptz default now()
);

-- Benchmark provenance: never expose an unexplained percentile.
create table benchmark_cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gender text,
  min_age int,
  max_age int,
  competition_level text,
  position text,
  session_type text,
  sample_size int,
  source_name text not null,
  source_url text,
  effective_date date,
  notes text,
  created_at timestamptz default now()
);

create table benchmark_values (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references benchmark_cohorts(id) on delete cascade not null,
  metric_key text not null,
  percentile int check (percentile between 1 and 99) not null,
  value numeric not null,
  unit text,
  unique(cohort_id, metric_key, percentile)
);

-- Before production: enable RLS on all user-owned tables and restrict rows through
-- players.owner_id = auth.uid(). Keep session screenshots in a private Storage bucket.
