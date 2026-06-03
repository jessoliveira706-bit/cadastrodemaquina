import type { Request, Response } from "express";
import type { AuthRequest } from "../types";
import { login as loginService } from "../services/auth.service";

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Usuário e senha são obrigatórios" });
    return;
  }

  try {
    const result = await loginService(username.trim(), password);
    res.json(result);
  } catch (err: unknown) {
    const message = (err as Error).message;
    if (message === "Credenciais inválidas") {
      res.status(401).json({ error: message });
      return;
    }
    if (message === "Sem permissão de acesso") {
      res.status(403).json({ error: message });
      return;
    }
    console.error("Falha no login:", message);
    res.status(503).json({ error: "Serviço de autenticação indisponível" });
  }
}

export function me(req: AuthRequest, res: Response): void {
  res.json({ user: req.user });
}
