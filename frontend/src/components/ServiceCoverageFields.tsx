import { lazy, Suspense } from "react";

const ServiceAreaPicker = lazy(() => import("./ServiceAreaPicker"));

export interface CoverageDraft {
  enabled: boolean;
  latitude: string;
  longitude: string;
  radius: string;
}

export function validCoverage(value: CoverageDraft) {
  const lat = Number(value.latitude);
  const lon = Number(value.longitude);
  const radius = Number(value.radius);
  return (
    value.latitude.trim() !== "" &&
    value.longitude.trim() !== "" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Number.isFinite(radius) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    radius >= 1 &&
    radius <= 100
  );
}

export default function ServiceCoverageFields({
  value,
  onChange,
  disabled,
}: {
  value: CoverageDraft;
  onChange: (value: CoverageDraft) => void;
  disabled: boolean;
}) {
  const coordinatesValid =
    value.latitude.trim() !== "" &&
    value.longitude.trim() !== "" &&
    Number.isFinite(Number(value.latitude)) &&
    Number.isFinite(Number(value.longitude)) &&
    Math.abs(Number(value.latitude)) <= 90 &&
    Math.abs(Number(value.longitude)) <= 180;
  return (
    <fieldset className="pickup-materials">
      <legend>Área aproximada no mapa (opcional)</legend>
      <label>
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        Mostrar área de atendimento no mapa
      </label>
      <p id="coverage-help" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
        Escolha uma referência pública da região, não seu endereço residencial. A referência e o
        raio ficarão visíveis aos usuários. O círculo é aproximado e não garante atendimento em
        todos os locais. Ao desativar, o serviço permanece no catálogo, mas sai do mapa após salvar.
      </p>
      {value.enabled && (
        <>
          <p>Clique no mapa para selecionar a referência ou informe as coordenadas abaixo.</p>
          <Suspense fallback={<p role="status">Carregando seletor de região…</p>}>
            <ServiceAreaPicker
              latitude={coordinatesValid ? Number(value.latitude) : null}
              longitude={coordinatesValid ? Number(value.longitude) : null}
              radius={
                Number(value.radius) >= 1 && Number(value.radius) <= 100 ? Number(value.radius) : 1
              }
              disabled={disabled}
              onSelect={(lat, lon) =>
                onChange({ ...value, latitude: String(lat), longitude: String(lon) })
              }
            />
          </Suspense>
          <div className="pickup-grid">
            <div className="form-group">
              <label htmlFor="reference-latitude">Latitude da referência</label>
              <input
                id="reference-latitude"
                type="number"
                min={-90}
                max={90}
                step="any"
                required
                aria-describedby="coverage-help"
                value={value.latitude}
                onChange={(e) => onChange({ ...value, latitude: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="reference-longitude">Longitude da referência</label>
              <input
                id="reference-longitude"
                type="number"
                min={-180}
                max={180}
                step="any"
                required
                value={value.longitude}
                onChange={(e) => onChange({ ...value, longitude: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="coverage-radius">Raio de atendimento (km)</label>
              <input
                id="coverage-radius"
                type="number"
                min={1}
                max={100}
                step="any"
                required
                value={value.radius}
                onChange={(e) => onChange({ ...value, radius: e.target.value })}
              />
            </div>
          </div>
        </>
      )}
    </fieldset>
  );
}
