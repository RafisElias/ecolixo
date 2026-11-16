import type { DisposalPoint } from "../types";

const STATUS_LABELS: Record<DisposalPoint["status"], string> = {
  pending: "Pendente",
  under_review: "Em análise",
  resolved: "Resolvido",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Não informada" : date.toLocaleString("pt-BR");
}

export default function CollectionPointDetails({ point }: { point: DisposalPoint }) {
  return (
    <div style={{ minWidth: 200, maxWidth: 280, overflowWrap: "anywhere" }}>
      <strong>Ponto de coleta #{point.id}</strong>
      <p>Ponto de coleta fixo · Localização cadastrada por um usuário</p>
      <p>
        <b>Materiais:</b>{" "}
        {point.categories.length
          ? point.categories.map((category) => category.name).join(", ")
          : "Não informados"}
      </p>
      <p>
        <b>Status:</b>{" "}
        <span className={`badge badge-${point.status}`}>{STATUS_LABELS[point.status]}</span>
      </p>
      <p style={{ whiteSpace: "pre-wrap" }}>
        <b>Descrição:</b> {point.description?.trim() || "Não informada"}
      </p>
      <p>
        <b>Coordenadas:</b> {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
      </p>
      <p>
        <b>Cadastrado em:</b> {formatDate(point.created_at)}
      </p>
      <p>
        <b>Atualizado em:</b> {formatDate(point.updated_at)}
      </p>
      {point.photo_url && (
        <img
          src={point.photo_url.startsWith("/uploads/") ? `/api${point.photo_url}` : point.photo_url}
          alt={`Foto do ponto de coleta #${point.id}`}
          style={{ width: "100%", borderRadius: 6, marginTop: 6 }}
        />
      )}
    </div>
  );
}
