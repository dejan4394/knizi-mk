# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**knizi.mk** — a SaaS invoicing/accounting app for the North Macedonian market. A company owner registers, manages clients, and issues invoices and proformas (with 18% VAT), sends them by email, generates PDFs, and (in progress) submits them to UJP (Управа за јавни приходи, the MK public revenue office) via KIBS digital signing.

The codebase is a Turborepo monorepo with an npm workspace. **Most code comments, log messages, and domain terms are written in Macedonian** — this is expected, keep new comments consistent with surrounding code.

## Layout

- `apps/api` — NestJS 11 backend (TypeORM + PostgreSQL), the core of the app
- `apps/web` — Next.js 16 frontend (App Router, React 19, MUI v9)
- `packages/ui` — shared React component stub (`@repo/ui`)
- `packages/eslint-config`, `packages/typescript-config` — shared configs

The root `README.md` is the untouched Turborepo starter README — ignore it.

## Commands

Run from repo root (Turborepo fans out to workspaces):

```sh
npm run dev          # runs both apps (web on :3005, api on :3001)
npm run build
npm run lint
npm run check-types
npm run format       # prettier across the repo
```

Per-app work is usually done inside the app dir:

**API** (`apps/api`):
```sh
npm run start:dev    # nest watch mode, :3001
npm run test         # jest, all *.spec.ts under src/
npm run test -- users.service   # single test file by path/name pattern
npm run test:e2e     # jest with test/jest-e2e.json
npm run lint         # eslint --fix
```

**Web** (`apps/web`):
```sh
npm run dev          # next dev on :3005
npm run check-types  # next typegen && tsc --noEmit
```

### Database migrations (API, from `apps/api`)

TypeORM with `synchronize: false` — **schema changes must always go through migrations**, never rely on auto-sync.

```sh
npm run migration:generate   # diff entities vs DB → new migration in src/config/migrations
npm run migration:run        # apply (dev uses data-source.ts; prod uses dist)
npm run migration:revert
```

`start:prod` runs `migration:run` before booting. The dev DB connection is hardcoded in `src/config/data-source.ts` (localhost `knizi_db`); in production a single `DATABASE_URL` env var flips it to Postgres-with-SSL — that env var's presence is the prod/dev switch.

## Architecture

### Backend (NestJS)

Standard Nest module-per-domain structure under `apps/api/src`. Entities are auto-discovered by glob (`**/*.entity.{ts,js}`), so a new entity just needs the `@Entity` decorator and to live under `src`.

Domain modules:
- **auth** — JWT (passport-jwt). `JwtAuthGuard` + `RolesGuard` with a `@Roles()` decorator; roles are `OWNER | EMPLOYEE | VIEWER` (`users/enums/user.enum.ts`). OWNER = full access, EMPLOYEE = can only invoice, VIEWER = read-only (e.g. external accountant).
- **companies** — the tenant. A user's company holds logo, KIBS/OneID credentials.
- **clients** — customers a company invoices; scoped to a company.
- **invoices** — the core domain. `Invoice` + `InvoiceItem` (see below).
- **pdf** — renders invoice PDFs via Puppeteer + Handlebars templates (`pdf/templates`). `@sparticuz/chromium` is used in production (Render); `config/puppeteer.config.ts` detects prod.
- **kibs** — client for the KIBS SignPlus API (OAuth2 client-credentials) for digital signatures. Base URL/credentials from `KIBS_*` env vars.
- **ujp** — adapters that map internal invoices to UJP submission format (`InvoiceCalculatorService`, `UjpInvoiceAdapterService`, `UjpClientService`) plus `InvoiceUjpStatus` entity. In-progress integration; module currently exports services only (no controller yet). Untracked in git as of this writing.
- **dashboard** — aggregate stats.

**Invoice model is the trickiest part** (`invoices/entities/invoice.entity.ts`):
- One entity backs both invoices and proformas via `documentType: INVOICE | PROFORMA`.
- A proforma can be **converted** into an invoice — this is a self-referential `OneToOne` via `convertedFromId` / `convertedToId`.
- Numbering: `@Unique(['companyId', 'invoiceNo', 'year', 'documentType'])` — invoice numbers reset per company, per year, per document type.
- Status lifecycle: `UNPAID → OVERDUE → PAID`, plus `CANCELED`, and proforma states `PROFORMA_PENDING → PROFORMA_PAID → CONVERTED`.
- Money fields (`subtotalAmount`, `vatAmount`, `totalWithVat`, `roundingAmount`, `finalPayable`) are `decimal(10,2)` — TypeORM returns these as **strings**, so parse before doing arithmetic.
- `InvoiceCronService` runs daily at midnight (`Europe/Skopje`) and flips overdue `UNPAID` invoices to `OVERDUE`.

`main.ts`: CORS is wide open (any origin), a global `ValidationPipe` is active (so DTOs with class-validator are enforced), and body-parser limits are raised to 30mb for logo uploads / PDFs / signatures.

### Frontend (Next.js App Router)

- Routes under `apps/web/app`. Authenticated pages live in the `(dashboard)` route group with a shared `layout.tsx` + `Sidebar`; `/login` is outside it.
- **All API calls go through `app/utils/services/api.ts`** — a preconfigured axios instance. A request interceptor attaches the JWT from `localStorage`; a response interceptor catches 401, clears `localStorage`, and redirects to `/login`. Use this instance rather than calling axios/fetch directly.
- Auth state is held in `app/context/AuthContext.tsx`.
- `NEXT_PUBLIC_API_URL` overrides the API base (defaults to `http://localhost:3001`).

## Conventions

- New DB columns/tables → write an entity change **and** generate a migration; never enable `synchronize`.
- Parse `decimal` money fields (strings from TypeORM) before math.
- Frontend HTTP → the shared `api` axios instance, not raw fetch.
- Keep the prod/dev split centralized in `data-source.ts` / `puppeteer.config.ts` (driven by env-var presence), don't scatter `NODE_ENV` checks.
