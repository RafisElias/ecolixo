import { useActionState, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { RegisterState } from "../types";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState("citizen");

  const [state, formAction, isPending] = useActionState<RegisterState, FormData>(
    async (_prev, formData) => {
      const password = formData.get("password") as string;
      const passwordConfirm = formData.get("passwordConfirm") as string;

      if (password !== passwordConfirm) {
        return { error: "Senhas não conferem", success: false };
      }

      try {
        await register(
          formData.get("name") as string,
          formData.get("email") as string,
          password,
          formData.get("type") as string,
          (formData.get("registrationCode") as string) || "",
        );
        return { error: null, success: true };
      } catch (err: unknown) {
        const detail =
          err && typeof err === "object" && "response" in err
            ? (err as { response: { data: { detail: string } } }).response?.data?.detail
            : "Erro ao cadastrar";
        return { error: detail || "Erro ao cadastrar", success: false };
      }
    },
    { error: null, success: false },
  );

  if (state.success) {
    navigate("/login");
    toast.success("Conta criada! Faça login.");
  }

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
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Criar conta</h1>

        <form action={formAction}>
          {state.error && (
            <p
              style={{
                color: "var(--danger)",
                fontSize: 13,
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              {state.error}
            </p>
          )}

          <div className="form-group">
            <label>Nome completo</label>
            <input name="name" defaultValue="" required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" defaultValue="" required />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input name="password" type="password" defaultValue="" required minLength={6} />
          </div>
          <div className="form-group">
            <label>Confirmar senha</label>
            <input name="passwordConfirm" type="password" defaultValue="" required minLength={6} />
          </div>
          <div className="form-group">
            <label>Tipo de conta</label>
            <select name="type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="citizen">Cidadão</option>
              <option value="manager">Gestor Municipal</option>
            </select>
          </div>
          {type === "manager" && (
            <div className="form-group">
              <label>Código de registro do gestor</label>
              <input
                name="registrationCode"
                type="password"
                defaultValue=""
                placeholder="Código fornecido pela administração"
                required
              />
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={isPending}
          >
            {isPending ? "Cadastrando…" : "Criar conta"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--text-muted)" }}>
          Já tem conta?{" "}
          <Link to="/login" style={{ color: "var(--green)", fontWeight: 600 }}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
