# Primitive

**Discover. Test. Document.** — An AI-powered workspace for integration discovery, scenario modeling (CTA/CTS), live testing, and handover-ready specs.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** (Postgres)
- **Tailwind CSS**
- **Gemini** (AI: use-case parsing, mapping suggestions, response interpretation)
- **Vercel** (deploy)

## Setup

1. **Clone and install**

   ```bash
   git clone <your-repo-url> primitive && cd primitive
   npm install
   ```

2. **Supabase**

   - Create a project at [supabase.com](https://supabase.com).
   - In **SQL Editor**, run the full contents of `supabase/schema.sql` (includes `constraints` table for feasibility verdicts).
   - Copy **Project URL** and **anon public** key from Settings → API.

3. **Environment**

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local`:

   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
   - `GEMINI_API_KEY` — for AI features (use-case parsing, mapping suggestions, response interpretation)

4. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## When you reopen (Supabase MCP)

If the **constraints** table is missing in your Supabase project (e.g. you applied an older schema), run the migration when Supabase MCP is available. See **[REOPEN.md](./REOPEN.md)** for exact steps so the agent can run the migration via MCP.

## Deploy (Vercel)

- Connect your GitHub repo to Vercel.
- Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.
- Deploy.

## Features

| Area | What’s included |
|------|------------------|
| **Dashboard** | List projects; “New Integration Exploration” creates a project. |
| **Project** | Systems list + add; Scenarios list + add (with optional CTA/CTS); “Describe your integration (AI)” → parse use case and pre-fill scenario; Generate spec (editable Markdown, Copy, Download). |
| **System** | Paste sample JSON → Save & extract fields; **Test endpoint** (method, path, API key/bearer, Send); **Simulate** (no credentials). |
| **Scenario** | Pick CTA/CTS systems; field mapping table; **Suggest mappings (AI)**; Save mappings; **Feasibility verdict**; **Constraints** (add/list); link to spec. |
| **Spec** | Generated from project + systems + scenarios + mappings; editable textarea before Copy/Download. |

Full technical details, API list, and reopen/MCP instructions: **[DOCUMENTATION.md](./DOCUMENTATION.md)**.
