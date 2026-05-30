# FoodRisk Compass — Project Context

## What this is
FoodRisk Compass is a compliance intelligence platform for food manufacturers.
Requirements-first architecture. Built with Next.js 15, Supabase, Tailwind CSS v4.

**Tagline:** Find Requirements. Understand Impact. Prove Compliance.

---

## Tech stack
- **Frontend:** Next.js 15 App Router, TypeScript, Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS, pgvector)
- **AI:** Claude API + OpenAI API (Sprint 4+)
- **Hosting:** Vercel (project: `compass`, team: `dale-cosgroves-projects`)
- **Supabase project:** `zpjctspjgxhuxylpfvpu` (region: eu-central-1)

---

## Repository
- **Repo:** `cosgrodev/Compass`
- **Working branch:** `claude/beautiful-bell-t8u39`
- **Always push to:** `claude/beautiful-bell-t8u39`
- **Git remote:** `git push origin clean-branch:claude/beautiful-bell-t8u39`
  (local branch is named `clean-branch`)

---

## Live environment
- **Vercel URL:** `https://compass-qgcxa5khc-dale-cosgroves-projects.vercel.app`
- Vercel auto-deploys on push to `claude/beautiful-bell-t8u39`
- Env vars set in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Still needed in Vercel:** `SUPABASE_SERVICE_ROLE_KEY` (required for admin user creation API)

---

## Test user
- **Email:** cosgrdale@gmail.com
- **Role:** platform_admin
- **Tenant:** FoodRisk Compass (slug: `foodrisk-compass`)

---

## Sprint status

### ✅ Sprint 1 — App Shell, Auth, Tenants & Sites (COMPLETE)
- Next.js project setup, Supabase SSR auth, middleware route protection
- Login page with forgot password
- Dashboard with stats cards and module navigation
- Admin layout with Users / Sites tab navigation
- Users: list, add, change role, deactivate/reactivate
- Sites: list active, add, edit, archive (archived collapsed at bottom)
- DB migration `001_core_tenant_auth`: `tenants`, `sites`, `user_profiles` + RLS

### ✅ Sprint 2 — Knowledge Sources & Knowledge Assets (COMPLETE)
- Knowledge Sources list (name, type, active version, latest version, access status)
- "Newer version available" warning banner
- Knowledge Source detail: metadata, asset list, set active version
- Add knowledge asset modal (title, version, issue date, effective date)
- Knowledge Asset detail page
- Licensing framework (`requires_license` flag, `tenant_knowledge_access` table)
- DB migration `002_knowledge_sources`: `knowledge_sources`, `knowledge_assets`, `tenant_knowledge_access` + RLS
- DB migration `003_grant_permissions`: role grants for anon/authenticated

### 🔲 Sprint 3 — Document Upload & Processing Pipeline (NOT STARTED)
Key deliverables:
- File upload (PDF, DOCX, Markdown) to Supabase Storage
- Storage buckets: `source-documents`, `canonical-markdown`, `extracted-assets`
- Document library page (`/documents`)
- Upload page (`/documents/upload`) — select source, select asset, upload file
- Document detail/status page (`/documents/[id]`)
- DB migration `003_document_processing`: `documents`, `document_processing_jobs`, `document_processing_events`
- Processing statuses: Uploaded → Queued → Processing → Completed / Failed / Review Required / Published
- Async job tracking, error logging, reprocessing support

### 🔲 Sprint 4 — AI Extraction Engine (NOT STARTED)
Key deliverables:
- Markdown conversion pipeline
- Metadata, hierarchy, clause, requirement, table, definition extraction
- Embedding generation (pgvector)
- Confidence scoring
- DB migration `004_ai_extraction`: `document_sections`, `clauses`, `requirement_masters`, `requirement_versions`, `document_tables`, `document_definitions`, `requirement_embeddings`

---

## Source documents (uploaded by user)
All stored in `/root/.claude/uploads/2f947cd3-2dcb-48c0-9aef-ca029e343185/`:
- `PRD.md` — Full product requirements document
- `claudebuildrules.md` — Build rules (follow these strictly)
- `designsystem.md` — Colour palette, typography, layout rules
- `AIextractionspecification.md` — AI extraction standards
- `sprint1.md` — Sprint 1 spec (complete)
- `sprint2.md` — Sprint 2 spec (complete)
- `sprint3.md` — Sprint 3 spec (next)
- `sprint4.md` — Sprint 4 spec (after sprint 3)

---

## Design system (key values)
| Token | Hex | Usage |
|---|---|---|
| Ink Black | `#00171f` | Sidebar background, primary text |
| Deep Space Blue | `#003459` | Primary buttons, active nav |
| Cerulean | `#007ea7` | Secondary buttons, links |
| Fresh Sky | `#00a8e8` | Accents, AI indicators |
| White | `#ffffff` | App background, cards |

- Font: Inter
- Sentence case on all UI labels, buttons, modals
- Status badges defined in `globals.css` (badge-active, badge-approved, badge-draft, etc.)

---

## Key files
```
src/
  app/
    (app)/              # Authenticated app shell
      layout.tsx        # Sidebar + TopBar wrapper
      dashboard/        # Dashboard page
      admin/
        layout.tsx      # Admin sub-nav (Users / Sites tabs)
        users/          # User management
        sites/          # Site management
      knowledge-sources/  # Sprint 2 pages
      knowledge-assets/   # Sprint 2 asset detail
    (auth)/login/       # Login page
    api/admin/          # Server-side admin API routes
  components/
    layout/Sidebar.tsx  # Left nav (#00171f)
    layout/TopBar.tsx   # Top bar with user menu
    ui/Badge.tsx        # Status badges
    ui/Button.tsx       # Primary/secondary/destructive
    ui/Card.tsx         # Card/CardHeader/CardContent
  lib/
    supabase/client.ts  # Browser Supabase client
    supabase/server.ts  # Server Supabase client
    supabase/middleware.ts # Auth middleware
    types.ts            # Shared TypeScript types
  middleware.ts         # Route protection
```

---

## Build rules (critical — from claudebuildrules.md)
1. Build current sprint only — do not build future sprint features
2. Requirements-first architecture — not document management, not chatbot
3. Source content is immutable once approved
4. Search must be evidence-based with citations
5. No hallucinated compliance advice
6. Structured before summarised (source → AI summary order)
7. Multi-tenant security mandatory — RLS on all tables
8. Use Supabase Row Level Security
9. Business rules in database, not UI
10. Build vertical slices end-to-end
