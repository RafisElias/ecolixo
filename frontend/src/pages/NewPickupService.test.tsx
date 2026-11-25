import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { savePickupService } from "../services/pickupService";
import NewPickupService from "./NewPickupService";

vi.mock("../hooks/useCategories", () => ({ useCategories: () => [{ id: 1, name: "Pilhas" }] }));
vi.mock("../services/pickupService", () => ({
  fetchPickupServices: vi.fn(),
  savePickupService: vi.fn(),
  deletePickupService: vi.fn(),
}));
vi.mock("../components/ServiceAreaPicker", () => ({ default: () => <p>Seletor de referência</p> }));

const saved = {
  id: 10,
  user_id: 1,
  name: "Meu serviço",
  provider_type: "individual" as const,
  contact: "contato@example.com",
  service_area: "São Paulo",
  description: "",
  pricing: "on_request" as const,
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
      <MemoryRouter initialEntries={["/services/new"]}>
        <Routes>
          <Route path="/services/new" element={<NewPickupService />} />
          <Route path="/services" element={<p>Catálogo de serviços</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Nome da pessoa ou empresa"), "Meu serviço");
  await user.type(screen.getByLabelText("Contato (telefone ou e-mail)"), "contato@example.com");
  await user.type(screen.getByLabelText("Região de atendimento"), "São Paulo");
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(savePickupService).mockResolvedValue(saved);
});

describe("Divulgar serviço de retirada", () => {
  it("abre o formulário vazio com link de volta", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: "Divulgar serviço de retirada" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Voltar para serviços" })).toHaveAttribute(
      "href",
      "/services",
    );
    expect(screen.getByLabelText("Nome da pessoa ou empresa")).toHaveValue("");
  });

  it("não permite salvar sem selecionar material", async () => {
    const user = setup();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Salvar serviço" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Selecione ao menos um material");
    expect(savePickupService).not.toHaveBeenCalled();
  });

  it("salva e volta para o catálogo", async () => {
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
    expect(await screen.findByText("Catálogo de serviços")).toBeInTheDocument();
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

  it("cancelar volta para o catálogo sem salvar", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(await screen.findByText("Catálogo de serviços")).toBeInTheDocument();
    expect(savePickupService).not.toHaveBeenCalled();
  });
});
