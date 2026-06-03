import type { Request, Response } from "express";
import type { AuthRequest, UpsertUser } from "../types";
import { createAuthService } from "../services/auth.service";

export function createAuthController(upsertUser?: UpsertUser) {
  const service = createAuthService(upsertUser);

  async function login(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body as { username?: string; password?: string };

    if (!username || !password) {
      res.status(400).json({ error: "Usuário e senha são obrigatórios" });
      return;
    }

    try {
      const result = await service.login(username.trim(), password);
      res.json(result);
    } catch (err: unknown) {
      const message = (err as Error).message;
      if (message === "Credenciais inválidas") {
        res.status(401).json({ error: message });
        return;
      }
      res.status(503).json({ error: "Serviço de autenticação indisponível" });
    }
  }

  function me(req: AuthRequest, res: Response): void {
    res.json({ user: req.user });
  }

  return { login, me };
}
