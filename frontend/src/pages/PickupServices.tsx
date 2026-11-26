import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useCategories } from "../hooks/useCategories";
import { usePickupServiceMutations, usePickupServices } from "../hooks/usePickupServices";
import type { PickupService } from "../types";
import "./PickupServices.css";

const PRICING = { free: "Gratuita", paid: "Cobrada", on_request: "Sob consulta" };

export default function PickupServices() {
  const { user } = useAuth();
  const categories = useCategories();
  const [filter, setFilter] = useState("");
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const { data: services = [], isPending, isError, refetch } = usePickupServices(filter);
  const { remove } = usePickupServiceMutations();

  async function handleRemove(service: PickupService) {
    try {
      await remove.mutateAsync(service.id);
      toast.success("Serviço removido.");
    } catch {
      toast.error("Não foi possível remover o serviço.");
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <main className="page pickup-page">
      <h2 className="page-title">Serviços de retirada para reciclagem</h2>
      <p className="pickup-intro">
        Encontre pessoas e empresas que retiram itens para reciclagem. Combine diretamente com o
        prestador a disponibilidade, os materiais e eventuais custos. Os anúncios são informados
        pelos usuários e não representam certificação pelo EcoLixo.
      </p>
      <div className="pickup-toolbar">
        <div className="form-group">
          <label htmlFor="material-filter">Filtrar por material</label>
          <select
            id="material-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="">Todos os materiais</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <Link className="btn btn-primary" to="/services/new">
          Divulgar meu serviço
        </Link>
      </div>
      {isPending && <p role="status">Carregando serviços…</p>}
      {isError && (
        <div role="alert">
          <p>Erro ao carregar serviços.</p>
          <button type="button" className="btn btn-outline" onClick={() => refetch()}>
            Tentar novamente
          </button>
        </div>
      )}
      {!isPending && !isError && services.length === 0 && (
        <p>Nenhum serviço encontrado para esta seleção.</p>
      )}
      <div className="pickup-grid">
        {services.map((service) => (
          <article key={service.id} className="card pickup-card">
            <h3>{service.name}</h3>
            <p>
              {service.provider_type === "company" ? "Empresa" : "Pessoa"} · Retirada{" "}
              {PRICING[service.pricing].toLowerCase()}
            </p>
            <dl>
              <dt>Atendimento</dt>
              <dd>{service.service_area}</dd>
              <dt>Contato</dt>
              <dd>{service.contact}</dd>
              <dt>Materiais aceitos</dt>
              <dd>{service.categories.map((category) => category.name).join(", ")}</dd>
            </dl>
            <p>
              {service.radius_km != null
                ? `Área aproximada no mapa: raio de ${service.radius_km} km. Confirme o atendimento com o prestador.`
                : "Sem referência no mapa; consulte a região de atendimento acima."}
            </p>
            {service.description && <p className="pickup-description">{service.description}</p>}
            {user?.id === service.user_id &&
              (confirmingId === service.id ? (
                <div className="pickup-actions" role="group" aria-label="Confirmar remoção">
                  <p className="pickup-confirm">
                    Remover este anúncio? Esta ação não pode ser desfeita.
                  </p>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={remove.isPending}
                    onClick={() => handleRemove(service)}
                  >
                    {remove.isPending ? "Removendo…" : "Confirmar remoção"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={remove.isPending}
                    onClick={() => setConfirmingId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="pickup-actions">
                  <Link className="btn btn-outline btn-sm" to={`/services/${service.id}/edit`}>
                    Editar
                  </Link>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setConfirmingId(service.id)}
                  >
                    Remover
                  </button>
                </div>
              ))}
          </article>
        ))}
      </div>
    </main>
  );
}
