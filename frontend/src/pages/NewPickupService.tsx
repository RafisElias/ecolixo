import { Link, useNavigate } from "react-router-dom";
import PickupServiceForm from "../components/PickupServiceForm";
import "./PickupServices.css";

export default function NewPickupService() {
  const navigate = useNavigate();

  return (
    <main className="page pickup-page">
      <h2 className="page-title">Divulgar serviço de retirada</h2>
      <p className="pickup-intro">
        <Link to="/services">← Voltar para serviços</Link>
      </p>
      <PickupServiceForm service={null} onClose={() => navigate("/services")} />
    </main>
  );
}
