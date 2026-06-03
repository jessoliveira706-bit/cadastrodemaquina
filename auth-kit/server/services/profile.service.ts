export type Profile = "fiscal" | "usuario_comum" | "admin_fiscalizacao";

const FISCAL_GROUP = (process.env.LDAP_FISCAL_GROUP ?? "Fiscal").toLowerCase();
const ADMIN_GROUP = process.env.LDAP_ADMIN_GROUP?.toLowerCase();

/**
 * Maps LDAP group CNs to internal profile.
 * Order: admin_fiscalizacao (if env set) → fiscal → usuario_comum (fallback).
 */
export function mapearProfile(groups: string[]): Profile {
  const lower = groups.map((g) => g.toLowerCase());
  if (ADMIN_GROUP && lower.includes(ADMIN_GROUP)) return "admin_fiscalizacao";
  if (lower.includes(FISCAL_GROUP)) return "fiscal";
  return "usuario_comum";
}
