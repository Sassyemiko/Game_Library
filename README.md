# Game Library

A monorepo for a game library and tracker project.

This repository includes a desktop/React app, backend API server, shared database schema, and generated API schema/runtime code.

## Key features

- Game library management with detailed game entries and categories.
- Either add custom cover page or get auto-filler
- Track your achievements while playing the games. 
- User authentication and authorization via Clerk.
- Friends and social tracking features.
- Keep tracks of your games especially for the pirated games.
- Just add your game exe path (zipped wont work) and launch the game directly from the web. 
- Compare your achievements across your friends via sharing your referal id. 
- Many more features will come.

## What’s included

- `artifacts/api-server` — Express-based API server with Clerk auth, Drizzle ORM, and SQLite integration.
- `artifacts/games-tracker` — Web tracker app using Vite, React, and a custom UI.
- `nexus-tracker` — Tauri + React desktop app scaffold.
- `lib/api-client-react` — shared API client packages for React apps.
- `lib/api-zod` — Zod-backed API schema and runtime helpers.
- `lib/api-spec` — OpenAPI specification and code generation config.
- `lib/db` — database schema and migrations for the app.
- `scripts` — utility scripts for repository tooling.

## Prerequisites

- Node.js (recommended latest LTS)
- `pnpm`
- `npm` or `yarn` not required for this repo, but useful for package management
- Rust toolchain and Tauri dependencies for the `nexus-tracker` desktop app

## Install

From the repository root:

```bash
pnpm install
```

## Run locally

### Web tracker app

```bash
pnpm --filter nexus-tracker dev
```

### API server

```bash
pnpm --filter @workspace/api-server dev
```

> The API server uses environment variables via `dotenv`. Add a `.env` file in `artifacts/api-server` with the necessary settings for authentication and database paths.

## Build

### Build all packages

```bash
pnpm build
```

### Build the desktop app

```bash
pnpm build:nexus-tracker
```

## Typecheck

```bash
pnpm run typecheck
```

## Repository structure

- `artifacts/api-server` — backend server and middleware
- `artifacts/games-tracker` — frontend tracker web app
- `nexus-tracker` — desktop application with Tauri
- `lib/api-client-react` — shared React API client code
- `lib/api-zod` — shared Zod API schemas and types
- `lib/api-spec` — OpenAPI spec and generation config
- `lib/db` — database schema and migrations
- `scripts` — utility scripts for repo tasks

## Notes

- `private: true` is enabled for workspace packages.
- The root workspace is configured for monorepo scripts and builds.
- If you add a new package, update the workspace config accordingly.
