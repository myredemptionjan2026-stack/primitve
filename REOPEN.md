# When you reopen — run the constraints migration (Supabase MCP)

Use this when you reopen the project **with Supabase MCP connected** so the agent can apply the migration directly.

## Goal

Ensure the **`constraints`** table (and its RLS policy) exists in the Supabase project. The scenario page uses it for feasibility verdicts and the “Constraints” section.

**Optional:** If you need **field bookmarks** (Key ID / Business critical on system discovery), also run the **field_flags** migration below.

## Option A — Supabase MCP (preferred when available)

1. **List projects** to get the correct Supabase project ref:
   - Server: **`user-Supabase`** (as shown in Cursor MCP).
   - Tool: `list_projects` (no args).
   - Note the **project ref** for the Primitive project (e.g. `xfxdolkihcqaarpamxsp` for project **primitve**).

2. **Run the migration** with `execute_sql`:
   - **`execute_sql`** — pass:
     - `project_id`: the project ref from step 1 (e.g. `xfxdolkihcqaarpamxsp`)
     - `query`: the SQL below (parameter name is **query**, not `sql`)

3. **SQL to run**

```sql
-- Constraints table + RLS (for feasibility verdict)
create table if not exists public.constraints (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  description text not null,
  category text,
  source text not null check (source in ('docs', 'live', 'inference')),
  created_at timestamptz default now()
);

alter table public.constraints enable row level security;

-- Drop first if re-running to avoid duplicate policy error
drop policy if exists "Allow all on constraints" on public.constraints;
create policy "Allow all on constraints" on public.constraints for all using (true) with check (true);
```

## Option B — Supabase Dashboard (no MCP)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the SQL above.
3. Run.

## After migration

- Scenario page **Constraints** section and **Feasibility verdict** will work against the database.
- No app code changes required.

## Env check

Ensure `.env.local` has:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` (for AI features)

See `.env.local.example` and **DOCUMENTATION.md** for full setup.

---

### Optional: field_flags table (for field bookmarks)

If the **field_flags** table is missing (e.g. you only ran the constraints migration earlier), run this via MCP `execute_sql` with the same `project_id`:

```sql
create table if not exists public.field_flags (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.systems(id) on delete cascade,
  field_path text not null,
  flag text not null check (flag in ('key_id', 'business_critical')),
  created_at timestamptz default now(),
  unique(system_id, field_path)
);
alter table public.field_flags enable row level security;
create policy "Allow all on field_flags" on public.field_flags for all using (true) with check (true);
```
