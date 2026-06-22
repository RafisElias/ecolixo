import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { generateReport } from "../services/reportService";
import type { Report } from "../types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  under_review: "Em análise",
  resolved: "Resolvido",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "#f57c00",
  under_review: "#1565c0",
  resolved: "#2e7d32",
};

interface StatusChartItem {
  name: string;
  total: number;
  fill: string;
}

export default function Analytics() {
  const [period, setPeriod] = useState({ start: "", end: "" });
  const [report, setReport] = useState<Report | null>(null);

  const generateMutation = useMutation({
    mutationFn: ({ period_start, period_end }: { period_start: string; period_end: string }) =>
      generateReport(period_start, period_end),
    onSuccess: (data) => {
      setReport(data);
      toast.success("Relatório gerado!");
    },
    onError: (err: unknown) => {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { detail: string } } }).response?.data?.detail
          : "Erro ao gerar relatório";
      toast.error(detail || "Erro ao gerar relatório");
    },
  });

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!period.start || !period.end) {
      toast.error("Selecione o período");
      return;
    }
    generateMutation.mutate({
      period_start: period.start,
      period_end: period.end,
    });
  };

  const statusData: StatusChartItem[] = report
    ? Object.entries(report.data?.by_status || {}).map(([k, v]) => ({
        name: STATUS_LABELS[k] || k,
        total: v,
        fill: STATUS_COLORS[k] || "#757575",
      }))
    : [];

  return (
    <div className="page">
      <h2 className="page-title">Relatório Analítico</h2>

      <div className="card" style={{ maxWidth: 500, marginBottom: 28 }}>
        <form
          onSubmit={generate}
          style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label>De</label>
            <input
              type="date"
              value={period.start}
              onChange={(e) => setPeriod({ ...period, start: e.target.value })}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label>Até</label>
            <input
              type="date"
              value={period.end}
              onChange={(e) => setPeriod({ ...period, end: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-primary" disabled={generateMutation.isPending}>
            {generateMutation.isPending ? "Gerando…" : "Gerar"}
          </button>
        </form>
      </div>

      {report && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 14,
              marginBottom: 28,
            }}
          >
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#1565c0" }}>
                {report.total_records}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total de registros</div>
            </div>
            {statusData.map((s) => (
              <div key={s.name} className="card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: s.fill }}>{s.total}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.name}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Por status</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                Distribuição por status
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-outline" onClick={() => window.print()}>
              🖨️ Exportar / Imprimir
            </button>
          </div>
        </>
      )}
    </div>
  );
}
