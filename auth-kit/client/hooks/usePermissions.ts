import { useAuth } from "./useAuth";
import type { Profile } from "../types";

export function usePermissions() {
  const { usuario } = useAuth();
  const profile: Profile = usuario?.profile ?? "usuario_comum";

  const isFiscal = profile === "fiscal";
  const isAdminFiscalizacao = profile === "admin_fiscalizacao";
  const isUsuarioComum = profile === "usuario_comum";

  return {
    profile,
    isFiscal,
    isAdminFiscalizacao,
    isUsuarioComum,
    hasProfile: (allowed: Profile[]) => allowed.includes(profile),
  };
}
