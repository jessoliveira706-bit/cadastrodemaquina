import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  Usuario,
  StoredUser,
  ApiUser,
  LoginResponse,
  MeResponse,
} from "../types";
import { api, ApiError, setApiStorageKey } from "../services/api";

interface AuthContextType {
  usuario: Usuario | null;
  login: (creds: { matricula: string; senha: string }) => Promise<boolean>;
  logout: () => void;
}

function mapUser(apiUser: ApiUser, token: string, fallbackId?: string): StoredUser {
  return {
    id: apiUser.usuario_id ?? apiUser.sub ?? fallbackId ?? "",
    nome: apiUser.nome,
    matricula: apiUser.matricula,
    cargo: apiUser.role === "admin" ? "Administrador" : "Fiscal",
    profile: apiUser.profile ?? "usuario_comum",
    token,
  };
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
  storageKey = "auth_user",
}: {
  children: ReactNode;
  storageKey?: string;
}) {
  setApiStorageKey(storageKey);

  function readStored(): StoredUser | null {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  }

  const [usuario, setUsuario] = useState<Usuario | null>(readStored);

  useEffect(() => {
    const stored = readStored();
    if (!stored?.token) return;

    api
      .get<MeResponse>("/api/auth/me")
      .then((data) => {
        const refreshed = mapUser(data.user, stored.token, stored.id);
        setUsuario(refreshed);
        sessionStorage.setItem(storageKey, JSON.stringify(refreshed));
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setUsuario(null);
          sessionStorage.removeItem(storageKey);
        }
      });
  }, [storageKey]);

  const login = useCallback(
    async (creds: { matricula: string; senha: string }) => {
      try {
        const result = await api.post<LoginResponse>("/api/auth/login", {
          username: creds.matricula,
          password: creds.senha,
        });
        const stored = mapUser(result.user, result.token);
        setUsuario(stored);
        sessionStorage.setItem(storageKey, JSON.stringify(stored));
        return true;
      } catch {
        return false;
      }
    },
    [storageKey],
  );

  const logout = useCallback(() => {
    setUsuario(null);
    sessionStorage.removeItem(storageKey);
  }, [storageKey]);

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
