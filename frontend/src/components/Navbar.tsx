import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchNotifications } from "../services/notificationService";
import type { Notification } from "../types";

function NavLink({ to, label, current }: { to: string; label: string; current: string }) {
  const active = current === to;
  return (
    <Link
      to={to}
      style={{
        color: "#fff",
        fontWeight: active ? 700 : 400,
        borderBottom: active ? "2px solid #fff" : "2px solid transparent",
        paddingBottom: 2,
        fontSize: 14,
      }}
    >
      {label}
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications", location.pathname, user?.id],
    queryFn: fetchNotifications,
    enabled: !!user,
  });
  const unread = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isManager = user?.type === "manager";

  return (
    <nav
      style={{
        background: "#2e7d32",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        height: 56,
        gap: 24,
        flexShrink: 0,
      }}
    >
      <Link to="/home" style={{ fontWeight: 800, fontSize: 18, marginRight: 12, color: "#fff" }}>
        🌿 EcoLixo
      </Link>

      <NavLink to="/map" label="Mapa" current={location.pathname} />
      {!isManager && <NavLink to="/new-report" label="Registrar" current={location.pathname} />}
      {isManager && <NavLink to="/dashboard" label="Painel" current={location.pathname} />}
      {isManager && <NavLink to="/analytics" label="Relatórios" current={location.pathname} />}

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
        {unread > 0 && (
          <span
            style={{
              background: "#ff5722",
              borderRadius: "50%",
              width: 22,
              height: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {unread}
          </span>
        )}
        <span style={{ fontSize: 13, opacity: 0.85 }}>{user?.name}</span>
        <button
          onClick={handleLogout}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            color: "#fff",
            padding: "5px 12px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Sair
        </button>
      </div>
    </nav>
  );
}
