import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import type { Profile } from "../types";

export function ProtectedRoute({
  children,
  profiles,
  redirectTo = "/login",
  fallback = "/",
}: {
  children: React.ReactNode;
  profiles?: Profile[];
  redirectTo?: string;
  fallback?: string;
}) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to={redirectTo} replace />;
  if (profiles && !profiles.includes(usuario.profile)) {
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}
