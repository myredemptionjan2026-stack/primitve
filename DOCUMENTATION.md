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
| **AI** | **Gemini** via `lib/gemini.ts` (use-case parsing, mapping suggestions, response interpretation) |

Alternatives considered: Python (FastAPI) + React, Rails/Django monolith. We chose Next.js + Supabase for a single TypeScript codebase, good DX, and simple deploy on Vercel.

---

## 3. What was built

### 3.1 Repository structure (source files)

```
primitive/
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── parse-usecase/route.ts    # POST: description + systemNames → suggestedName, cta/cts names, oneLiner
│   │   │   ├── suggest-mappings/route.ts # POST: sourceFields, targetFields → suggestions, unmappedRequired, typeMismatches
│   │   │   └── interpret-response/route.ts # POST: statusCode, responseBody → plain-language summary
│   │   ├── projects/
│   │   │   ├── route.ts                  # GET (list), POST (create)
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts              # GET, PATCH, DELETE project
│   │   │   │   ├── scenarios/route.ts    # GET (list), POST (create) scenarios
│   │   │   │   └── spec/route.ts         # GET: generate Markdown spec
│   │   │   └── ...
│   │   ├── systems/
│   │   │   ├── route.ts                  # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       ├── route.ts              # GET, PATCH, DELETE system
│   │   │       ├── discovery/route.ts    # GET/POST discovery sample (JSON → fields)
│   │   │       ├── test/route.ts         # POST: live request (method, path, apiKey/bearer) → status, body, AI summary
│   │   │       └── simulate/route.ts     # POST: simulate against discovery sample (no credentials)
│   │   └── scenarios/
│   │       └── [id]/
│   │           ├── route.ts              # GET, PATCH scenario
│   │           ├── mappings/route.ts     # GET, POST field mappings
│   │           ├── constraints/route.ts  # GET list, POST add constraint
│   │           └── verdict/route.ts      # GET feasibility verdict + evidence
│   ├── scenarios/[id]/page.tsx           # Scenario: CTA/CTS, mappings, Suggest mappings (AI), verdict, constraints
│   ├── systems/[id]/page.tsx             # System: sample JSON, discovered fields, Test endpoint, Simulate
│   ├── projects/[id]/page.tsx            # Project: systems, scenarios, Describe use case (AI), Generate spec (editable)
│   ├── page.tsx                          # Dashboard
│   ├── layout.tsx, globals.css
│   └── ...
├── lib/
│   ├── gemini.ts                         # generateText, parseJsonFromText (Gemini REST)
│   ├── fieldExtractor.ts                 # extractFields(sample) for discovery
│   ├── supabase.ts                       # Supabase client (lazy init)
│   └── types.ts                          # Project, System, Scenario, FieldMapping, Endpoint
├── supabase/schema.sql                   # projects, systems, scenarios, field_mappings, endpoints, constraints + RLS
├── REOPEN.md                             # When you reopen: run constraints migration via Supabase MCP
├── .env.local.example, README.md, ...
└── ...
```

### 3.2 Database schema (Supabase/Postgres)

Defined in `supabase/schema.sql`:

- **projects** — id, name, description, created_at  
- **systems** — id, name, base_url, auth_type (apiKey | bearer), docs_url, created_at  
- **scenarios** — id, project_id, name, description, cta_system_id, cts_system_id, created_at  
- **field_mappings** — id, scenario_id, source_path, target_path, transform_notes, created_at  
- **endpoints** — id, system_id, method, path, summary, request_schema, response_schema, created_at (discovery sample stored with method/path `__primitive_discovery__`)  
- **constraints** — id, scenario_id, description, category, source (docs | live | inference), created_at — used for feasibility verdict

RLS is enabled on all tables; MVP uses permissive policies (allow all). Auth is implemented but disabled.

### 3.3 API routes

| Route | Methods | Purpose |
|-------|---------|--------|
| `/api/projects` | GET, POST | List projects, create project |
| `/api/projects/[id]` | GET, PATCH, DELETE | Get/update/delete project |
| `/api/projects/[id]/scenarios` | GET, POST | List scenarios, create scenario (body: project_id, name, description?, cta_system_id?, cts_system_id?) |
| `/api/projects/[id]/spec` | GET | Generate Markdown spec from project + systems + scenarios + mappings |
| `/api/systems` | GET, POST | List systems, create system |
| `/api/systems/[id]` | GET, PATCH, DELETE | Get/update/delete system |
| `/api/systems/[id]/discovery` | GET, POST | Get/post discovery sample (JSON); POST stores in endpoints as __primitive_discovery__ |
| `/api/systems/[id]/test` | POST | Live request: method, path, apiKey?, bearerToken?, requestBody? → statusCode, responseBody, summary (Gemini) |
| `/api/systems/[id]/simulate` | POST | Simulate using stored discovery sample (no credentials) |
| `/api/scenarios/[id]` | GET, PATCH | Get/update scenario (cta_system_id, cts_system_id) |
| `/api/scenarios/[id]/mappings` | GET, POST | List/add field mappings |
| `/api/scenarios/[id]/constraints` | GET, POST | List constraints; POST body: description, source (docs\|live\|inference), category? |
| `/api/scenarios/[id]/verdict` | GET | Feasibility verdict (Feasible / Partially Feasible / Not Feasible), confidence, evidence counts |
| `/api/ai/parse-usecase` | POST | Body: description, systemNames? → suggestedName, ctaSystemName, ctsSystemName, keyEntities, oneLiner |
| `/api/ai/suggest-mappings` | POST | Body: sourceFields[], targetFields[] → suggestions[], unmappedRequired?, typeMismatches? |
| `/api/ai/interpret-response` | POST | Body: statusCode, responseBody → plain-language summary |

### 3.4 Pages and UI

- **Dashboard (`/`)**  
  Lists projects. Button “New Integration Exploration” opens a form to create a project (name, optional description). Each project links to `/projects/[id]`.

- **Project detail (`/projects/[id])**  
  Shows project name and description. Two sections:
  - **Systems:** List of systems; “Add system” form (name, base URL, auth type, optional docs URL).
  - **Scenarios:** List of scenarios; “New scenario” form (name, optional description). Placeholder note: “CTA/CTS — mapping UI coming next”.

Design: dark theme (slate/teal), card-based layout. Tailwind: `primitive.*` colors.  
**Full feature list (Describe use case AI, Test/Simulate, Suggest mappings, Verdict, Constraints, editable spec):** see [README](./README.md#features).

### 3.5 Supabase client

- **File:** `lib/supabase.ts`  
- **Behaviour:** Client is created lazily (on first use) so the app builds without `NEXT_PUBLIC_SUPABASE_*` env vars. At runtime, missing vars cause a clear error on first API call.

### 3.6 Gemini (AI)

- **File:** `lib/gemini.ts` — `generateText(prompt)` and `parseJsonFromText(text)` using Gemini REST API; requires `GEMINI_API_KEY`.
- Used by: parse-usecase, suggest-mappings, interpret-response, and inline in the test route for response summary.

---

## 4. Setup and run

### 4.1 Prerequisites

- Node.js (v18+)
- npm (or yarn/pnpm)
- A Supabase project
- **GEMINI_API_KEY** for AI features (use-case parsing, mapping suggestions, response interpretation)

### 4.2 Install and env

```bash
cd primitive
npm install
cp .env.local.example .env.local
```

Edit `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (Settings → API).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key.
- `GEMINI_API_KEY` — required for AI features (parse use case, suggest mappings, interpret response).

### 4.3 Apply database schema

**Option A — Supabase Dashboard**  
1. Open your Supabase project.  
2. SQL Editor → New query.  
3. Paste the full contents of `supabase/schema.sql` (includes `constraints` table).  
4. Run.

**Option B — Supabase MCP (when you reopen)**  
When Supabase MCP is connected, run the **constraints** migration so the scenario verdict and Constraints UI work. See **[REOPEN.md](./REOPEN.md)** for:
- Using `list_projects` to get the Primitive project ref.
- Using `apply_migration` or `execute_sql` with the SQL in REOPEN.md (creates `constraints` table + RLS policy).

If the rest of the schema is already applied, only the constraints migration is needed. If starting from scratch, run the full `supabase/schema.sql` first (Dashboard or MCP), then no further migration is needed unless the constraints table was added later.

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
- Add environment variables in Vercel project settings: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.
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

## 6. Supabase MCP and when you reopen

### 6.1 MCP tools

- **list_projects** — list projects in the connected account; note the **project ref** for Primitive (e.g. `xfxdolkihcqaarpamxsp`).  
- **execute_sql** — run SQL (e.g. the constraints migration).  
- **apply_migration** — if available, run a named migration with a DDL query.

### 6.2 When you reopen with Supabase MCP

1. **Run the constraints migration** so the scenario page Constraints section and Feasibility verdict work.  
2. Follow **[REOPEN.md](./REOPEN.md)**: it contains the exact SQL and steps (list_projects → execute_sql or apply_migration).  
3. Ensure the MCP is configured with the Supabase account that owns the Primitive project.

### 6.3 Which project to use

- Run `list_projects` and identify the Primitive project (name/ref).  
- Use that project ref for `execute_sql` or `apply_migration`.  
- If the wrong account is connected, create an Access Token in the correct Supabase account and reconfigure the MCP in Cursor.

---

## 7. Roadmap

### Done (MVP)

- [x] Next.js 14, Tailwind, Supabase client  
- [x] Projects, systems, scenarios CRUD (with CTA/CTS system IDs)  
- [x] Dashboard, project detail, system detail, scenario detail pages  
- [x] Discovery: paste sample JSON → extract fields; store in endpoints  
- [x] Field mapping table; save mappings  
- [x] Spec generation (Markdown); editable textarea; Copy / Download  
- [x] AI: Gemini — parse use case, suggest mappings, interpret response  
- [x] Describe your integration (AI) → pre-fill scenario + CTA/CTS  
- [x] Live test (method, path, API key/bearer) + AI summary  
- [x] Simulate (no credentials)  
- [x] Constraints (add/list); feasibility verdict (Feasible / Partially / Not Feasible)  
- [x] Full schema in `supabase/schema.sql` (including `constraints`)

### When you reopen (Supabase MCP)

- [ ] **Run constraints migration** if the `constraints` table is not yet in the DB — see [REOPEN.md](./REOPEN.md). The agent can run this via Supabase MCP when it is available.

### Optional (from PRD / later)

- [ ] OpenAPI import (file/URL → endpoints per system; endpoint list on system page)  
- [ ] Field bookmarks (mark fields as key ID / business-critical)  
- [ ] Re-enable auth (AuthShell in layout; sign-in required)  
- [ ] Wizard: multi-step “New Integration Exploration” (Describe → Configure → Discover → Map → Test → Spec)  
- [ ] Full OAuth2, PDF/Confluence export, shareable spec links, Zapier/Make templates

---

## 8. References

- **PRD:** e.g. `Primitive-PRD-v2.md` — user journeys, F1–F6, data model, UX, NFRs.
- **REOPEN.md** — When you reopen: run the constraints migration via Supabase MCP (exact SQL and steps).
- **This doc** — `DOCUMENTATION.md`: product vision, stack, what was built, APIs, pages, setup, deploy, MCP, roadmap.

---

*Last updated: full MVP (discovery, mappings, spec, AI/Gemini, test, simulate, constraints, verdict); env uses GEMINI_API_KEY; REOPEN.md added for MCP migration.*
