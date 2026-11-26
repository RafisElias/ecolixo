import { isAxiosError } from "axios";
import { useActionState, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";

function emailError(value: string): string | null {
  if (!value.trim()) return "Informe seu e-mail.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))
    return "Informe um e-mail válido, como nome@exemplo.com.";
  return null;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email: string | null; password: string | null }>(
    { email: null, password: null },
  );

  const [error, formAction, isPending] = useActionState<string | null, FormData>(
    async (_prev, formData) => {
      const submittedEmail = String(formData.get("email") || "").trim();
      const submittedPassword = String(formData.get("password") || "");
      const validation = {
        email: emailError(submittedEmail),
        password: submittedPassword ? null : "Informe sua senha.",
      };
      setFieldErrors(validation);
      if (validation.email || validation.password) return null;
      try {
        await login(submittedEmail, submittedPassword);
        navigate("/map");
        return null;
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 401) return "Email ou senha incorretos";
        if (isAxiosError(err) && err.response?.status === 429)
          return "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.";
        if (isAxiosError(err) && !err.response)
          return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
        return "Não foi possível entrar agora. Tente novamente em instantes.";
      }
    },
    null,
  );

  const errors =
    fieldErrors.email || fieldErrors.password
      ? [fieldErrors.email, fieldErrors.password].filter((message): message is string => !!message)
      : error
        ? [error]
        : [];

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

        <form
          action={formAction}
          noValidate
          onSubmit={(event) => {
            const validation = {
              email: emailError(email),
              password: password ? null : "Informe sua senha.",
            };
            setFieldErrors(validation);
            if (validation.email || validation.password) {
              event.preventDefault();
              const field = event.currentTarget.elements.namedItem(
                validation.email ? "email" : "password",
              );
              if (field instanceof HTMLInputElement) field.focus();
            }
          }}
        >
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email)
                  setFieldErrors({ ...fieldErrors, email: emailError(e.target.value) });
              }}
              onBlur={() => setFieldErrors((prev) => ({ ...prev, email: emailError(email) }))}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={errors.length ? "login-error" : undefined}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Senha</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password)
                  setFieldErrors({
                    ...fieldErrors,
                    password: e.target.value ? null : "Informe sua senha.",
                  });
              }}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={errors.length ? "login-error" : undefined}
              required
            />
          </div>

          {errors.length > 0 && (
            <div
              id="login-error"
              role="alert"
              aria-atomic="true"
              style={{
                color: "var(--danger)",
                background: "#ffebee",
                border: "1px solid #ef9a9a",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                lineHeight: 1.5,
                marginBottom: 12,
              }}
            >
              {errors.map((message) => (
                <p key={message} style={{ margin: 0 }}>
                  {message}
                </p>
              ))}
            </div>
          )}

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
