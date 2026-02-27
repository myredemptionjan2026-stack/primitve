# Primitive

**Discover. Test. Document.** — An AI-powered workspace for integration discovery, scenario modeling (CTA/CTS), and handover-ready specs.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** (Postgres)
- **Tailwind CSS**
- **Vercel** (deploy)

## Setup

1. **Clone and install**

   ```bash
   git clone <your-repo-url> primitive && cd primitive
   npm install
   ```

2. **Supabase**

   - Create a project at [supabase.com](https://supabase.com).
   - In **SQL Editor**, run the contents of `supabase/schema.sql`.
   - Copy **Project URL** and **anon public** key from Settings → API.

3. **Environment**

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and set:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY` (optional until you add AI features)

4. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

- Connect your GitHub repo to Vercel.
- Add the same env vars in Vercel project settings.
- Deploy.

## MVP scope

- Projects & systems CRUD
- Scenarios (CTA/CTS) creation
- Field mapping and spec generation (coming next)
- AI use-case parsing and discovery (coming next)
