import "dotenv/config";
import path from "node:path";
import express from "express";
import helmet from "helmet";
import { createAuthRouter } from "./auth/routes/auth.routes";
import { dbEnabled } from "./db/pool";

const app = express();

// helmet sem CSP estrito: as páginas usam CDNs (lucide, chart.js) e estilos inline.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

// CORS opcional — só necessário se o frontend for servido por outra origem.
const corsOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (corsOrigins.length > 0) {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, db: dbEnabled(), mode: process.env.NODE_ENV ?? "development" });
});

app.use("/api/auth", createAuthRouter());

// Frontend estático (mesma origem → sem CORS). dotfiles:"ignore" protege .env.
const frontendDir = process.env.FRONTEND_DIR
  ? path.resolve(process.env.FRONTEND_DIR)
  : path.resolve(__dirname, "../../.."); // BD_2.2/server/src -> raiz do projeto

app.use(express.static(frontendDir, { dotfiles: "ignore", extensions: ["html"] }));

app.get("/", (_req, res) => {
  res.sendFile(path.join(frontendDir, "login.html"));
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`Auth server ouvindo em :${port} | DB ${dbEnabled() ? "ativo" : "desligado (admin-fallback)"}`);
  console.log(`Frontend servido de: ${frontendDir}`);
});
