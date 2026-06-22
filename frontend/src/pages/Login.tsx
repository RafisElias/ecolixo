import { useActionState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [error, formAction, isPending] = useActionState<string | null, FormData>(
    async (_prev, formData) => {
      try {
        await login(formData.get("email") as string, formData.get("password") as string);
        navigate("/map");
        return null;
      } catch {
        return "Email ou senha incorretos";
      }
    },
    null,
  );

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100dvh",
        background: "var(--bg)",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 400 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>🌿 EcoLixo</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 24, fontSize: 14 }}>
          Mapeamento de resíduos eletrônicos
        </p>

        <form action={formAction}>
          {error && (
            <p
              style={{
                color: "var(--danger)",
                fontSize: 13,
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}

          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" defaultValue="" required />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input name="password" type="password" defaultValue="" required />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={isPending}
          >
            {isPending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--text-muted)" }}>
          Não tem conta?{" "}
          <Link to="/register" style={{ color: "var(--green)", fontWeight: 600 }}>
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
