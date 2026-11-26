import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPickupService, savePickupService } from "../services/pickupService";
import EditPickupService from "./EditPickupService";

vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: 1 } }) }));
vi.mock("../hooks/useCategories", () => ({ useCategories: () => [{ id: 1, name: "Pilhas" }] }));
vi.mock("../services/pickupService", () => ({
  fetchPickupService: vi.fn(),
  savePickupService: vi.fn(),
  deletePickupService: vi.fn(),
}));
vi.mock("../components/ServiceAreaPicker", () => ({ default: () => <p>Seletor de referência</p> }));
const service = {
  id: 10,
  user_id: 1,
  name: "Coleta Teste",
  provider_type: "company" as const,
  contact: "teste@example.com",
  service_area: "São Paulo",
  description: "Com agendamento",
  pricing: "paid" as const,
  categories: [{ id: 1, name: "Pilhas", map_color: "#000000" }],
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

function setup(path = "/services/10/edit") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/services/:serviceId/edit" element={<EditPickupService />} />
          <Route path="/services" element={<p>Catálogo de serviços</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchPickupService).mockResolvedValue(service);
  vi.mocked(savePickupService).mockResolvedValue(service);
});

describe("Editar serviço", () => {
  it("carrega dados pelo ID e salva as alterações antes de voltar ao catálogo", async () => {
    const user = setup();
    const name = await screen.findByLabelText("Nome da pessoa ou empresa");
    expect(fetchPickupService).toHaveBeenCalledWith(10);
    expect(name).toHaveValue(service.name);
    expect(screen.getByRole("checkbox", { name: "Pilhas" })).toBeChecked();
    await user.clear(name);
    await user.type(name, "Coleta atualizada");
    await user.click(screen.getByRole("button", { name: "Salvar serviço" }));
    await waitFor(() =>
      expect(savePickupService).toHaveBeenCalledWith(
        {
          id: 10,
          body: {
            name: "Coleta atualizada",
            provider_type: "company",
            contact: service.contact,
            service_area: service.service_area,
            description: service.description,
            pricing: "paid",
            category_ids: [1],
            reference_latitude: null,
            reference_longitude: null,
            radius_km: null,
          },
        },
        expect.anything(),
      ),
    );
    expect(await screen.findByText("Catálogo de serviços")).toBeInTheDocument();
  });

  it("salva uma referência e raio escolhidos pelo prestador", async () => {
    const user = setup();
    await user.click(
      await screen.findByRole("checkbox", { name: "Mostrar área de atendimento no mapa" }),
    );
    await user.type(screen.getByLabelText("Latitude da referência"), "-23.55");
    await user.type(screen.getByLabelText("Longitude da referência"), "-46.63");
    await user.click(screen.getByRole("button", { name: "Salvar serviço" }));
    await waitFor(() =>
      expect(savePickupService).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 10,
          body: expect.objectContaining({
            reference_latitude: -23.55,
            reference_longitude: -46.63,
            radius_km: 5,
          }),
        }),
        expect.anything(),
      ),
    );
  });

  it("permite retirar do mapa sem apagar o anúncio", async () => {
    vi.mocked(fetchPickupService).mockResolvedValue({
      ...service,
      reference_latitude: -23.55,
      reference_longitude: -46.63,
      radius_km: 10,
    });
    const user = setup();
    expect(await screen.findByLabelText("Latitude da referência")).toHaveValue(-23.55);
    await user.click(screen.getByRole("checkbox", { name: "Mostrar área de atendimento no mapa" }));
    expect(screen.queryByLabelText("Latitude da referência")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar serviço" }));
    await waitFor(() =>
      expect(savePickupService).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            reference_latitude: null,
            reference_longitude: null,
            radius_km: null,
          }),
        }),
        expect.anything(),
      ),
    );
  });

  it("cancela sem salvar", async () => {
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "Cancelar" }));
    expect(await screen.findByText("Catálogo de serviços")).toBeInTheDocument();
    expect(savePickupService).not.toHaveBeenCalled();
  });

  it("bloqueia o formulário de outro autor", async () => {
    vi.mocked(fetchPickupService).mockResolvedValue({ ...service, user_id: 2 });
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Você só pode editar seus próprios serviços",
    );
    expect(screen.queryByRole("button", { name: "Salvar serviço" })).not.toBeInTheDocument();
  });

  it("não consulta um ID inválido", () => {
    setup("/services/invalido/edit");
    expect(screen.getByRole("alert")).toHaveTextContent("Serviço não encontrado");
    expect(fetchPickupService).not.toHaveBeenCalled();
  });

  it("permite tentar novamente em erro de carregamento", async () => {
    vi.mocked(fetchPickupService).mockRejectedValueOnce(new Error("Rede"));
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByLabelText("Nome da pessoa ou empresa")).toHaveValue(service.name);
  });

  it("mantém alterações em caso de erro ao salvar", async () => {
    vi.mocked(savePickupService).mockRejectedValue(new Error("Rede"));
    const user = setup();
    const name = await screen.findByLabelText("Nome da pessoa ou empresa");
    await user.clear(name);
    await user.type(name, "Alteração não salva");
    await user.click(screen.getByRole("button", { name: "Salvar serviço" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar");
    expect(name).toHaveValue("Alteração não salva");
  });
});
