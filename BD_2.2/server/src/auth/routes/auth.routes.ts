import { Router } from "express";
import * as ctrl from "../controllers/auth.controller";
import { rateLimit } from "../middleware/rateLimit";
import { authRequired } from "../middleware/auth";
import type { AuthRequest } from "../types";

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/login", rateLimit(15, 15 * 60 * 1000), ctrl.login);
  router.post("/reset-password", ctrl.resetPassword);
  router.get("/me", authRequired, (req, res) => ctrl.me(req as AuthRequest, res));

  return router;
}
