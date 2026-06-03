/**
 * Minimal example mounting auth-kit in a fresh Express app.
 * Adapt paths/imports to your project structure.
 */
import express from "express";
import helmet from "helmet";
import { createAuthRouter } from "./server/routes/auth.routes";
import { authRequired, requireProfile } from "./server/middleware/auth";
import { apiKeyAuth } from "./server/middleware/apiKeyAuth";
import type { AuthRequest, UpsertUser } from "./server/types";

const upsertUser: UpsertUser = async ({ login, nome, matricula, profile }) => {
  // Replace with your DB upsert. Return user id (UUID/string) or undefined on failure.
  console.log("upsert", { login, nome, matricula, profile });
  return undefined;
};

const app = express();
app.use(helmet());
app.use(express.json());

const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && corsOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use("/api/auth", createAuthRouter({ upsertUser }));

app.get("/api/me-secret", authRequired, (req, res) => {
  res.json({ user: (req as AuthRequest).user });
});

app.post(
  "/api/admin/action",
  authRequired,
  requireProfile(["fiscal", "admin_fiscalizacao"]),
  (_req, res) => res.json({ ok: true }),
);

app.get("/api/v1/external/ping", apiKeyAuth, (_req, res) => res.json({ pong: true }));

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`auth-kit example listening on :${port}`));
