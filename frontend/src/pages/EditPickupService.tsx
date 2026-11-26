import { isAxiosError } from "axios";
import { Link, useNavigate, useParams } from "react-router";
import PickupServiceForm from "../components/PickupServiceForm";
import { useAuth } from "../contexts/AuthContext";
import { usePickupService } from "../hooks/usePickupServices";
import "./PickupServices.css";

export default function EditPickupService() {
  const { serviceId } = useParams();
  const id = Number(serviceId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: service, isPending, isError, error, refetch } = usePickupService(id);
  const validId = Number.isSafeInteger(id) && id > 0;
  const notFound = !validId || (isAxiosError(error) && error.response?.status === 404);

  return (
    <main className="page pickup-page">
      <h2 className="page-title">Editar serviço de retirada</h2>
      <p className="pickup-intro">
        <Link to="/services">← Voltar para serviços</Link>
      </p>
      {notFound ? (
        <p role="alert">Serviço não encontrado.</p>
      ) : isPending ? (
        <p role="status">Carregando serviço…</p>
      ) : isError ? (
        <div role="alert">
          <p>Não foi possível carregar o serviço.</p>
          <button type="button" className="btn btn-outline" onClick={() => refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : service && service.user_id !== user?.id ? (
        <p role="alert">Você só pode editar seus próprios serviços.</p>
      ) : service ? (
        <PickupServiceForm
          key={service.id}
          service={service}
          onClose={() => navigate("/services")}
        />
      ) : null}
    </main>
  );
}
