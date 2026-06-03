# auth-kit

Drop-in LDAP + JWT authentication for Express + React. Extracted from SFN.

## Features

- LDAP/AD authentication via `ldapts` (service-account bind → search → user-DN bind)
- JWT (HS256, 48h default)
- Admin emergency fallback (env-gated, bypasses LDAP)
- RBAC by `profile` derived from AD groups
- Pluggable user upsert callback (no DB coupling)
- Rate limit middleware (in-memory)
- API-key middleware for external endpoints
- React Context + `sessionStorage` session, `Bearer` injection, `ProtectedRoute`

## Install

### Server
```bash
npm i express jsonwebtoken ldapts
npm i -D @types/jsonwebtoken @types/express typescript
```

Copy `server/*` into your project. Mount routes:

```ts
import express from "express";
import { createAuthRouter } from "./auth/routes/auth.routes";

const app = express();
app.use(express.json());
app.use("/api/auth", createAuthRouter({
  upsertUser: async (u) => {
    // persist user, return id (or undefined if DB down)
    return undefined;
  },
}));
```

Protect routes:
```ts
import { authRequired, requireProfile } from "./auth/middleware/auth";

app.get("/api/secret", authRequired, (req, res) => res.json({ user: req.user }));
app.post("/api/admin", authRequired, requireProfile(["fiscal"]), handler);
```

### Client
```bash
npm i react react-router
```

Copy `client/*` into your project. Wrap app:

```tsx
import { AuthProvider } from "./auth/hooks/useAuth";
import { ProtectedRoute } from "./auth/components/ProtectedRoute";

<AuthProvider storageKey="myapp_user">
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute><AppLayout/></ProtectedRoute>}>
        <Route path="/" element={<HomePage/>} />
      </Route>
    </Routes>
  </BrowserRouter>
</AuthProvider>
```

API client reads token from same `storageKey`.

## Env vars

```env
# JWT
JWT_SECRET=<32+ random bytes>
JWT_EXPIRES_IN=48h

# LDAP
LDAP_URL=ldaps://host:636
LDAP_BASE_DN=DC=...
LDAP_BIND_DN=DOMAIN\service-account
LDAP_BIND_PASSWORD=...
LDAP_TLS_REJECT_UNAUTHORIZED=false
LDAP_REQUIRED_GROUP=               # optional hard gate; empty = RBAC decides
LDAP_FISCAL_GROUP=YourFiscalGroup  # CN that maps to profile=fiscal
LDAP_ADMIN_GROUP=                  # CN that maps to profile=admin

# Admin emergency (bypasses LDAP)
ADMIN_USER=admin
ADMIN_PASSWORD=

# External API
EXTERNAL_API_KEYS=key1,key2

# Dev bypass token (NODE_ENV != production only)
DEV_TOKEN=dev-token
```

## Customizing profiles

Edit `server/services/profile.service.ts` — change `Profile` union + `mapearProfile` rules.
Mirror changes in `client/hooks/usePermissions.ts`.

## Security notes

1. **JWT_SECRET mandatory** — service throws if missing. HS256 only.
2. **LDAP filter sanitized** via `escapeLdapFilter`. Don't bypass.
3. **Bind twice**: service account searches, then user bind validates password. Never bind directly without search.
4. **`sessionStorage`** (not localStorage) — clears on tab close. XSS still a risk.
5. **In-memory rate limit** — single-process only. For multi-replica use Redis.
6. **Dev bypass** disabled in production via `NODE_ENV` check.
7. **TLS rejection** — `LDAP_TLS_REJECT_UNAUTHORIZED=false` only for self-signed in dev/internal.
