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

GitHub Pages hosts the browser application. Real accounts require a separate Node service and PostgreSQL database with the tables in `server/schema.ts` (missing account tables are created at startup). Configure `DATABASE_URL`, a random `SESSION_SECRET` of at least 32 characters, and `ALLOWED_ORIGINS` (for Pages: `https://druhustle.github.io`) directly in the hosting provider. Use `pnpm install --frozen-lockfile && pnpm build` to build and `pnpm start` to serve. `/health` checks the process; `/ready` checks database connectivity.

Set `VITE_API_URL` when building the browser application to enable real accounts. Without it, demo accounts and learning progress work locally. Sessions use signed, HTTP-only cookies and expire after 15 minutes. Registration requires a password of at least 12 characters. Existing plaintext password records are hashed before the API begins accepting requests. Password reset, password change, and real account profile updates remain unavailable until those features are implemented; the UI reports that limitation.

Use the PostgreSQL connection URL from your provider for `DATABASE_URL`; external connections should verify TLS (`sslmode=verify-full`). Existing MySQL records require a separate data migration when changing providers.
