import { Router } from "express";
import { createAuthController } from "../controllers/auth.controller";
import { rateLimit } from "../middleware/rateLimit";
import { authRequired } from "../middleware/auth";
import type { AuthRequest, UpsertUser } from "../types";

export function createAuthRouter(opts: { upsertUser?: UpsertUser } = {}) {
  const router = Router();
  const ctrl = createAuthController(opts.upsertUser);

  router.post("/login", rateLimit(15, 15 * 60 * 1000), ctrl.login);
  router.get("/me", authRequired, (req, res) => ctrl.me(req as AuthRequest, res));

  return router;
}
