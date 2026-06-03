import type { Request } from "express";
import type { Profile } from "./services/profile.service";

export interface JwtPayload {
  sub: string;
  nome: string;
  matricula: string;
  role: "fiscal" | "admin";
  profile: Profile;
  usuario_id?: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
