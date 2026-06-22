import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "./Navbar";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

// Mocks globais
vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/client", () => ({
  default: { get: vi.fn().mockResolvedValue({ data: [] }) },
}));

import { useAuth } from "../contexts/AuthContext";

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe o nome do usuário", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { name: "Ana", type: "citizen" },
      logout: vi.fn(),
    });

    render(
      <Wrapper>
        <Navbar />
      </Wrapper>,
    );

    expect(screen.getByText("Ana")).toBeDefined();
    expect(screen.getByText("🌿 EcoLixo")).toBeDefined();
  });

  it("exibe links de cidadão (Mapa + Registrar)", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { name: "Ana", type: "citizen" },
      logout: vi.fn(),
    });

    render(
      <Wrapper>
        <Navbar />
      </Wrapper>,
    );

    expect(screen.getByText("Mapa")).toBeDefined();
    expect(screen.getByText("Registrar")).toBeDefined();
    expect(screen.queryByText("Painel")).toBeNull();
    expect(screen.queryByText("Relatórios")).toBeNull();
  });

  it("exibe links de gestor (Mapa + Painel + Relatórios)", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { name: "Roberto", type: "manager" },
      logout: vi.fn(),
    });

    render(
      <Wrapper>
        <Navbar />
      </Wrapper>,
    );

    expect(screen.getByText("Mapa")).toBeDefined();
    expect(screen.getByText("Painel")).toBeDefined();
    expect(screen.getByText("Relatórios")).toBeDefined();
    expect(screen.queryByText("Registrar")).toBeNull();
  });

  it("exibe badge de notificações não lidas", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { name: "Ana", type: "citizen" },
      logout: vi.fn(),
    });

    const api = await import("../api/client");
    (api.default.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        { id: 1, read: false },
        { id: 2, read: true },
        { id: 3, read: false },
      ],
    });

    render(
      <Wrapper>
        <Navbar />
      </Wrapper>,
    );

    expect(await screen.findByText("2")).toBeDefined();
  });
});
