# VP Ventures Inventory System

A mobile-first, owner-only business application for LPG gas inventory and sales, customer debt tracking, and POS service transactions. It uses one Next.js application for both the user interface and server-side API, with PostgreSQL accessed through Prisma ORM.

**Existing-project note:** this delivery is arranged with files relative to the project root. It does not run `create-next-app` or require a separate Express server. To integrate it into your existing Next.js directory, merge these files at that directory’s root and review conflicts before replacing existing configuration. In particular, back up `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, and `src/app/globals.css` before merging.

## What is included

- Owner login and secure HTTP-only session cookie; no public signup.
- First-login password-change flow and account credential management.
- Separate Gas and POS workspaces, with responsive mobile drawers and desktop sidebars.
- Gas purchases stored as stock batches, safe pre-consumption purchase edits, FIFO sales costing, mixed payment breakdowns, debt, repayments, and stock adjustments.
- Audited sale/transaction corrections and voids.
- POS service-charge rules and separate Gas Payment records.
- Dashboard summaries from persisted database records.
- Zod request validation, Prisma transactions for critical write operations, and unit tests for money helpers and charge rules.

## Requirements

- Node.js **20.19 or newer** (or a newer supported LTS release).
- pnpm.
- PostgreSQL 14 or newer recommended.

## Local setup

A `pnpm-lock.yaml` could not be generated in this environment because package-registry access is blocked. The first successful `pnpm install` will resolve the declared dependency ranges and create the lockfile; keep it after verification for reproducible future installs.

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env` and edit `.env` with your real PostgreSQL connection details. On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   Set at least:

   - `DATABASE_URL`: your PostgreSQL connection string. Ensure the database exists and the database user can create/alter tables.
   - `SESSION_SECRET`: a long random secret of at least 32 characters.
   - `OWNER_NAME`: the owner's display name.
   - `OWNER_EMAIL`: the login email.
   - `OWNER_INITIAL_PASSWORD`: a temporary password of at least 10 characters.
   - `BUSINESS_TIMEZONE`: timezone used for dashboard “today” calculations; defaults to `Africa/Lagos`.

   Do not commit `.env` or share its secret values.

3. Create the tables, generate the Prisma Client, and seed the initial owner and default settings/rules:

   ```bash
   pnpm db:setup
   ```

   This command uses `prisma migrate dev --name init`, generates the client, and runs the seed script. Prisma creates a migration in `prisma/migrations` during this first setup. Review and keep the generated migration in source control.

4. Start the development server:

   ```bash
   pnpm dev
   ```

5. Open the local URL printed by Next.js (usually `http://localhost:3000`) and log in with the initial owner credentials you put in `.env`. The initial password must be changed before entering the Gas or POS workspaces.

## Common commands

```bash
pnpm dev           # Start development server
pnpm build         # Generate Prisma Client and build the application
pnpm start         # Start the production server after a successful build
pnpm lint          # Run ESLint
pnpm typecheck     # Run TypeScript checks
pnpm test          # Run the unit test suite
pnpm db:generate   # Generate Prisma Client
pnpm db:migrate    # Create/apply a development migration
pnpm db:deploy     # Apply committed migrations in deployment environments
pnpm db:seed       # Create initial owner/settings/rules without resetting an existing password
pnpm db:studio     # Open Prisma Studio
```

Use a separate, backed-up development database for development migrations. Do not run `migrate dev` against a production database. For an environment with committed migrations, use `pnpm db:deploy` as part of deployment and configure a safe owner-seeding process.

## Business logic notes

- The owner enters the amount of money for a gas sale; the server calculates kilograms from the current selling price.
- Stock is allocated oldest batch first (FIFO). Historical sale prices and batch cost allocations are snapshotted.
- Payment components must sum to the gas sale amount. Debt requires customer name, phone, and address.
- Gas repayments are collections against existing debts, not additional sales revenue.
- POS service revenue includes only service charges from POS services. Gas Payments have a zero service charge and remain separate from POS service revenue.
- Charge rules are validated for overlapping ranges, and each POS transaction stores the charge applied at transaction time.
- Corrections and voids retain records and audit history rather than deleting transactions.
- Purchase details can only be edited before that batch has sale allocations or non-purchase stock movements. If a sale has already received debt repayments, the app blocks an automatic sale correction/void that would require debt reconciliation.
- The app does not calculate physical POS cash balance.

## Project layout

```text
prisma/                Prisma schema, migrations, seed
src/app/               App Router pages and API Route Handlers
src/components/        Shared UI, Gas and POS components
src/lib/               Prisma, authentication, money, FIFO and helper utilities
src/services/           Server-side business logic
src/validators/         Zod request schemas
tests/                 Unit tests
```

## Before real business use

This is an initial implementation package. Before relying on it for live financial records, configure a non-production PostgreSQL database first, run the setup, and verify the workflows with realistic test data. In particular, test stock corrections, debt repayments, transaction correction/void flows, and backup/restore. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` in an environment where dependencies can be installed. This workspace may not be able to access the npm registry, so the package has not been represented as fully build-verified unless those commands actually complete successfully.
