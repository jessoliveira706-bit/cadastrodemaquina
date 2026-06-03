import type { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { AuthRequest, JwtPayload } from "../types";
import type { Profile } from "../services/profile.service";

const DEV_TOKEN = process.env.DEV_TOKEN ?? "dev-token";

const DEV_USER: JwtPayload = {
  sub: "dev",
  nome: "Dev User",
  matricula: "00000",
  role: "admin",
  profile: "fiscal",
};

export function authRequired(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }

  if (process.env.NODE_ENV !== "production" && token === DEV_TOKEN) {
    req.user = DEV_USER;
    next();
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Configuração inválida do servidor" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] }) as JwtPayload;
    req.user = { ...decoded, profile: decoded.profile ?? "usuario_comum" };
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

export function requireProfile(
  profiles: Profile[],
): (req: AuthRequest, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const profile = req.user?.profile;
    if (!profile || !profiles.includes(profile)) {
      res.status(403).json({ error: "Sem permissão para esta operação" });
      return;
    }
    next();
  };
}
