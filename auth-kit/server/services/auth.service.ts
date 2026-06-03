import jwt from "jsonwebtoken";
import { authenticateViaLdap } from "./ldap.service";
import { mapearProfile } from "./profile.service";
import type { JwtPayload, UpsertUser } from "../types";

function makeToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não configurado");
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "48h") as jwt.SignOptions["expiresIn"];
  return jwt.sign(payload, secret, { expiresIn, algorithm: "HS256" });
}

export function createAuthService(upsertUser?: UpsertUser) {
  async function safeUpsert(
    login: string,
    nome: string,
    matricula: string,
    profile: ReturnType<typeof mapearProfile>,
  ): Promise<string | undefined> {
    if (!upsertUser) return undefined;
    try {
      return await upsertUser({ login, nome, matricula, profile });
    } catch {
      return undefined;
    }
  }

  async function login(
    username: string,
    password: string,
  ): Promise<{ token: string; user: Omit<JwtPayload, "iat" | "exp"> }> {
    const adminUser = process.env.ADMIN_USER;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminUser && adminPassword && username === adminUser) {
      if (password !== adminPassword) throw new Error("Credenciais inválidas");
      const usuario_id = await safeUpsert(username, "Administrador", username, "fiscal");
      const userPayload: Omit<JwtPayload, "iat" | "exp"> = {
        sub: username,
        nome: "Administrador",
        matricula: username,
        role: "admin",
        profile: "fiscal",
        usuario_id,
      };
      return { token: makeToken(userPayload), user: userPayload };
    }

    const result = await authenticateViaLdap(username, password);
    if (!result.success) throw new Error("Credenciais inválidas");

    const profile = mapearProfile(result.groups);
    const usuario_id = await safeUpsert(
      result.username,
      result.displayName,
      result.matricula,
      profile,
    );

    const userPayload: Omit<JwtPayload, "iat" | "exp"> = {
      sub: result.username,
      nome: result.displayName,
      matricula: result.matricula,
      role: "fiscal",
      profile,
      usuario_id,
    };

    return { token: makeToken(userPayload), user: userPayload };
  }

  return { login };
}
