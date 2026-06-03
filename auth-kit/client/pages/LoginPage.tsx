import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router";

/**
 * Minimal LoginPage. Style it however your app needs.
 * Calls useAuth().login({ matricula, senha }) which POSTs /api/auth/login.
 */
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!usuario || !senha) {
      setErro("Preencha usuário e senha");
      return;
    }
    setLoading(true);
    setErro("");
    const ok = await login({ matricula: usuario, senha });
    setLoading(false);
    if (ok) navigate("/", { replace: true });
    else setErro("Usuário ou senha inválidos");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {erro && <div role="alert">{erro}</div>}
      <input
        type="text"
        value={usuario}
        onChange={(e) => setUsuario(e.target.value)}
        placeholder="Usuário"
        autoComplete="username"
      />
      <input
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        placeholder="Senha"
        autoComplete="current-password"
      />
      <button type="submit" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
