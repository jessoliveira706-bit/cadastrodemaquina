# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Sistema de Cadastro de Máquinas Alocadas" — a Portuguese-language web app for tracking equipment allocated to municipal departments: a service queue (kanban), machine inventory, departments, units, and users. UI text, comments, and docs are in Brazilian Portuguese; keep new user-facing strings in pt-BR.

## Architecture — read this first

The **domain** app is a set of **standalone static HTML pages** using **vanilla ES6+ JavaScript** and **`localStorage`** for all persistence (machines, queue, departments, units still live in the browser). Each `.html` page is self-contained: it inlines its own `<style>` and its own page `<script>`, and pulls CDN scripts (lucide icons, chart.js) plus the one shared local file `utils.js`.

**Authentication is real, however** — see the `BD_2.2/` backend below. `login.html` and `utils.js` now talk to an Express + JWT server instead of the old `localStorage` credential check.

**Important mismatch:** `package.json`, `tailwind.config.cjs`, and `postcss.config.cjs` describe a React + Vite + Tailwind setup (`react`, `react-dom`, `lucide-react`, `vite`, `tailwindcss`). **None of that is actually used** — there is no `src/` directory, no JSX, no React, and the npm `dev`/`build`/`preview` scripts point at a Vite project that doesn't exist here. Treat that tooling as vestigial scaffolding. Do not assume a build pipeline; edit the HTML/JS directly.

### Page structure

Most entities follow a **list page + form page** pair, navigated via `window.location.href`:

- `index.html` — dashboard (chart.js doughnut + bar charts driven by localStorage)
- `fila.html` — service queue kanban; `chamado.html` — single call form
- `machines.html` — machine inventory (list + form combined)
- `departments-list.html` / `departments.html`
- `unidades-list.html` / `unidades.html`
- `usuarios-list.html` / `usuarios.html`
- `login.html` — checks credentials against the `usuarios_v1` store, sets `user_initials`

`utils.js` is loaded by every page and on `DOMContentLoaded` wires up the shared chrome: user avatar (`setUserAvatar`), active sidebar link highlighting (`highlightActiveLink`, matched by filename), and the logout button (`setupSair`). It also exposes shared `escapeHtml`, `loadData`, `saveData`.

### localStorage data model (the "database")

All state lives under versioned keys. Each page defines its own `STORAGE_KEY`/`KEY` constant and usually its own local `load()`/`save()` helpers (these often duplicate `utils.js` rather than reuse it).

| Key                      | Contents                          | Used by |
|--------------------------|-----------------------------------|---------|
| `calls_v1`               | Service-queue calls               | `fila.html`, `chamado.html`, `index.html` |
| `machines_alocadas_v1`   | Machine inventory                 | `machines.html`, `index.html` |
| `departments_v1`         | Departments                       | `departments*.html` |
| `units_list_v1`          | Units                             | `unidades*.html` |
| `usuarios_v1`            | Users (login source of truth)     | `usuarios*.html`, `login.html` |
| `user_initials`          | Logged-in user's avatar initials  | `utils.js`, `login.html` |
| `selected_unit`          | Currently selected unit           | cleared on logout |

Pages react to cross-tab edits via the `window` `storage` event (e.g. `index.html` re-renders charts on storage change).

## Conventions

- **XSS:** all interpolated user data must go through `escapeHtml` before injection into `innerHTML`. Several pages redefine `escapeHtml` locally (DOM-based) instead of importing it from `utils.js` — match the pattern already in the file you're editing.
- **Storage access:** wrap `JSON.parse(localStorage.getItem(KEY) || '[]')` in try/catch returning `[]` (the established `load()` idiom).
- New CDN dependencies are added as `<script src="https://...">` tags in `<head>`, consistent with lucide/chart.js.

## Authentication backend (`BD_2.2/`)

A dockerized **Express + TypeScript + JWT** auth server lives in `BD_2.2/server/`, alongside the PostgreSQL schema (`SQL_Tabelas_2.2.sql`). It is **ported from `auth-kit/`** (same `controllers/services/middleware/routes` shape, same `JwtPayload`, same `POST /api/auth/login` + `GET /api/auth/me` contract, HS256, in-memory rate limit), with **one substitution: auth-kit's LDAP path is replaced by a Postgres path** — login validates against `usuarios.senhaHash` with **bcrypt** (`src/auth/services/user.repo.ts` + `auth.service.ts`). An **admin-emergency fallback** via `ADMIN_USER`/`ADMIN_PASSWORD` (env) bypasses the DB so the prototype works even with no data.

Key facts when touching it:
- `usuarios.login`/`senhaHash` and `funcionarios.matricula` are `CHAR(n)` (space-padded) — queries **must `TRIM`** them, or `bcrypt.compare` fails on the padded hash.
- `usuarios."tipoUsuario"` is a `bit`; `profile.service.ts` maps it to role/profile (`1`→admin/fiscal, `0`→fiscal/usuario_comum). `pg` returns bit as the string `"1"`/`"0"`.
- The API also **static-serves the frontend** from the project root (mounted read-only at `/frontend`), so everything is same-origin (no CORS). `dotfiles:"ignore"` keeps `.env` unreachable over HTTP.
- DB schema + seed (`db/init/01-schema.sql`, `02-seed.sql`) run **only on first volume creation**; after changing them, recreate with `docker compose down -v`.

### Frontend auth wiring
- `login.html` POSTs `/api/auth/login {username,password}` and stores `{ token, ...user }` in `sessionStorage["auth_user"]`.
- `utils.js` (loaded by every page, now including `login.html`) provides `getSession`/`getToken`/`clearSession`, `apiFetch()` (injects `Authorization: Bearer`, redirects to `login.html` on 401), and `requireAuth()` (runs immediately on load; skips `login.html`, else validates the token via `/api/auth/me`). Logout (`setupSair`) clears the session.

## Running

**Auth backend + full app (dockerized):** from `BD_2.2/`, `cp .env.example .env` then `docker compose up --build`. Open **http://localhost:3001/login.html**. The API serves the static frontend on the same origin. DB host port is mapped to **5433** (5432 is assumed busy locally). Seeded login: `fiscal` / `fiscal123`; admin-fallback: `admin` / value of `ADMIN_PASSWORD`.

**Dev mode (hot reload in Docker):** `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`. The override (`docker-compose.dev.yml`) mounts `server/src` from the host and runs `tsx watch`, so saving a `.ts` file restarts the server in-container; it also sets `NODE_ENV=development` (enables the `DEV_TOKEN` bypass). `GET /api/health` returns `{ ok, db, mode }` — `mode` reflects `NODE_ENV`.

**Backend alone (no Docker):** from `BD_2.2/server/`, `npm install` then `npm run dev` (runs TS via `tsx`, no build step). Needs `JWT_SECRET` (+ `DB_*` or `DATABASE_URL` for DB login; without them only admin-fallback works).

The domain pages still persist their data per-browser in `localStorage`; CSV export on Machines/Departments is the backup. There are no tests, linters, or CI.

## Notes on repo files

- `redme.md` is the real project README (the tracked `README.md` is a near-empty UTF-16 stub).
- `plam.html` is **not an app page** — it's a pt-BR improvement/bug-tracking plan document. It catalogs known issues (e.g. missing `#serial` input and `#exportBtn` in `machines.html`, malformed HTML in `departments.html`, duplicated helpers). Consult it before "fixing" something that may already be documented there.
- `BD_2.2/` holds the PostgreSQL schema (`SQL_Tabelas_2.2.sql`), ER diagrams (`.pgerd`/`.drawio`/`.jpg`), **and** the auth backend (`server/`, `docker-compose.yml`, `db/init/`). The schema (`tabelasInventarioMaquina`) is now wired into auth via Docker; the domain tables (equipamentos, departamentos, etc.) are **not yet** used by the frontend — migrating localStorage → Postgres is the next step.
- `auth-kit/` is the upstream LDAP+JWT reference kit the backend was adapted from (React client + Express server). The live backend is `BD_2.2/server/`, not `auth-kit/` itself.
