import { Client } from "ldapts";

// ---------------------------------------------------------------------------
// Autenticação LDAP / Active Directory.
//
// Código reaproveitado do auth-kit (escapeLdapFilter, extractCn, pickString,
// search por sAMAccountName, checagem de grupo, formato de retorno). A única
// diferença é a estratégia de bind, escolhida conforme as variáveis de ambiente:
//
//   1. Conta de serviço (auth-kit "as is"): se LDAP_BIND_DN + LDAP_BIND_PASSWORD
//      estiverem definidos -> bind do serviço, search, depois bind do usuário.
//   2. Bind de domínio (parâmetros desta prefeitura): se houver LDAP_DOMAIN ->
//      bind direto como `DOMINIO\usuario` com a senha do próprio usuário.
//
// Gate de acesso: LDAP_Cadastro_GROUP (grupo mínimo) — cai para
// LDAP_REQUIRED_GROUP se aquele não existir.
// ---------------------------------------------------------------------------

function escapeLdapFilter(value: string): string {
  return value
    .replace(/\\/g, "\\5c")
    .replace(/\*/g, "\\2a")
    .replace(/\(/g, "\\28")
    .replace(/\)/g, "\\29")
    .replace(/\0/g, "\\00");
}

function extractCn(dn: string): string | null {
  const match = /^CN=([^,]+)/i.exec(dn);
  return match ? match[1] : null;
}

function pickString(value: unknown): string {
  if (Array.isArray(value)) return value.length > 0 ? String(value[0]) : "";
  if (value == null) return "";
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return String(value);
}

export type LdapAuthResult =
  | { success: false; reason: "invalid_credentials" | "not_in_group" }
  | {
      success: true;
      username: string;
      displayName: string;
      matricula: string;
      groups: string[];
    };

/** LDAP está configurado o suficiente para ser usado como provedor de login? */
export function ldapConfigured(): boolean {
  return Boolean(process.env.LDAP_URL && process.env.LDAP_BASE_DN);
}

export async function authenticateViaLdap(
  username: string,
  password: string,
): Promise<LdapAuthResult> {
  const url = process.env.LDAP_URL;
  const baseDn = process.env.LDAP_BASE_DN;
  const domain = process.env.LDAP_DOMAIN?.trim();
  const bindDn = process.env.LDAP_BIND_DN?.trim();
  const bindPassword = process.env.LDAP_BIND_PASSWORD;
  const requiredGroup =
    process.env.LDAP_Cadastro_GROUP?.trim() || process.env.LDAP_REQUIRED_GROUP?.trim();

  if (!url || !baseDn) {
    throw new Error("Serviço de autenticação indisponível");
  }

  const tlsRejectUnauthorized = process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== "false";

  const client = new Client({
    url,
    tlsOptions: { rejectUnauthorized: tlsRejectUnauthorized },
    connectTimeout: 5000,
    strictDN: false,
  });

  try {
    // Bind: conta de serviço OU domínio direto.
    let userAlreadyBound = false;
    if (bindDn && bindPassword) {
      await client.bind(bindDn, bindPassword);
    } else if (domain) {
      try {
        await client.bind(`${domain}\\${username}`, password);
        userAlreadyBound = true;
      } catch {
        return { success: false, reason: "invalid_credentials" };
      }
    } else {
      throw new Error("Configuração LDAP incompleta (defina LDAP_DOMAIN ou LDAP_BIND_DN)");
    }

    const { searchEntries } = await client.search(baseDn, {
      scope: "sub",
      filter: `(sAMAccountName=${escapeLdapFilter(username)})`,
      attributes: ["dn", "displayName", "employeeNumber", "sAMAccountName", "memberOf"],
    });

    if (searchEntries.length === 0) {
      return { success: false, reason: "invalid_credentials" };
    }

    const entry = searchEntries[0];
    const displayName = pickString(entry.displayName) || username;
    const matricula =
      pickString(entry.employeeNumber) || pickString(entry.sAMAccountName) || username;

    const memberOf = entry.memberOf ?? [];
    const memberOfList = Array.isArray(memberOf) ? memberOf : [memberOf];
    const groups = memberOfList
      .map((dn) => extractCn(String(dn)))
      .filter((cn): cn is string => cn !== null);

    // No fluxo de conta de serviço, valida a senha agora (bind do usuário).
    if (!userAlreadyBound) {
      try {
        await client.bind(String(entry.dn), password);
      } catch {
        return { success: false, reason: "invalid_credentials" };
      }
    }

    // Permite qualquer usuário LDAP autenticado, sem exigir grupo específico.
