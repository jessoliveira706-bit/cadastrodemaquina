import type { Request, Response } from "express";
import type { AuthRequest } from "../types";
import { login as loginService, resetPassword as resetPasswordService } from "../services/auth.service";

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

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { login, newPassword } = req.body as { login?: string; newPassword?: string };
  if (!login || !newPassword) {
    res.status(400).json({ error: "Login e nova senha são obrigatórios" });
    return;
  }
  try {
    await resetPasswordService(login.trim(), newPassword);
    res.json({ message: "Senha alterada com sucesso" });
  } catch (err: unknown) {
    const message = (err as Error).message;
    if (message === "Usuário não encontrado") {
      res.status(404).json({ error: message });
      return;
    }
    console.error("Falha ao redefinir senha:", message);
    res.status(503).json({ error: "Serviço indisponível" });
  }
}
