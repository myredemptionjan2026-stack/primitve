# Primitive — Project documentation

This document records what we did so far: product vision, decisions, what was built, and how to run and extend it.

---

## 1. Product vision and naming

### What Primitive is

**Primitive** is an AI-powered workspace for **semi-technical teams** (implementation leads, solution consultants, customer admins) to:

- **Discover** what APIs can do (fields, types, enums, IDs) without living in Postman or raw docs.
- **Test** integration scenarios (optionally: live endpoint calls or schema-based simulation).
- **Document** and generate handover-ready integration specs for engineers.

Tagline: **Discover. Test. Document. One integration workspace.**

### Core concepts (from PRD)

| Term | Meaning |
|------|--------|
| **System** | An external platform with APIs (e.g. CorrigoPro, Salesforce). |
| **Endpoint** | A specific API operation: method + path + known payloads. |
| **CTA** | Call-to-Action — source-side trigger: “When X happens in System 1…” |
| **CTS** | Call-to-Serve — target-side action: “…do Y in System 2.” |
| **Scenario** | A CTA + CTS pair with field mappings and business rules. |
| **Spec** | The final integration document for handover to engineering. |

### Naming choice

- We considered: Herald, Envoy, Courier, Primitive, etc.
- **Primitive** was chosen: “the first layer of any integration” — foundational, pre–Postman-level, high-level.

### Scope (MVP vs later)

- **In scope for MVP:** Integration feasibility discovery, API/payload exploration, CTA/CTS scenario modeling, live testing (API key + bearer), doc-based simulation, spec generation (Markdown).
- **Out of scope for MVP:** Production iPaaS, full OAuth2 flows, Postman replacement for power users, multi-user collaboration, Zapier/Make integration (later phase).

### Prioritisation

- **First:** Use-case–driven discovery and documentation (customer use case → discovered APIs → field mappings → spec).
- **Later:** Full testing/simulation platform; Zapier/Make integration.

---

## 2. Tech stack

| Layer | Choice |
|-------|--------|
| **Frontend + backend** | Next.js 14 (App Router, TypeScript) |
| **Database** | Supabase (Postgres) |
| **Styling** | Tailwind CSS |
| **Hosting** | Vercel |
| **AI (planned)** | OpenAI or similar, via server-side API routes |

Alternatives considered: Python (FastAPI) + React, Rails/Django monolith. We chose Next.js + Supabase for a single TypeScript codebase, good DX, and simple deploy on Vercel.

---

## 3. What was built

### 3.1 Repository structure (source files)

```
primitive/
├── app/
│   ├── api/
│   │   ├── projects/
│   │   │   ├── route.ts              # GET (list), POST (create)
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts          # GET, PATCH, DELETE project
│   │   │   │   └── scenarios/
│   │   │   │       └── route.ts      # GET (list), POST (create) scenarios
│   │   │   └── spec/
│   │   │       └── route.ts           # GET (generate Markdown spec)
│   │   └── systems/
│   │       ├── route.ts              # GET (list), POST (create)
│   │       └── [id]/
│   │           ├── route.ts          # GET, PATCH, DELETE system
│   │           └── discovery/
│   │               └── route.ts      # GET/POST discovery sample (JSON → fields)
│   ├── scenarios/
│   │   └── [id]/
│   │       └── page.tsx              # Scenario detail (CTA/CTS + field mappings)
│   ├── systems/
│   │   └── [id]/page.tsx             # System detail (paste JSON, discovered fields)
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx                      # Dashboard
│   └── projects/
│       └── [id]/page.tsx             # Project detail (systems + scenarios)
├── lib/
│   ├── fieldExtractor.ts             # extractFields(sample) for discovery
│   ├── supabase.ts                   # Supabase client (lazy init for build)
│   └── types.ts                      # Project, System, Scenario, FieldMapping, Endpoint
├── supabase/
│   └── schema.sql                    # Full MVP schema (tables + RLS)
├── .env.local.example
├── .gitignore
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── README.md
├── tailwind.config.ts
└── tsconfig.json
```

### 3.2 Database schema (Supabase/Postgres)

Defined in `supabase/schema.sql`:

- **projects** — id, name, description, created_at  
- **systems** — id, name, base_url, auth_type (apiKey | bearer), docs_url, created_at  
- **scenarios** — id, project_id, name, description, cta_system_id, cts_system_id, created_at  
- **field_mappings** — id, scenario_id, source_path, target_path, transform_notes, created_at  
- **endpoints** — id, system_id, method, path, summary, request_schema, response_schema, created_at (for discovery layer)

RLS is enabled on all tables; MVP uses permissive policies (allow all). No auth yet.

### 3.3 API routes

| Route | Methods | Purpose |
|-------|---------|--------|
| `/api/projects` | GET, POST | List projects, create project |
| `/api/projects/[id]` | GET, PATCH, DELETE | Get/update/delete project |
| `/api/projects/[id]/scenarios` | GET, POST | List scenarios for project, create scenario |
| `/api/systems` | GET, POST | List systems, create system |
| `/api/systems/[id]` | GET, PATCH, DELETE | Get/update/delete system |

All use the Supabase client from `lib/supabase.ts`.

### 3.4 Pages and UI

- **Dashboard (`/`)**  
  Lists projects. Button “New Integration Exploration” opens a form to create a project (name, optional description). Each project links to `/projects/[id]`.

- **Project detail (`/projects/[id])**  
  Shows project name and description. Two sections:
  - **Systems:** List of systems; “Add system” form (name, base URL, auth type, optional docs URL).
  - **Scenarios:** List of scenarios; “New scenario” form (name, optional description). Placeholder note: “CTA/CTS — mapping UI coming next”.

Design: calm, dark theme (slate/teal), card-based layout, progressive disclosure. Tailwind theme uses `primitive.*` colors (bg, surface, accent, etc.).

### 3.5 Supabase client

- **File:** `lib/supabase.ts`  
- **Behaviour:** Client is created lazily (on first use) so the app **builds** without `NEXT_PUBLIC_SUPABASE_*` env vars. At runtime, if vars are missing, the first API call throws a clear error.

---

## 4. Setup and run

### 4.1 Prerequisites

- Node.js (v18+)
- npm (or yarn/pnpm)
- A Supabase project (see below)
- (Optional) OpenAI API key for future AI features

### 4.2 Install and env

```bash
cd primitive
npm install
cp .env.local.example .env.local
```

Edit `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (Settings → API).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key.
- `OPENAI_API_KEY` — optional until AI features are added.

### 4.3 Apply database schema

**Option A — Supabase Dashboard**  
1. Open your Supabase project.  
2. SQL Editor → New query.  
3. Paste the full contents of `supabase/schema.sql`.  
4. Run.

**Option B — Supabase MCP (Cursor)**  
1. Ensure the Supabase MCP is connected to the **Supabase account** that owns the Primitive project (not a different account).  
2. Use MCP tool `list_projects` to get the correct `project_id`.  
3. Use MCP tool `apply_migration` with:
   - `project_id`: the Primitive project ref
   - `name`: e.g. `primitive_mvp_schema`
   - `query`: contents of `supabase/schema.sql`

**Important:** Confirm which project is being used before running any migration. The MCP only sees projects in the account it is configured with.

### 4.4 Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the dashboard and be able to create projects, open a project, add systems and scenarios.

### 4.5 Build

```bash
npm run build
```

Build succeeds even without `.env.local` (Supabase client is lazy). For production, env vars must be set where the app runs.

---

## 5. Deploy (Vercel + GitHub)

### 5.1 GitHub

- Repo used: empty GitHub repo (user created it).
- Code lives in the workspace (e.g. `Dump Postman`); user pushes to the repo (or moves the folder into the repo and pushes).
- **SSH for this repo only:** See **§5.4 SSH setup for this repo** below so this project uses a dedicated key and does not affect other projects pointing to different repos.

### 5.2 Vercel

- Connect the GitHub repo to Vercel (Import project).
- Add environment variables in Vercel project settings: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and optionally `OPENAI_API_KEY`.
- Deploy; Vercel will build and serve the Next.js app.

### 5.3 PAT (GitHub, for MCP / read-only)

- For Cursor/GitHub MCP we recommended a **fine-grained** Personal Access Token, not “all permissions”.
- Repository access: only the `primitive` repo (or selected repos).
- Permissions: Repository contents — Read; Metadata — Read (if needed). No write or admin.

### 5.4 SSH setup for this repo only

Use a **separate SSH key** so only this project uses it; other projects keep using their existing keys.

**Step 1 — Generate a new SSH key**

```bash
ssh-keygen -t ed25519 -C "primitive-project" -f ~/.ssh/id_ed25519_primitive
```

- When prompted for a passphrase, set one (recommended) or press Enter for none.

**Step 2 — Add the key to the SSH agent**

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_primitive
```

If you get a permission error:

```bash
chmod 600 ~/.ssh/id_ed25519_primitive
ssh-add ~/.ssh/id_ed25519_primitive
```

**Step 3 — Add the public key to GitHub**

```bash
cat ~/.ssh/id_ed25519_primitive.pub
```

- Copy the full line (starts with `ssh-ed25519`).
- GitHub → **Settings** → **SSH and GPG keys** → **New SSH key**.
- Title: e.g. `Primitive key`. Paste the key → **Add SSH key**.

**Step 4 — Configure SSH to use this key only for Primitive**

Edit your SSH config:

```bash
nano ~/.ssh/config
```

Add this block (at the end):

```
Host github-primitive
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_primitive
  IdentitiesOnly yes
```

Save and exit (Ctrl+O, Enter, Ctrl+X in nano).

**Step 5 — Point this repo at the SSH alias**

In the **Primitive** project folder (e.g. `Dump Postman` or your `primitive` clone):

```bash
cd "/Users/inbaraj/Desktop/Dump Postman"

# See current remote
git remote -v

# Set origin to use the Primitive-only SSH host (replace YOUR_USERNAME and YOUR_REPO with your GitHub username and repo name)
git remote set-url origin git@github-primitive:YOUR_USERNAME/YOUR_REPO.git

# Verify
git remote -v
```

Example: if your repo is `https://github.com/inbaraj/primitive`, use:

```bash
git remote set-url origin git@github-primitive:inbaraj/primitive.git
```

**Step 6 — Test**

```bash
ssh -T git@github-primitive
```

- If asked "Are you sure you want to continue connecting?", type `yes`.
- You should see: `Hi USERNAME! You've successfully authenticated...`

Then push as usual:

```bash
git add .
git commit -m "Your message"
git push
```

Only this repo uses `github-primitive` and `id_ed25519_primitive`; other repos keep using their existing remotes and keys.

---

## 6. Supabase MCP and project selection

### 6.1 What we did

- Checked that a **Supabase MCP** is available in Cursor (server name e.g. `user-Supabase`).
- Discovered MCP tools: `list_projects`, `get_project`, `execute_sql`, `apply_migration`, etc.
- **Migration:** Use `apply_migration` for DDL (create table, alter, policies). Use `execute_sql` for read-only or one-off data queries.

### 6.2 Which project to use

- When we ran `list_projects`, only **one** project was visible: **parablr** (ref `vvlwyhqzdexvbpmmexbb`) in the connected account.
- User said they want to use a **different** Supabase project in a **different Supabase account** for Primitive.
- **Decision:** Do **not** run the migration until the correct project is available. The MCP can only see projects in the account whose token is configured.

### 6.3 How to use the other account

1. Log in to the Supabase account that has (or will have) the Primitive project.
2. Create an **Access Token** (Dashboard → Account → Access Tokens).
3. In Cursor, reconfigure the **Supabase MCP** to use this account’s token (replace the existing token in MCP settings).
4. After reconnecting, run `list_projects` again; the Primitive project should appear.
5. Then run the migration with `apply_migration` for that project only.

---

## 7. Roadmap (from discussions)

### Phase 1 (current)

- [x] Next.js app scaffold, Tailwind, Supabase client  
- [x] Projects and systems CRUD  
- [x] Scenarios CRUD (name, description; CTA/CTS IDs)  
- [x] Dashboard and project detail pages  
- [x] Apply schema to Supabase project **primitve** (ref `xfxdolkihcqaarpamxsp`) via MCP

### Phase 2 — Discovery and mapping

- [ ] System detail page: paste sample JSON → AI extracts fields, types, enums.  
- [ ] Scenario builder: “Describe use case” → AI suggests CTA/CTS; field mapping UI (source ↔ target).  
- [ ] Persist field mappings; optional endpoint/field metadata in `endpoints` table.

### Phase 3 — Spec and AI

- [ ] Spec generation: from project + systems + scenarios + mappings → Markdown (and copy/download).  
- [ ] AI use-case parsing (natural language → CTA/CTS).  
- [ ] AI field-discovery from JSON/docs; mapping suggestions.

### Phase 4 — Testing (later)

- [ ] Optional “Try endpoint once” (user pastes API key/token; single request; show response + AI summary).  
- [ ] Simulation mode (schema-only validation when no credentials).

### Later

- [ ] Full OAuth2, PDF/Confluence export, sequence diagrams, shareable spec links.  
- [ ] Team collaboration, org-level system library, Zapier/Make template generation.

---

## 8. References

- **PRD:** User has a detailed PRD (e.g. `Primitive-PRD-v2.md`) with user journeys, feature list (F1–F6), data model, UX principles, NFRs, risks, and roadmap.
- **This doc:** `DOCUMENTATION.md` — single place for “what we did so far” and how to run and extend Primitive.

---

*Last updated: reflects work through initial scaffold, API routes, dashboard, project detail page, Supabase schema file, MCP discovery, and project-selection decision.*
