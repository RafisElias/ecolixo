import { useSuspenseQuery } from "@tanstack/react-query";
import L from "leaflet";
import { Suspense, memo, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useCategories } from "../hooks/useCategories";
import { fetchHeatmap, fetchPoints } from "../services/pointService";
import type { DisposalPoint } from "../types";

// ─── Leaflet icon fix ────────────────────────────────────────────
(L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl = undefined;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Constantes ──────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  under_review: "Em análise",
  resolved: "Resolvido",
};

interface Filters {
  status: string;
  category_id: string;
}

function coloredIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// ─── Data fetching ───────────────────────────────────────────────
function useFetchPoints(filters: Filters): DisposalPoint[] {
  const { data } = useSuspenseQuery<DisposalPoint[]>({
    queryKey: ["points", filters],
    queryFn: () => fetchPoints(filters),
    staleTime: 30_000,
  });

  return data;
}

// ─── HeatmapLayer ────────────────────────────────────────────────
const HeatmapLayer = memo(function HeatmapLayer({
  active,
}: {
  active: boolean;
}) {
  const map = useMap();
  const layerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    if (!active) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    import("leaflet.heat").then(async () => {
      if (cancelled) return;
      try {
        const data = await fetchHeatmap();
        if (cancelled) return;
        if (layerRef.current) map.removeLayer(layerRef.current);
        layerRef.current = L.heatLayer(data, { radius: 25 }).addTo(map);
      } catch {
        // ignora erro do heatmap
      }
    });

    return () => {
      cancelled = true;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [active, map]);

  return null;
});

// ─── CategoryFilter ──────────────────────────────────────────────
const CategoryFilter = memo(function CategoryFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const categories = useCategories();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: "1.5px solid var(--border)",
        fontSize: 13,
      }}
    >
      <option value="">Todos os tipos</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
});

// ─── PointMarkers ────────────────────────────────────────────────
const PointMarkers = memo(function PointMarkers({
  filters,
  onCount,
}: {
  filters: Filters;
  onCount: (n: number) => void;
}) {
  const points = useFetchPoints(filters);

  // Notifica o pai com a contagem (fora da render → useEffect)
  useEffect(() => {
    onCount(points.length);
  }, [points.length, onCount]);

  if (points.length === 0) return null;

  return (
    <>
      {points.map((p) => (
        <Marker
          key={p.id}
          position={[p.latitude, p.longitude]}
          icon={coloredIcon(p.categories?.[0]?.map_color || "#757575")}
        >
          <Popup>
            <div style={{ minWidth: 180 }}>
              <strong>
                {(p.categories || []).map((c) => c.name).join(", ") || "Sem categoria"}
              </strong>
              <div style={{ margin: "4px 0" }}>
                <span className={`badge badge-${p.status}`}>{STATUS_LABELS[p.status]}</span>
              </div>
              {p.description && <p style={{ fontSize: 12, color: "#555" }}>{p.description}</p>}
              {p.photo_url && (
                <img
                  src={p.photo_url}
                  alt="foto"
                  style={{
                    width: "100%",
                    borderRadius: 6,
                    marginTop: 6,
                  }}
                />
              )}
              <p style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
                {new Date(p.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
});

// ─── Toolbar ─────────────────────────────────────────────────────
const Toolbar = memo(function Toolbar({
  filters,
  onFilterChange,
  heatmap,
  onHeatmapToggle,
  pointCount,
  isPending,
}: {
  filters: Filters;
  onFilterChange: (updater: Filters | ((prev: Filters) => Filters)) => void;
  heatmap: boolean;
  onHeatmapToggle: () => void;
  pointCount: number;
  isPending: boolean;
}) {
  // Callbacks estáveis: só dependem de onFilterChange (que nunca muda)
  const onStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      onFilterChange((prev: Filters) => ({ ...prev, status: e.target.value })),
    [onFilterChange],
  );

  const onCategoryChange = useCallback(
    (v: string) => onFilterChange((prev: Filters) => ({ ...prev, category_id: v })),
    [onFilterChange],
  );

  return (
    <div
      style={{
        background: "#fff",
        borderBottom: "1px solid var(--border)",
        padding: "10px 16px",
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
        opacity: isPending ? 0.6 : 1,
        transition: "opacity .2s",
      }}
    >
      <select
        value={filters.status}
        onChange={onStatusChange}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1.5px solid var(--border)",
          fontSize: 13,
        }}
      >
        <option value="">Todos os status</option>
        <option value="pending">Pendente</option>
        <option value="under_review">Em análise</option>
        <option value="resolved">Resolvido</option>
      </select>

      <Suspense
        fallback={
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando categorias…</span>
        }
      >
        <CategoryFilter value={filters.category_id} onChange={onCategoryChange} />
      </Suspense>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        <input type="checkbox" checked={heatmap} onChange={onHeatmapToggle} />
        Mapa de calor
      </label>

      <span
        style={{
          marginLeft: "auto",
          fontSize: 13,
          color: "var(--text-muted)",
        }}
      >
        {pointCount} ponto(s) encontrado(s)
      </span>
    </div>
  );
});

// ─── MapContent (suspende enquanto pontos carregam) ──────────────
const MapContent = memo(function MapContent({
  filters,
  heatmap,
  onCount,
}: {
  filters: Filters;
  heatmap: boolean;
  onCount: (n: number) => void;
}) {
  return (
    <MapContainer center={[-23.5505, -46.6333]} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {heatmap ? (
        <HeatmapLayer active />
      ) : (
        <Suspense
          fallback={
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,.6)",
                zIndex: 1000,
                fontSize: 14,
                color: "var(--text-muted)",
              }}
            >
              Carregando pontos…
            </div>
          }
        >
          <PointMarkers filters={filters} onCount={onCount} />
        </Suspense>
      )}
    </MapContainer>
  );
});

// ─── Página principal ────────────────────────────────────────────
export default function MapPage() {
  const [filters, setFilters] = useState<Filters>({
    status: "",
    category_id: "",
  });
  const [heatmap, setHeatmap] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  // useCallback estabiliza as funções para não quebrar memo dos filhos
  const handleFilterChange = useCallback((next: Filters | ((prev: Filters) => Filters)) => {
    startTransition(() => setFilters(next));
  }, []);

  const handleHeatmapToggle = useCallback(() => {
    setHeatmap((prev) => !prev);
  }, []);

  const handleCount = useCallback((n: number) => {
    setPointCount(n);
  }, []);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Toolbar
        filters={filters}
        onFilterChange={handleFilterChange}
        heatmap={heatmap}
        onHeatmapToggle={handleHeatmapToggle}
        pointCount={pointCount}
        isPending={isPending}
      />

      <div style={{ flex: 1 }}>
        <Suspense
          fallback={
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                color: "var(--text-muted)",
              }}
            >
              Carregando mapa…
            </div>
          }
        >
          <MapContent filters={filters} heatmap={heatmap} onCount={handleCount} />
        </Suspense>
      </div>
    </div>
  );
}
