import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deletePickupService, fetchPickupServices } from "../services/pickupService";
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

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchPickupServices).mockResolvedValue([]);
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

  it("leva a uma tela separada para divulgar serviço", async () => {
    setup();
    expect(await screen.findByRole("link", { name: "Divulgar meu serviço" })).toHaveAttribute(
      "href",
      "/services/new",
    );
    expect(screen.queryByLabelText("Nome da pessoa ou empresa")).not.toBeInTheDocument();
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
