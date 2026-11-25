import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { apiErrorMessage } from "../api/errors";
import { useAuth } from "../contexts/AuthContext";
import { fetchPoints, reviewPoint, updatePointStatus } from "../services/pointService";
import type { DisposalPoint, ReviewStatus } from "../types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  under_review: "Em análise",
  resolved: "Resolvido",
};

const REVIEW_LABELS: Record<ReviewStatus, string> = {
  pending: "Aguardando revisão",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

export default function ManagerDashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");

  const { data: points = [], isLoading } = useQuery<DisposalPoint[]>({
    queryKey: ["points", filter, reviewFilter],
    queryFn: () =>
      fetchPoints({
        ...(filter ? { status: filter } : {}),
        ...(reviewFilter ? { review_status: reviewFilter } : {}),
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, review }: { id: number; review: ReviewStatus }) => reviewPoint(id, review),
    onSuccess: (_, { review }) => {
      toast.success(review === "approved" ? "Contribuição aprovada" : "Revisão registrada");
      queryClient.invalidateQueries({ queryKey: ["points"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Erro ao revisar registro")),
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

      <div
        role="group"
        aria-label="Filtrar por status"
        style={{ marginBottom: 10, display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        {["", "pending", "under_review", "resolved"].map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filter === s}
            className={`btn btn-sm ${filter === s ? "btn-primary" : "btn-outline"}`}
            onClick={() => setFilter(s)}
          >
            {s ? STATUS_LABELS[s] : "Todos"}
          </button>
        ))}
      </div>
      <div
        role="group"
        aria-label="Filtrar por revisão"
        style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        {(["", "pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={reviewFilter === s}
            className={`btn btn-sm ${reviewFilter === s ? "btn-primary" : "btn-outline"}`}
            onClick={() => setReviewFilter(s)}
          >
            {s ? REVIEW_LABELS[s] : "Todas as revisões"}
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
                {["ID", "Categoria", "Status", "Descrição", "Data", "Ação", "Revisão"].map((h) => (
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
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    <span className={`badge badge-${p.review_status}`}>
                      {REVIEW_LABELS[p.review_status]}
                    </span>
                    {p.user_id === user?.id ? (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                        Seu registro: outro gestor revisa
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        {p.review_status !== "approved" && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={reviewMutation.isPending}
                            aria-label={`Aprovar registro #${p.id}`}
                            onClick={() => reviewMutation.mutate({ id: p.id, review: "approved" })}
                          >
                            Aprovar
                          </button>
                        )}
                        {p.review_status !== "rejected" && (
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            disabled={reviewMutation.isPending}
                            aria-label={`Rejeitar registro #${p.id}`}
                            onClick={() => reviewMutation.mutate({ id: p.id, review: "rejected" })}
                          >
                            Rejeitar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {points.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
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
