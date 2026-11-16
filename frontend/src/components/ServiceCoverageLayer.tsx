import L from "leaflet";
import { Circle, Marker, Popup } from "react-leaflet";
import { usePickupServices } from "../hooks/usePickupServices";
import type { PickupService } from "../types";

const serviceIcon = L.divIcon({
  className: "",
  html: '<div style="background:#1565c0;color:white;border:2px solid white;border-radius:6px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 5px #555;font-size:18px" aria-label="Referência de serviço de retirada">🚚</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});
const PRICING = { free: "Gratuita", paid: "Cobrada", on_request: "Sob consulta" };

export function hasCoverage(service: PickupService): boolean {
  return (
    service.reference_latitude != null &&
    service.reference_longitude != null &&
    service.radius_km != null &&
    Number.isFinite(service.reference_latitude) &&
    Number.isFinite(service.reference_longitude) &&
    Number.isFinite(service.radius_km) &&
    Math.abs(service.reference_latitude) <= 90 &&
    Math.abs(service.reference_longitude) <= 180 &&
    service.radius_km >= 1 &&
    service.radius_km <= 100
  );
}

export default function ServiceCoverageLayer({ categoryId }: { categoryId: string }) {
  const { data: services = [], isPending, isError, refetch } = usePickupServices(categoryId);
  const located = services.filter(hasCoverage);
  return (
    <>
      <div
        role={isError ? "alert" : "status"}
        style={{
          position: "absolute",
          bottom: 28,
          left: 12,
          right: 12,
          zIndex: 1000,
          background: "white",
          padding: "8px 12px",
          borderRadius: 6,
          fontSize: 12,
          maxWidth: 420,
        }}
      >
        {isPending ? (
          "Carregando áreas de atendimento…"
        ) : isError ? (
          <>
            Erro ao carregar serviços.{" "}
            <button type="button" onClick={() => refetch()}>
              Tentar novamente
            </button>
          </>
        ) : (
          <>
            {located.length} serviço(s) com área aproximada.{" "}
            {services.length - located.length > 0 &&
              `${services.length - located.length} sem referência, disponíveis apenas no catálogo.`}
            {services.length === 0 && " Nenhum serviço para este material."}
          </>
        )}
      </div>
      {located.map((service) => {
        const center: [number, number] = [
          service.reference_latitude!,
          service.reference_longitude!,
        ];
        return (
          <Circle
            key={service.id}
            center={center}
            radius={service.radius_km! * 1000}
            pathOptions={{ color: "#1565c0", weight: 1, fillOpacity: 0.08 }}
          >
            <Marker position={center} icon={serviceIcon}>
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <strong>{service.name}</strong>
                  <p>
                    Serviço de retirada ·{" "}
                    {service.provider_type === "company" ? "Empresa" : "Pessoa"}
                  </p>
                  <p>
                    <b>Região:</b> {service.service_area}
                  </p>
                  <p>
                    <b>Raio aproximado:</b> {service.radius_km} km
                  </p>
                  <p>
                    <b>Materiais:</b>{" "}
                    {service.categories.map((category) => category.name).join(", ")}
                  </p>
                  <p>
                    <b>Retirada:</b> {PRICING[service.pricing]}
                  </p>
                  <p>
                    <b>Contato:</b> {service.contact}
                  </p>
                  <p>
                    Referência da área de atendimento, não um ponto de coleta. Confirme
                    disponibilidade e custos com o prestador. Anúncio não certificado pelo EcoLixo.
                  </p>
                </div>
              </Popup>
            </Marker>
          </Circle>
        );
      })}
    </>
  );
}
