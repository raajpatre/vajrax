# VajraX

<p align="center">
  <img src="public/vajrax-logo.png" alt="VajraX Logo" width="180" />
</p>

<h3 align="center">The operations platform for Newton School of Technology's Robotics Club</h3>

<p align="center">
  <em>Membership · Inventory · Projects · Events — all in one place.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js" />
  <img src="https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/raajpatre/vajrax?style=for-the-badge&color=FFD700" alt="Stars" />
  <img src="https://img.shields.io/github/last-commit/raajpatre/vajrax?style=for-the-badge&color=00C7B7" alt="Last Commit" />
  <img src="https://img.shields.io/github/languages/top/raajpatre/vajrax?style=for-the-badge&color=3178C6" alt="Top Language" />
  <img src="https://img.shields.io/github/repo-size/raajpatre/vajrax?style=for-the-badge&color=8A2BE2" alt="Repo Size" />
</p>

<p align="center">
  <a href="https://vajrax.club">🌐 Live</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-getting-started">Getting Started</a> ·
  <a href="#-roles--permissions">Roles</a>
</p>

---

<table>
  <tr>
    <td align="center"><strong>Landing Page</strong></td>
  </tr>
  <tr>
    <td><img width="1512" height="859" alt="Screenshot 2026-05-16 at 11 56 31 PM" src="https://github.com/user-attachments/assets/53fbde5c-ec74-4afc-9c4b-752a65429d1a" /></td>
  </tr>
</table>

---

## 📖 Overview

**VajraX** is the internal platform that runs Newton School of Technology's robotics club. It replaces the chaotic mix of WhatsApp groups, scattered Google Sheets, and physical inventory registers that most college clubs survive on. Members apply, log in, request equipment, book lab resources, manage their projects, and track sponsors — all through a single role-aware web application backed by Supabase.

It is built for a real club doing real work — not a portfolio toy. The platform handles applicant onboarding, inventory borrowing with safety-certification checks, request-and-approval workflows, real-time notifications, and a synchronized audit trail in Google Sheets for offline reference.

---

## ✨ Features

- **Application & Onboarding** — Public sign-up form for prospective members. Submissions land in a moderation queue reviewed by faculty, president, and vice president. Approval auto-provisions a Supabase Auth account and a `profiles` row.
- **Role-Based Access Control** — Eight roles (`faculty`, `president`, `vice_president`, `website_manager`, `printing_head`, `member`, and more) gate every protected action, both client-side and via Postgres RLS policies.
- **Inventory Management** — Live stock tracking with categories, total/available quantities, and safety-certification gates on hazardous items. Members request equipment; admins approve, deny, or partially fulfill with reviewed quantities.
- **Resource Bookings** — Workspace and machinery reservations with a database-level no-overlap constraint preventing double-bookings.
- **Project Lifecycle** — Members request to launch club projects; admins approve. Approved projects get a workspace with team invites, rich media updates, and access controls.
- **Safety Certifications** — Profile-level certifications enforced on hazardous inventory requests via Postgres check constraints.
- **Sponsors Module** — Tiered sponsor management (Platinum / Gold / Silver) with public-facing display and admin CRUD.
- **Notifications System** — Realtime, per-user notifications surfaced in the UI for approvals, rejections, project invites, and inventory decisions.
- **Google Sheets Sync** — Inventory history and live stock snapshot mirrored to a Google Sheet via Apps Script webhook, giving the club an offline-readable audit trail.
- **Encrypted Password Custody** — Applicant passwords held in AES-256-GCM encryption between submission and admin approval, then handed off to Supabase Auth.

---

## 🎨 Visuals

<table>
  <tr>
    <td align="center"><strong>Member Dashboard</strong></td>
    <td align="center"><strong>Achievement Gallery</strong></td>
  </tr>
  <tr>
    <td><img width="1512" height="858" alt="Screenshot 2026-05-17 at 12 00 09 AM" src="https://github.com/user-attachments/assets/3db73533-371f-49ef-9e4b-6aa19b24c854" /></td>
    <td><img width="1512" height="858" alt="Screenshot 2026-05-17 at 12 04 40 AM" src="https://github.com/user-attachments/assets/79274dd4-6a93-48eb-a1e4-4dbbaec5bec3" />
</td>
  </tr>
  <tr>
    <td align="center"><strong>Project Detail</strong></td>
    <td align="center"><strong>Member Profile</strong></td>
  </tr>
  <tr>
    <td><img width="1512" height="858" alt="Screenshot 2026-05-17 at 12 01 50 AM" src="https://github.com/user-attachments/assets/0fdab985-2c21-4c22-9150-f06b22157113" /></td>
    <td><img width="1512" height="859" alt="Screenshot 2026-05-17 at 12 01 15 AM" src="https://github.com/user-attachments/assets/453a99e7-aa6a-4f22-a5fd-ee52a0522e2b" />
</td>
  </tr>
</table>

---

## 🏗️ Architecture

### Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components, route groups, edge-friendly middleware |
| Language | TypeScript | Strict types end-to-end, including generated DB types |
| Auth & DB | Supabase (Postgres + Auth + Storage + Realtime) | One backend for auth, schema, RLS, file storage, and live updates |
| Styling | Tailwind CSS 4 + Radix UI primitives | Utility-first with accessible component primitives |
| Animation | Framer Motion, Three.js / R3F, Lottie | Layered motion across the public marketing pages and dashboard |
| Sync | Google Apps Script webhook | Mirror inventory data to a shared Google Sheet |
| Hosting | Vercel | Continuous deployment, env management, edge runtime |

### Request Flow

```
                  ┌──────────────────────────┐
   Browser  ──▶   │  Next.js middleware      │  ──▶  /login redirect if unauth
                  │  (session refresh +      │
                  │   protected-path gate)   │
                  └─────────────┬────────────┘
                                ▼
                  ┌──────────────────────────┐
                  │  App Router page or      │
                  │  API route               │
                  └─────────────┬────────────┘
                                ▼
        ┌─────────────────────────────────────────────┐
        │  Supabase server client (anon, user JWT)    │  ◀─ RLS policies enforce row-level access
        │  — OR —                                     │
        │  Supabase admin client (service role)       │  ◀─ Only inside guarded server routes
        └──────────────────┬──────────────────────────┘
                           ▼
                  Postgres (RLS enforced)
                           │
                           ▼ (on inventory mutations)
                  Google Apps Script webhook
                           │
                           ▼
                    Google Sheets mirror
```

### Repository Layout

```
vajrax/
├── src/
│   ├── app/
│   │   ├── (public)/              # Marketing, contact, innovators
│   │   ├── (auth)/                # Login, signup
│   │   ├── (protected)/           # Member + admin app behind auth
│   │   │   ├── inventory/
│   │   │   ├── projects/
│   │   │   ├── profile/[id]/
│   │   │   ├── my-requests/
│   │   │   ├── project-invites/
│   │   │   └── admin/
│   │   │       ├── applicants/
│   │   │       ├── members/
│   │   │       ├── requests/
│   │   │       ├── project-requests/
│   │   │       ├── inventory/
│   │   │       └── inventory-history/
│   │   └── api/
│   │       ├── applicants/        # Public signup endpoint
│   │       └── admin/             # Role-gated admin actions
│   ├── lib/
│   │   ├── server/                # server-only helpers (auth, encryption)
│   │   ├── supabase/              # client, server, admin, middleware
│   │   └── hooks/                 # useUser, etc.
│   ├── components/
│   ├── actions/                   # Server Actions
│   └── types/
│       └── database.ts            # Generated Supabase types
├── supabase/
│   └── migrations/                # All schema migrations
├── docs/
│   ├── google-sheets-inventory-sync.md
│   └── google-apps-script-inventory-history.js
├── public/                        # Logos, static assets
├── middleware.ts                  # Next.js middleware wiring
└── next.config.ts
```

---

## 🔐 Roles & Permissions

Roles live on the `profiles.role` column and are enforced in three layers:

1. **Postgres RLS policies** — the source of truth. Even if a client bypasses the UI, the database refuses unauthorized reads/writes.
2. **Server-side helpers** — `requireApplicantReviewer()`, role checks in admin API routes, server actions.
3. **Client-side gates** — show/hide UI based on `useUser()` profile data. Purely cosmetic; never the security boundary.

| Role | Capabilities |
|---|---|
| `faculty` | Full administrative access. Reviews applicants, manages members, approves projects, oversees inventory. |
| `president` | Same as faculty for club operations. Cannot perform faculty-only escalations (if any). |
| `vice_president` | Reviews applicants, approves equipment requests, manages projects. |
| `website_manager` | Manages public-facing content (events, gallery, sponsors). |
| `printing_head` | Manages 3D printing queue and related inventory. |
| `member` | Default approved role. Browses inventory, submits requests, manages own profile and project participation. |

---

## 🗄️ Database Schema (High Level)

The schema is defined across migrations in `supabase/migrations/`. Core tables:

- **`profiles`** — One row per Supabase Auth user. Holds `role`, `display_name`, `current_semester`, `safety_certifications`, `custom_tags`.
- **`applicants`** — Pre-approval submissions. Stores `encrypted_password` (AES-256-GCM) until admin approval, then a Supabase Auth user is created.
- **`inventory_items`** — Equipment catalog with `total_quantity`, `available_quantity`, optional `required_safety_certification`.
- **`equipment_requests`** — Member requests with status lifecycle (`pending`, `approved`, `rejected`, `returned_*`), `approved_quantity`, `reviewed_by`, `reviewed_at`.
- **`resource_bookings`** — Workspace/machinery reservations with no-overlap constraint.
- **`projects` / `project_updates` / `project_invites`** — Project lifecycle with rich-media updates (`image_urls`, `source_urls`).
- **`events`** — Public events with `is_exclusive` flag.
- **`sponsors`** — Tiered sponsors (Platinum / Gold / Silver).
- **`notifications`** — Per-user notification stream.
- **`gallery_items`** — Public gallery posts with `tag`, `location_city`, `location_country`.

All sensitive tables have RLS enabled and policies scoped to the appropriate roles.


---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9 (or pnpm / yarn — adjust commands accordingly)
- **Supabase account** with a project provisioned
- **Google Cloud account** (for Sheets sync — optional but recommended)

### 1 · Clone and install

```bash
git clone https://github.com/raajpatre/vajrax.git
cd vajrax
npm install
```

### 2 · Configure environment

Create `.env.local` at the repo root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Google Sheets Sync (optional)
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/<deployment-id>/exec
GOOGLE_SHEETS_WEBHOOK_SECRET=<random-32-char-secret>
NEXT_PUBLIC_GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/<sheet-id>
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` bypasses Row-Level Security. **Never** expose it client-side. Never commit `.env.local`.

### 3 · Run migrations

Apply every SQL file in `supabase/migrations/` to your Supabase project, in order. Either:

- Paste each file into Supabase SQL Editor and run, or
- Use the Supabase CLI:
```bash
  supabase db push
```

### 4 · Create storage buckets

The platform expects two buckets (created automatically by `events-policy.sql` and gallery setup):

- `event-images` — public read
- `gallery-images` — public read with role-gated writes

### 5 · Bootstrap your first admin

Once migrations are applied, manually insert a `faculty` or `president` row into `profiles` for yourself. Then sign up via the UI; your account gets linked.

### 6 · Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📊 Google Sheets Sync

Inventory history and live stock snapshots are mirrored into a Google Sheet via Apps Script. See [`docs/google-sheets-inventory-sync.md`](./docs/google-sheets-inventory-sync.md) for the full setup, including:

- Creating the target sheet
- Pasting the Apps Script from [`docs/google-apps-script-inventory-history.js`](./docs/google-apps-script-inventory-history.js)
- Configuring `VAJRAX_SYNC_SECRET` as a script property
- Deploying as a Web App and wiring the URL into `GOOGLE_SHEETS_WEBHOOK_URL`

---

## 🛡️ Security Notes

- **Row-Level Security** is enabled on every sensitive table. The service-role key is used only in server-side admin routes that have already passed role checks.
- **Applicant passwords** are encrypted at rest using AES-256-GCM with a key derived from server-side secrets. They are decrypted only at the moment of admin approval and immediately handed to Supabase Auth.
- **Server-side admin guards** (`requireApplicantReviewer`, role checks in member-deletion routes) validate auth and role before touching admin-clients.
- **Webhook authentication** between the app and the Google Apps Script endpoint uses a shared secret over HTTPS.

If you discover a vulnerability, please open a private issue or contact the maintainer directly rather than filing a public issue.

---

## 🛠️ Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server (after build) |
| `npm run lint` | Run ESLint across the codebase |

---

## 📂 Useful Files

- [`next.config.ts`](./next.config.ts) — Image remote patterns for Supabase storage and Google Drive
- [`src/lib/supabase/`](./src/lib/supabase/) — All four Supabase client variants (client, server, admin, middleware)
- [`src/lib/server/applicant-credentials.ts`](./src/lib/server/applicant-credentials.ts) — AES-256-GCM encryption helpers
- [`middleware.ts`](./middleware.ts) — Auth + protected-path gating
- [`supabase/migrations/`](./supabase/migrations/) — Full schema history

---

## 🗺️ Roadmap

- [ ] Passwordless applicant invitation flow (replace encrypted-password-at-rest design)
- [ ] Rate limiting + Turnstile on public `/api/applicants` endpoint
- [ ] Audit log of all admin actions
- [ ] Mobile-first inventory scan workflow (QR-based equipment checkout)
- [ ] CI workflow with `gitleaks`, ESLint, and build verification
- [ ] Event registration / RSVP system

---

## 👥 Team

Built and maintained by the VajraX core team at Newton School of Technology.

- **Lead** — [Raaj Patre](https://github.com/raajpatre)
<!-- ADD: other contributors -->

---

## 📄 License

© Newton School of Technology Robotics Club. All rights reserved.

This codebase is published for transparency and portfolio review. It is not licensed for redistribution, reuse, or modification outside of the VajraX team.

---

<p align="center">
  <em>Built for the makers, by the makers.</em>
  <em>Made with ⚡️ By Raaj Patre </em>
</p>
