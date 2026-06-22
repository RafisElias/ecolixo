import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const FEATURES = [
  {
    icon: "🗺️",
    title: "Mapa interativo",
    desc: "Visualize todos os pontos de coleta de resíduos eletrônicos próximos a você em um mapa interativo com filtros por categoria e status.",
  },
  {
    icon: "📱",
    title: "Cadastro simplificado",
    desc: "Registre novos pontos de coleta com foto, descrição e localização GPS diretamente do seu celular.",
  },
  {
    icon: "📊",
    title: "Relatórios analíticos",
    desc: "Gestores acompanham estatísticas por status e categoria, facilitando a tomada de decisão.",
  },
  {
    icon: "🔔",
    title: "Notificações",
    desc: "Receba atualizações sobre o status dos pontos que você cadastrou.",
  },
];

const STEPS = [
  { num: "1", title: "Crie sua conta", desc: "Cadastre-se como cidadão ou gestor em segundos." },
  {
    num: "2",
    title: "Localize um ponto",
    desc: "Encontre pontos de coleta no mapa perto de você.",
  },
  {
    num: "3",
    title: "Registre",
    desc: "Tem resíduo eletrônico para descartar? Cadastre um novo ponto.",
  },
  {
    num: "4",
    title: "Acompanhe",
    desc: "Gestores analisam e atualizam o status de cada registro.",
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {/* ─── Hero ─── */}
      <section
        style={{
          background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 40%, #43a047 100%)",
          color: "#fff",
          padding: "60px 24px 80px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 8px" }}>EcoLixo</h1>
        <p style={{ fontSize: 18, opacity: 0.9, maxWidth: 520, margin: "0 auto 32px" }}>
          Mapeamento colaborativo de pontos de coleta de resíduos eletrônicos
        </p>

        {user ? (
          <Link
            to="/map"
            className="btn"
            style={{
              background: "#fff",
              color: "#2e7d32",
              fontWeight: 700,
              padding: "12px 32px",
              fontSize: 16,
              borderRadius: 999,
              display: "inline-flex",
            }}
          >
            Ir para o mapa
          </Link>
        ) : (
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              to="/login"
              className="btn"
              style={{
                background: "#fff",
                color: "#2e7d32",
                fontWeight: 700,
                padding: "12px 32px",
                fontSize: 16,
                borderRadius: 999,
                display: "inline-flex",
              }}
            >
              Entrar
            </Link>
            <Link
              to="/register"
              className="btn"
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                fontWeight: 700,
                padding: "12px 32px",
                fontSize: 16,
                borderRadius: 999,
                display: "inline-flex",
                border: "2px solid rgba(255,255,255,0.4)",
              }}
            >
              Cadastre-se
            </Link>
          </div>
        )}
      </section>

      {/* ─── Propósito ─── */}
      <section style={{ maxWidth: 720, margin: "-40px auto 0", padding: "0 20px" }}>
        <div
          className="card"
          style={{ marginBottom: 40, textAlign: "center", padding: "32px 24px" }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "#1b5e20" }}>
            O problema do lixo eletrônico
          </h2>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--text-muted)",
              maxWidth: 560,
              margin: "0 auto",
            }}
          >
            O Brasil descarta cerca de <strong>2 milhões de toneladas</strong> de resíduos
            eletrônicos por ano, mas apenas uma pequena parte é reciclada corretamente. O EcoLixo
            conecta cidadãos a pontos de coleta, facilitando o descarte responsável de computadores,
            pilhas, celulares e outros equipamentos eletrônicos.
          </p>
        </div>
      </section>

      {/* ─── Como funciona ─── */}
      <section style={{ maxWidth: 720, margin: "0 auto 48px", padding: "0 20px" }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 24,
            color: "#1b5e20",
          }}
        >
          Como funciona
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 16,
          }}
        >
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="card"
              style={{ textAlign: "center", padding: "20px 14px" }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "#e8f5e9",
                  color: "#2e7d32",
                  fontWeight: 800,
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                {step.num}
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{step.title}</h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Funcionalidades ─── */}
      <section
        style={{
          background: "#f0f4f0",
          padding: "48px 20px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              textAlign: "center",
              marginBottom: 24,
              color: "#1b5e20",
            }}
          >
            Funcionalidades
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {FEATURES.map((f) => (
              <div key={f.title} className="card" style={{ padding: "20px" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA final ─── */}
      <section style={{ padding: "48px 20px", textAlign: "center" }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            marginBottom: 12,
            color: "#1b5e20",
          }}
        >
          Faça parte da mudança
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-muted)",
            maxWidth: 440,
            margin: "0 auto 24px",
            lineHeight: 1.6,
          }}
        >
          Cada ponto de coleta registrado é um passo rumo a um futuro mais sustentável. Junte-se a
          nós e ajude a mapear o descarte correto de eletrônicos na sua cidade.
        </p>
        {!user && (
          <Link
            to="/register"
            className="btn btn-primary"
            style={{
              padding: "12px 36px",
              fontSize: 16,
              borderRadius: 999,
              display: "inline-flex",
            }}
          >
            Criar conta gratuita
          </Link>
        )}
      </section>

      {/* ─── Footer ─── */}
      <footer
        style={{
          background: "#1b5e20",
          color: "rgba(255,255,255,0.7)",
          textAlign: "center",
          padding: "20px",
          fontSize: 12,
        }}
      >
        <p>🌿 EcoLixo — Mapeamento colaborativo de resíduos eletrônicos</p>
      </footer>
    </div>
  );
}
