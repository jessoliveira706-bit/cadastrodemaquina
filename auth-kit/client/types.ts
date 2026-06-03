export type Profile = "fiscal" | "usuario_comum" | "admin_fiscalizacao";

export interface Usuario {
  id: string;
  nome: string;
  matricula: string;
  cargo: string;
  profile: Profile;
}

export interface StoredUser extends Usuario {
  token: string;
}

export interface ApiUser {
  sub: string;
  nome: string;
  matricula: string;
  role: "fiscal" | "admin";
  profile?: Profile;
  usuario_id?: string;
}

export interface LoginResponse {
  token: string;
  user: ApiUser;
}

export interface MeResponse {
  user: ApiUser;
}
