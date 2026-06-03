import { Client } from "ldapts";

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

export type LdapAuthResult =
  | { success: false; reason: "invalid_credentials" | "not_in_group" }
  | {
      success: true;
      username: string;
      displayName: string;
      matricula: string;
      groups: string[];
    };

/**
 * Authenticate against AD.
 *
 * 1. Bind with service account, search by sAMAccountName.
 * 2. Optional hard gate via LDAP_REQUIRED_GROUP.
 * 3. Bind with user DN + password to validate credentials.
 * 4. Returns { success: false } for bad creds or missing group.
 *    Throws only on connectivity failure.
 */
export async function authenticateViaLdap(
  username: string,
  password: string,
): Promise<LdapAuthResult> {
  const url = process.env.LDAP_URL;
  const baseDn = process.env.LDAP_BASE_DN;
  const bindDn = process.env.LDAP_BIND_DN;
  const bindPassword = process.env.LDAP_BIND_PASSWORD;
  const requiredGroup = process.env.LDAP_REQUIRED_GROUP?.trim();

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
    await client.bind(bindDn ?? "", bindPassword ?? "");

    const { searchEntries } = await client.search(baseDn, {
      scope: "sub",
      filter: `(sAMAccountName=${escapeLdapFilter(username)})`,
      attributes: ["dn", "displayName", "employeeNumber", "sAMAccountName", "memberOf"],
    });

    if (searchEntries.length === 0) {
      return { success: false, reason: "invalid_credentials" };
    }

    const entry = searchEntries[0];
    const userDn = entry.dn;

    function pickString(value: unknown): string {
      if (Array.isArray(value)) return value.length > 0 ? String(value[0]) : "";
      if (value == null) return "";
      if (Buffer.isBuffer(value)) return value.toString("utf8");
      return String(value);
    }

    const displayName = pickString(entry.displayName) || username;
    const matricula =
      pickString(entry.employeeNumber) ||
      pickString(entry.sAMAccountName) ||
      username;

    const memberOf = entry.memberOf ?? [];
    const memberOfList = Array.isArray(memberOf) ? memberOf : [memberOf];
    const groups = memberOfList
      .map((dn) => extractCn(String(dn)))
      .filter((cn): cn is string => cn !== null);

    if (requiredGroup) {
      const inGroup = groups.some((cn) => cn.toLowerCase() === requiredGroup.toLowerCase());
      if (!inGroup) return { success: false, reason: "not_in_group" };
    }

    try {
      await client.bind(userDn, password);
    } catch {
      return { success: false, reason: "invalid_credentials" };
    }

    return { success: true, username, displayName, matricula, groups };
  } catch (err: unknown) {
    throw new Error("Serviço de autenticação indisponível");
  } finally {
    await client.unbind().catch(() => {});
  }
}
