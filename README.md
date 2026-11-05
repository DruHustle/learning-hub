# Learning Hub

An interactive learning platform designed to master SAP Business Technology Platform (BTP) AI solutions through hands-on tutorials, AI playgrounds, and architecture builders.

## 🚀 Quick Links

- [Live Demo](https://druhustle.github.io/learning-hub/) - View the live demo
- [GitHub Repository](https://github.com/DruHustle/learning-hub) - View source code
- [Issues](https://github.com/DruHustle/learning-hub/issues) - Report bugs or request features

## 🚀 Project Structure

```text
learning-hub/
├── client/                 # Frontend React application (Vite + TS + Tailwind)
│   ├── public/             # Static assets and tutorial content
│   └── src/                # Application source code
│       ├── data/           # Tutorial and architecture data
│       ├── pages/          # Main pages (Home, Tutorials, Playground)
│       └── components/     # Reusable UI components
├── server/                 # Account and progress API
└── .github/workflows/      # CI/CD for GitHub Pages deployment
```

## 🛠️ Getting Started

### Prerequisites
- Node.js (v22+)
- PNPM (v9+)

### Installation
```bash
pnpm install
pnpm dev
```

### PWA verification

Use the pnpm version pinned in `package.json`. After `pnpm build`, run:

```bash
pnpm exec playwright install --with-deps chromium
pnpm test:pwa
pnpm test:quiz
```

These checks load the production build at `/learning-hub/`, verify offline
navigation and uncached account requests, then build a second release to check
waiting-worker activation and removal of the old HTML cache revision. They do
not contact the production API. Both PR verification and Pages deployment run
them alongside the existing type checks, tests and moderate production audit.

The quiz browser regression verifies that each question clears its radio selection,
including consecutive questions with the same answer position. It uses the real
built UI without contacting an account API or saving progress.

The scoped `workbox-build>glob` and `filelist>minimatch` overrides fix the PWA
tooling audit without changing the PWA plugin or its registration/cache policy.
The generated-worker checks and FileList include/exclude test qualify the APIs
used by those two consumers; avoid replacing them with a global major override.

## 🌐 Deployment
The Learning Hub is optimized for **GitHub Pages** using hash-based routing. Any push to the `main` branch will trigger an automated deployment via GitHub Actions.

## ✨ Key Features
- **Hands-On Tutorials**: Step-by-step guides for SAP BTP AI Core, AI Hub, and more.
- **AI Playground**: Interactive environment for testing AI models and prompts.
- **Architecture Builder**: Visual tool for designing SAP BTP AI architectures.
- **Modern Blue UI**: High-contrast, professional design optimized for learning.

## 🛠️ Technology Stack
- **Frontend Framework**: React 19
- **Styling**: Tailwind CSS 4 & shadcn/ui
- **Routing**: Wouter
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **Language**: TypeScript

## 👨‍💻 Author
Developed by **Andrew Gotora**
**Last Updated**: January 2026

### Account API hosting

GitHub Pages hosts the browser application. Real accounts require a separate Node service and PostgreSQL database with the tables in `server/schema.ts` (missing account tables are created in the isolated `learning_hub` schema at startup). Configure `DATABASE_URL`, a random `SESSION_SECRET` of at least 32 characters, and `ALLOWED_ORIGINS` (for Pages: `https://druhustle.github.io`) directly in the hosting provider. Use `pnpm install --frozen-lockfile && pnpm build` to build and `pnpm start` to serve. `/health` checks the process; `/ready` checks database connectivity.

Production builds use the qualified Render API at `https://learning-hub-api-candidate.onrender.com` by default. Vercel builds use the explicit `same-origin` mode and qualified proxy routes, while GitHub Pages connects to Render directly. Set `VITE_API_URL` to override it; an explicit empty value keeps demo-only behavior. Development without a configured API keeps demo accounts and learning progress local. Sessions use signed, HTTP-only cookies and expire after 15 minutes. Registration requires a password of at least 12 characters. Existing plaintext password records are hashed before the API begins accepting requests. Password reset, password change, and real account profile updates remain unavailable until those features are implemented; the UI reports that limitation.

Sign-in confirms the returned identity with a credentialed `/api/me` request before
accepting the account or syncing progress. A blocked cookie or an interrupted
session check leaves sign-in unconfirmed and never automatically repeats the
password request. On GitHub Pages, the error offers the existing
[main Learning Hub site](https://tech-learning-hub-app.vercel.app/#/login),
whose same-origin API supports browsers that block cross-site cookies.
The Pages API uses partitioned cookies; WebKit 26.0 cannot retain that session,
while the project-pinned WebKit 27.2 passes login, reload, progress and logout.
Keep browser privacy controls enabled and test both the current browser and
the older-browser fallback when changing account hosting.

Progress completions send `merge: true` with the full known list. The updated API
atomically unions those IDs with the saved list and returns the acknowledged
progress. Calls without that flag, or with `merge: false`, retain full replacement
including an intentional empty list. During a staged rollout, old servers ignore
the new flag and still replace progress; upgrade the backend before relying on
cross-device merging. A failed or incomplete acknowledgement retains pending
completions and requires an explicit retry. CI verifies competing updates against
an isolated PostgreSQL service with `pnpm test:progress-postgres`; that command
requires a dedicated local `TEST_DATABASE_URL` and must never use a live database.

Use the PostgreSQL connection URL from your provider for `DATABASE_URL`; external connections should verify TLS (`sslmode=verify-full`). Existing MySQL records require a separate data migration when changing providers.

## Backend hosting

The Vercel application's account API now uses the existing free Render service
through same-origin routes. The original managed PostgreSQL database and session
signing secret are retained. The Oracle service remains available for rollback;
see [Oracle deployment and rollback](deploy/oracle/README.md).

The [Render API compute migration](deploy/render/README.md) uses a free web
service while retaining the current external PostgreSQL primary. Its API-only
Docker runtime verifies the existing schema in a read-only startup transaction
and stops rather than creating tables or rewriting credentials. The runbook covers
protected configuration, source-revision checks and frontend cutover. These
source changes do not change a deployed backend or database by themselves.
