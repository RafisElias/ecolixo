import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { fetchPoints, updatePointStatus } from "../services/pointService";
import type { DisposalPoint } from "../types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  under_review: "Em análise",
  resolved: "Resolvido",
};

export default function ManagerDashboard() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");

  const { data: points = [], isLoading } = useQuery<DisposalPoint[]>({
    queryKey: ["points", filter],
    queryFn: () => fetchPoints(filter ? { status: filter } : {}),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updatePointStatus(id, status),
    onSuccess: () => {
      toast.success("Status atualizado");
      queryClient.invalidateQueries({ queryKey: ["points"] });
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const counts = {
    total: points.length,
    pending: points.filter((p) => p.status === "pending").length,
    under_review: points.filter((p) => p.status === "under_review").length,
    resolved: points.filter((p) => p.status === "resolved").length,
  };

  return (
    <div className="page">
      <h2 className="page-title">Painel do Gestor</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Total", value: counts.total, color: "#1565c0" },
          { label: "Pendentes", value: counts.pending, color: "#e65100" },
          { label: "Em análise", value: counts.under_review, color: "#1565c0" },
          { label: "Resolvidos", value: counts.resolved, color: "#2e7d32" },
        ].map((c) => (
          <div key={c.label} className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        {["", "pending", "under_review", "resolved"].map((s) => (
          <button
            key={s}
            className={`btn btn-sm ${filter === s ? "btn-primary" : "btn-outline"}`}
            onClick={() => setFilter(s)}
          >
            {s ? STATUS_LABELS[s] : "Todos"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p style={{ color: "var(--text-muted)" }}>Carregando…</p>
      ) : (
        <div className="card" style={{ overflowX: "auto", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["ID", "Categoria", "Status", "Descrição", "Data", "Ação"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 14px" }}>#{p.id}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {(p.categories || []).length > 0 && (
                        <span style={{ display: "flex", gap: 2 }}>
                          {p.categories.map((c) => (
                            <span
                              key={c.id}
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: c.map_color,
                                display: "inline-block",
                              }}
                            />
                          ))}
                        </span>
                      )}
                      {(p.categories || []).map((c) => c.name).join(", ") || "—"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span className={`badge badge-${p.status}`}>{STATUS_LABELS[p.status]}</span>
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.description || <span style={{ color: "var(--text-muted)" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <select
                      value={p.status}
                      onChange={(e) => statusMutation.mutate({ id: p.id, status: e.target.value })}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "1.5px solid var(--border)",
                        fontSize: 12,
                      }}
                    >
                      <option value="pending">Pendente</option>
                      <option value="under_review">Em análise</option>
                      <option value="resolved">Resolvido</option>
                    </select>
                  </td>
                </tr>
              ))}
              {points.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: "var(--text-muted)",
                    }}
                  >
                    Nenhum registro encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
