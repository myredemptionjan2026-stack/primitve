-- Primitive MVP schema for Supabase (Postgres)
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Projects: containers for integration explorations
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Systems: external APIs (e.g. CorrigoPro, Salesforce)
create table if not exists public.systems (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text not null,
  auth_type text not null check (auth_type in ('apiKey', 'bearer')),
  docs_url text,
  created_at timestamptz default now()
);

-- Scenarios: CTA + CTS pair (one use case)
create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  cta_system_id uuid references public.systems(id),
  cts_system_id uuid references public.systems(id),
  created_at timestamptz default now()
);

-- Field mappings: source → target for a scenario
create table if not exists public.field_mappings (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  source_path text not null,
  target_path text not null,
  transform_notes text,
  created_at timestamptz default now()
);

-- Optional: store discovered endpoint/field metadata per system (for discovery layer)
create table if not exists public.endpoints (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems(id) on delete cascade,
  method text not null check (method in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  path text not null,
  summary text,
  request_schema jsonb,
  response_schema jsonb,
  created_at timestamptz default now(),
  unique(system_id, method, path)
);

-- Enable RLS (Row Level Security) - allow all for MVP; tighten later with auth
alter table public.projects enable row level security;
alter table public.systems enable row level security;
alter table public.scenarios enable row level security;
alter table public.field_mappings enable row level security;
alter table public.endpoints enable row level security;

-- Policies: allow anonymous read/write for MVP (no auth yet)
create policy "Allow all on projects" on public.projects for all using (true) with check (true);
create policy "Allow all on systems" on public.systems for all using (true) with check (true);
create policy "Allow all on scenarios" on public.scenarios for all using (true) with check (true);
create policy "Allow all on field_mappings" on public.field_mappings for all using (true) with check (true);
create policy "Allow all on endpoints" on public.endpoints for all using (true) with check (true);
