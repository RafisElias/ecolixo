import { useActionState, useState } from "react";
import toast from "react-hot-toast";
import { useCategories } from "../hooks/useCategories";
import { usePickupServiceMutations } from "../hooks/usePickupServices";
import type { PickupService, PickupServiceInput } from "../types";
import ServiceCoverageFields, { type CoverageDraft, validCoverage } from "./ServiceCoverageFields";

const PRICING = { free: "Gratuita", paid: "Cobrada", on_request: "Sob consulta" };

export default function PickupServiceForm({
  service,
  onClose,
}: {
  service: PickupService | null;
  onClose: () => void;
}) {
  const categories = useCategories();
  const { save } = usePickupServiceMutations();
  const [coverage, setCoverage] = useState<CoverageDraft>({
    enabled: service?.reference_latitude != null,
    latitude: service?.reference_latitude != null ? String(service.reference_latitude) : "",
    longitude: service?.reference_longitude != null ? String(service.reference_longitude) : "",
    radius: service?.radius_km != null ? String(service.radius_km) : "5",
  });
  // Campos controlados preservam os dados mesmo quando uma Form Action falha.
  const [draft, setDraft] = useState<PickupServiceInput>({
    name: service?.name || "",
    provider_type: service?.provider_type || "individual",
    contact: service?.contact || "",
    service_area: service?.service_area || "",
    description: service?.description || "",
    pricing: service?.pricing || "on_request",
    category_ids: service?.categories.map((category) => category.id) || [],
  });
  const [error, action, pending] = useActionState<string | null, FormData>(async (_, form) => {
    if (coverage.enabled && !validCoverage(coverage))
      return "Informe uma referência válida e um raio entre 1 e 100 km.";
    const categoryIds = form.getAll("category_ids").map(Number);
    if (!categoryIds.length) return "Selecione ao menos um material aceito.";
    const body: PickupServiceInput = {
      name: String(form.get("name") || "").trim(),
      provider_type: form.get("provider_type") as PickupServiceInput["provider_type"],
      contact: String(form.get("contact") || "").trim(),
      service_area: String(form.get("service_area") || "").trim(),
      description: String(form.get("description") || "").trim(),
      pricing: form.get("pricing") as PickupServiceInput["pricing"],
      category_ids: categoryIds,
      reference_latitude: coverage.enabled ? Number(coverage.latitude) : null,
      reference_longitude: coverage.enabled ? Number(coverage.longitude) : null,
      radius_km: coverage.enabled ? Number(coverage.radius) : null,
    };
    if (body.name.length < 2 || body.contact.length < 5 || body.service_area.length < 3) {
      return "Preencha nome, contato e região de atendimento válidos.";
    }
    try {
      await save.mutateAsync({ id: service?.id, body });
      toast.success(service ? "Serviço atualizado!" : "Serviço cadastrado!");
      onClose();
      return null;
    } catch {
      return "Não foi possível salvar o serviço. Confira os dados e tente novamente.";
    }
  }, null);

  return (
    <section className="card pickup-form" aria-labelledby="service-form-title">
      <h3 id="service-form-title">{service ? "Editar serviço" : "Cadastrar serviço"}</h3>
      <p>O contato informado ficará visível para os usuários do EcoLixo.</p>
      <form action={action}>
        {error && <p role="alert">{error}</p>}
        <fieldset disabled={pending}>
          <div className="form-group">
            <label htmlFor="service-name">Nome da pessoa ou empresa</label>
            <input
              id="service-name"
              name="name"
              required
              minLength={2}
              maxLength={120}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="pickup-grid">
            <div className="form-group">
              <label htmlFor="provider-type">Tipo de prestador</label>
              <select
                id="provider-type"
                name="provider_type"
                value={draft.provider_type}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    provider_type: e.target.value as PickupServiceInput["provider_type"],
                  })
                }
              >
                <option value="individual">Pessoa</option>
                <option value="company">Empresa</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="service-pricing">Retirada</label>
              <select
                id="service-pricing"
                name="pricing"
                value={draft.pricing}
                onChange={(e) =>
                  setDraft({ ...draft, pricing: e.target.value as PickupServiceInput["pricing"] })
                }
              >
                {Object.entries(PRICING).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="service-contact">Contato (telefone ou e-mail)</label>
            <input
              id="service-contact"
              name="contact"
              required
              minLength={5}
              maxLength={200}
              value={draft.contact}
              onChange={(e) => setDraft({ ...draft, contact: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="service-area">Região de atendimento</label>
            <input
              id="service-area"
              name="service_area"
              placeholder="Ex.: Zona Norte de São Paulo"
              required
              minLength={3}
              maxLength={200}
              value={draft.service_area}
              onChange={(e) => setDraft({ ...draft, service_area: e.target.value })}
            />
          </div>
          <ServiceCoverageFields value={coverage} onChange={setCoverage} disabled={pending} />
          <fieldset className="pickup-materials">
            <legend>Materiais aceitos (selecione ao menos um)</legend>
            {categories.map((category) => (
              <label key={category.id}>
                <input
                  type="checkbox"
                  name="category_ids"
                  value={category.id}
                  checked={draft.category_ids.includes(category.id)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      category_ids: e.target.checked
                        ? [...draft.category_ids, category.id]
                        : draft.category_ids.filter((id) => id !== category.id),
                    })
                  }
                />
                {category.name}
              </label>
            ))}
          </fieldset>
          <div className="form-group">
            <label htmlFor="service-description">Descrição e condições (opcional)</label>
            <textarea
              id="service-description"
              name="description"
              rows={3}
              maxLength={2000}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div className="pickup-actions">
            <button type="submit" className="btn btn-primary">
              {pending ? "Salvando…" : "Salvar serviço"}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
