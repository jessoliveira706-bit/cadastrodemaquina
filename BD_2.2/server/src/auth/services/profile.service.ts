export type Profile = "fiscal" | "usuario_comum" | "admin_fiscalizacao";

/**
 * Mapeia a coluna usuarios."tipoUsuario" (bit) para o profile/role internos.
 *
 * tipoUsuario = 1 (true)  -> administrador  -> role "admin",  profile "fiscal"
 * tipoUsuario = 0 (false) -> usuário comum  -> role "fiscal", profile "usuario_comum"
 *
 * O `pg` devolve bit como string ("1"/"0") ou boolean dependendo do driver;
 * `isAdmin()` normaliza ambos.
 */
export function isAdmin(tipoUsuario: unknown): boolean {
  if (typeof tipoUsuario === "boolean") return tipoUsuario;
  const s = String(tipoUsuario).trim();
  return s === "1" || s.toLowerCase() === "true";
}

export function mapearProfile(tipoUsuario: unknown): Profile {
  return isAdmin(tipoUsuario) ? "fiscal" : "usuario_comum";
}

export function mapearRole(tipoUsuario: unknown): "admin" | "fiscal" {
  return isAdmin(tipoUsuario) ? "admin" : "fiscal";
}
