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
- Env vars set in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Accounts
- **System owner:** `dale@cgrv.co.uk` — ultimate owner, can manage tenants, only one who can assign Platform Admin role
- **Test user:** `cosgrdale@gmail.com` — platform_admin, tenant: FoodRisk Compass (slug: `foodrisk-compass`)

---

## DB migrations applied
| # | Name | Description |
|---|------|-------------|
| 001 | `001_core_tenant_auth` | `tenants`, `sites`, `user_profiles` + RLS |
| 002 | `002_knowledge_sources` | `knowledge_sources`, `knowledge_assets`, `tenant_knowledge_access` + RLS |
| 003 | `003_grant_permissions` | Role grants for anon/authenticated |
| 004 | `007_document_processing` | `documents`, `document_processing_jobs`, `document_processing_events` + RLS; storage buckets |
| 005 | `008_system_owner` | `is_system_owner` flag on `user_profiles`; `get_my_tenant_id()` and `is_system_owner()` security definer functions; tenants insert/update policies |
| 006 | Various RLS fixes | `get_my_tenant_id()` function; admin update policy for user_profiles; system owner flag |

---

## Sprint status

### ✅ Sprint 1 — App Shell, Auth, Tenants & Sites (COMPLETE)
- Next.js 15 + Supabase SSR auth, middleware route protection
- Login page with forgot password
- Dashboard with stats cards and module navigation
- Admin layout with Users / Sites / Tenants (system owner only) tab navigation
- **Users:** list active/deactivated, add (invite), change role, change name, deactivate/reactivate
  - System owner grouped view: all tenants shown as collapsible accordion
  - Platform Admin role restricted to system owner assignment only
  - System owner row: cannot be deactivated or have name/role changed by others
- **Sites:** list active/archived, add, edit, archive/restore
  - System owner grouped view: all tenants shown as collapsible accordion
- **Tenants (system owner only):** list, add, edit, activate/deactivate
  - Tenant CRUD via `/api/admin/tenants` (service role, bypasses RLS)
- **Profile page** (`/profile`): view account details, edit own name, change password

### ✅ Sprint 2 — Knowledge Sources & Knowledge Assets (COMPLETE)
- Knowledge Sources list: name, type, owner/body, active version, latest version, access status
- Edit, archive/restore, delete (only if no assets and no documents) per source
- "Newer version available" amber warning banner
- Knowledge Source detail: metadata cards, asset list, set active version
- Add knowledge asset modal (title, version, issue date, effective date)
- Knowledge Asset detail page
- Licensing framework (`requires_license` flag, `tenant_knowledge_access` table)

### ✅ Sprint 3 — Document Upload & Processing Pipeline (COMPLETE)
- Storage buckets: `source-documents`, `canonical-markdown`, `extracted-assets`
- **`/documents`:** library table (title, source, owner/body, version, status, uploader, date); delete with storage cleanup
- **`/documents/upload`:** select source + asset, file drag-drop (PDF, DOCX, Markdown ≤50 MB), title auto-filled from filename
- **`/documents/[id]`:** pipeline progress indicator (Uploaded → Queued → Processing → Completed), job history accordion, event audit trail, reprocess button, delete
- Document delete via `/api/documents` (service role — removes storage file + cascades DB records)
- Processing statuses: `uploaded`, `queued`, `processing`, `completed`, `failed`, `review_required`, `published`

### 🔲 Sprint 4 — AI Extraction Engine (NOT STARTED)
Key deliverables:
- Markdown conversion pipeline
- Metadata, hierarchy, clause, requirement, table, definition extraction
- Embedding generation (pgvector)
- Confidence scoring
- DB migration `004_ai_extraction`: `document_sections`, `clauses`, `requirement_masters`, `requirement_versions`, `document_tables`, `document_definitions`, `requirement_embeddings`

---

## Source documents
All stored in `/root/.claude/uploads/2f947cd3-2dcb-48c0-9aef-ca029e343185/`:
- `PRD.md` — Full product requirements document
- `claudebuildrules.md` — Build rules (follow these strictly)
- `designsystem.md` — Colour palette, typography, layout rules
- `AIextractionspecification.md` — AI extraction standards
- `sprint1.md` — Sprint 1 spec (complete)
- `sprint2.md` — Sprint 2 spec (complete)
- `sprint3.md` — Sprint 3 spec (complete)
- `sprint4.md` — Sprint 4 spec (next)

---

## Architecture patterns (critical — read before making changes)

### RLS & server-side admin operations
The browser Supabase client always runs under RLS. For operations that need to bypass RLS (tenant CRUD, document deletion, user creation), use a **server-side API route** with the service role key:
- `/api/admin/invite-user` — create users (service role)
- `/api/admin/tenants` — create/update tenants (service role)
- `/api/documents` — delete documents + storage files (service role)

### System owner
- Identified by `user_profiles.is_system_owner = true`
- Helper function: `public.is_system_owner()` (security definer)
- Only system owner can assign `platform_admin` role
- System owner sees all tenants' users and sites grouped by tenant in admin

### RLS circular reference fix
`user_profiles` SELECT/UPDATE policies use `public.get_my_tenant_id()` (security definer) rather than an inline subquery, to avoid the circular reference where RLS blocks the subquery used to evaluate RLS.

### Soft delete pattern
- Sites: `status = 'archived'` — collapsible section at bottom
- Users: `status = 'inactive'` — collapsible section at bottom
- Knowledge Sources: `status = 'archived'` — collapsible section at bottom; hard delete only if zero assets and zero documents

---

## Key files
```
src/
  app/
    (app)/
      layout.tsx                    # Sidebar + TopBar shell
      dashboard/page.tsx            # Stats + module cards
      admin/
        layout.tsx                  # Server: fetches is_system_owner, renders AdminLayoutClient
        AdminLayoutClient.tsx       # Client: Users / Sites / Tenants tabs
        users/page.tsx              # Server: fetches users (admin client for system owner)
        users/UsersClient.tsx       # Client: grouped or flat view, invite, name edit, role change
        sites/page.tsx              # Server: fetches sites (admin client for system owner)
        sites/SitesClient.tsx       # Client: grouped or flat view, add/edit/archive
        tenants/page.tsx            # Server: fetches all tenants via admin client
        tenants/TenantsClient.tsx   # Client: add/edit/deactivate tenants
      profile/
        page.tsx                    # Server: fetches profile
        ProfileClient.tsx           # Client: name edit, change password
      knowledge-sources/
        page.tsx                    # Server: fetches sources with assets + documents
        KnowledgeSourcesClient.tsx  # Client: list, add, edit, archive, delete
        [id]/page.tsx               # Server: source detail
        [id]/KnowledgeSourceDetailClient.tsx
      knowledge-assets/[id]/page.tsx
      documents/
        page.tsx                    # Server: fetches documents with joins
        DocumentsClient.tsx         # Client: list with delete
        upload/page.tsx             # Server: fetches sources for selector
        upload/UploadClient.tsx     # Client: upload form → storage + DB + job
        [id]/page.tsx               # Server: document + jobs
        [id]/DocumentDetailClient.tsx # Client: pipeline, jobs, reprocess, delete
    (auth)/login/page.tsx
    api/
      admin/invite-user/route.ts    # POST: create auth user + profile (service role)
      admin/tenants/route.ts        # POST/PATCH: tenant CRUD (service role)
      documents/route.ts            # DELETE: remove doc + storage file (service role)
  components/
    layout/Sidebar.tsx              # Left nav — Documents now active (Sprint 3)
    layout/TopBar.tsx               # Top bar — user menu with Change password link
    ui/Badge.tsx                    # Status badges incl. document statuses
    ui/Button.tsx
    ui/Card.tsx
  lib/
    supabase/client.ts
    supabase/server.ts
    supabase/middleware.ts
    types.ts                        # Tenant, Site, UserProfile, KnowledgeSource,
                                    # KnowledgeAsset, TenantKnowledgeAccess,
                                    # Document, DocumentProcessingJob,
                                    # DocumentProcessingEvent
  middleware.ts
```

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
- Status badges defined in `globals.css`

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
