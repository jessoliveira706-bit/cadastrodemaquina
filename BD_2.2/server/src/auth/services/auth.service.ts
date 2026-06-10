import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { findByLogin } from "./user.repo";
import { mapearProfile, mapearRole } from "./profile.service";
import { authenticateViaLdap, ldapConfigured } from "./ldap.service";
import { pool } from "../../db/pool";
import type { JwtPayload } from "../types";

export async function resetPassword(
  login: string,
  newPassword: string,
): Promise<void> {
  if (!pool) throw new Error("Banco de dados indisponível");
  const row = await findByLogin(login);
  if (!row) throw new Error("Usuário não encontrado");
  const senhaHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE "tabelasInventarioMaquina".usuarios SET "senhaHash" = $1 WHERE id = $2`,
    [senhaHash, row.id],
  );
}

function makeToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET não configurado");
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "48h") as jwt.SignOptions["expiresIn"];
  return jwt.sign(payload, secret, { expiresIn, algorithm: "HS256" });
}

export async function login(
  username: string,
  password: string,
): Promise<{ token: string; user: Omit<JwtPayload, "iat" | "exp"> }> {
  // 1. Admin de emergência via env (não toca no banco).
  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminUser && adminPassword && username === adminUser) {
    if (password !== adminPassword) throw new Error("Credenciais inválidas");
    const userPayload: Omit<JwtPayload, "iat" | "exp"> = {
      sub: username,
      nome: "Administrador",
      matricula: username,
      role: "admin",
      profile: "fiscal",
    };
    return { token: makeToken(userPayload), user: userPayload };
  }

  // 2. Se o LDAP estiver configurado, ele é o provedor de login (não-admin).
  if (ldapConfigured()) {
    const result = await authenticateViaLdap(username, password);
    if (!result.success) {
      if (result.reason === "not_in_group") throw new Error("Sem permissão de acesso");
      throw new Error("Credenciais inválidas");
    }
    const userPayload: Omit<JwtPayload, "iat" | "exp"> = {
      sub: result.username,
      nome: result.displayName,
      matricula: result.matricula,
      role: "fiscal",
      profile: "fiscal",
    };
    return { token: makeToken(userPayload), user: userPayload };
  }

  // 3. Sem LDAP: autenticação local contra a tabela usuarios (bcrypt).
  const row = await findByLogin(username);
  if (!row) throw new Error("Credenciais inválidas");

  const ok = await bcrypt.compare(password, row.senhaHash);
  if (!ok) throw new Error("Credenciais inválidas");

  const userPayload: Omit<JwtPayload, "iat" | "exp"> = {
    sub: row.login,
    nome: row.nome || row.login,
    matricula: row.matricula,
    role: mapearRole(row.tipoUsuario),
    profile: mapearProfile(row.tipoUsuario),
    usuario_id: String(row.id),
  };

  return { token: makeToken(userPayload), user: userPayload };
}
