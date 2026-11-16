import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deletePickupService,
  fetchPickupServices,
  savePickupService,
} from "../services/pickupService";
import PickupServices from "./PickupServices";

vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: 1 } }) }));
vi.mock("../hooks/useCategories", () => ({ useCategories: () => [{ id: 1, name: "Pilhas" }] }));
vi.mock("../services/pickupService", () => ({
  fetchPickupServices: vi.fn(),
  savePickupService: vi.fn(),
  deletePickupService: vi.fn(),
}));

const service = {
  id: 10,
  user_id: 1,
  name: "Coleta Teste",
  provider_type: "company" as const,
  contact: "contato@example.com",
  service_area: "São Paulo",
  pricing: "free" as const,
  description: "Retirada combinada",
  categories: [{ id: 1, name: "Pilhas", map_color: "#123456" }],
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PickupServices />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Divulgar meu serviço" }));
  await user.type(screen.getByLabelText("Nome da pessoa ou empresa"), "Meu serviço");
  await user.type(screen.getByLabelText("Contato (telefone ou e-mail)"), "contato@example.com");
  await user.type(screen.getByLabelText("Região de atendimento"), "São Paulo");
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchPickupServices).mockResolvedValue([]);
  vi.mocked(savePickupService).mockResolvedValue(service);
});

describe("Serviços de retirada", () => {
  it("mostra lista vazia", async () => {
    setup();
    expect(
      await screen.findByText("Nenhum serviço encontrado para esta seleção."),
    ).toBeInTheDocument();
  });

  it("exibe contato e filtra por categoria", async () => {
    vi.mocked(fetchPickupServices).mockResolvedValue([service]);
    const user = setup();
    expect(await screen.findByText(service.contact)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Filtrar por material"), "1");
    await waitFor(() => expect(fetchPickupServices).toHaveBeenCalledWith("1"));
  });

  it("não permite salvar sem selecionar material", async () => {
    const user = setup();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Salvar serviço" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Selecione ao menos um material");
    expect(savePickupService).not.toHaveBeenCalled();
  });

  it("salva e revalida a listagem", async () => {
    const user = setup();
    await fillForm(user);
    await user.click(screen.getByRole("checkbox", { name: "Pilhas" }));
    await user.click(screen.getByRole("button", { name: "Salvar serviço" }));
    await waitFor(() =>
      expect(savePickupService).toHaveBeenCalledWith(
        {
          id: undefined,
          body: {
            name: "Meu serviço",
            provider_type: "individual",
            contact: "contato@example.com",
            service_area: "São Paulo",
            description: "",
            pricing: "on_request",
            category_ids: [1],
            reference_latitude: null,
            reference_longitude: null,
            radius_km: null,
          },
        },
        expect.anything(),
      ),
    );
    await waitFor(() => expect(fetchPickupServices.mock.calls.length).toBeGreaterThan(1));
    expect(screen.queryByRole("button", { name: "Salvar serviço" })).not.toBeInTheDocument();
  });

  it("preserva o formulário quando salvar falha", async () => {
    vi.mocked(savePickupService).mockRejectedValue(new Error("Falha"));
    const user = setup();
    await fillForm(user);
    await user.click(screen.getByRole("checkbox", { name: "Pilhas" }));
    await user.click(screen.getByRole("button", { name: "Salvar serviço" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar");
    expect(screen.getByLabelText("Nome da pessoa ou empresa")).toHaveValue("Meu serviço");
  });

  it("oferece edição e remoção apenas para anúncios próprios", async () => {
    vi.mocked(fetchPickupServices).mockResolvedValue([
      service,
      { ...service, id: 11, user_id: 2, name: "Outro prestador" },
    ]);
    const user = setup();
    const own = (await screen.findByText(service.name)).closest("article");
    const other = screen.getByText("Outro prestador").closest("article");
    expect(within(other!).queryByRole("link", { name: "Editar" })).not.toBeInTheDocument();
    expect(within(own!).getByRole("link", { name: "Editar" })).toHaveAttribute(
      "href",
      `/services/${service.id}/edit`,
    );
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(within(own!).getByRole("button", { name: "Remover" }));
    await waitFor(() =>
      expect(deletePickupService).toHaveBeenCalledWith(service.id, expect.anything()),
    );
    confirm.mockRestore();
  });

  it("mostra erro de consulta e permite tentar novamente", async () => {
    vi.mocked(fetchPickupServices).mockRejectedValueOnce(new Error("Falha"));
    const user = setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("Erro ao carregar serviços");
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByText("Nenhum serviço encontrado para esta seleção."),
    ).toBeInTheDocument();
  });
});
