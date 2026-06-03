import type { Request, Response, NextFunction } from "express";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-api-key"];
  if (typeof key !== "string") {
    res.status(401).json({ error: "X-API-Key obrigatório" });
    return;
  }

  const valid = (process.env.EXTERNAL_API_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (!valid.includes(key)) {
    res.status(401).json({ error: "Chave inválida" });
    return;
  }

  next();
}
