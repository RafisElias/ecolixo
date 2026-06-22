import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NewReport from "./NewReport";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/client", () => ({
  default: { get: vi.fn().mockResolvedValue({ data: [] }) },
}));

import { useAuth } from "../contexts/AuthContext";

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

describe("NewReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: 1, name: "Maria", type: "citizen" },
    });
  });

  it("renderiza o título da página", () => {
    render(
      <Wrapper>
        <NewReport />
      </Wrapper>,
    );
    expect(screen.getByText("Cadastrar ponto de coleta")).toBeDefined();
  });

  it("renderiza o campo de descrição", () => {
    render(
      <Wrapper>
        <NewReport />
      </Wrapper>,
    );
    expect(
      screen.getByPlaceholderText(
        /Ex: monitor quebrado, pilhas usadas, celular antigo/,
      ),
    ).toBeDefined();
  });

  it("renderiza o campo de foto", () => {
    render(
      <Wrapper>
        <NewReport />
      </Wrapper>,
    );
    expect(screen.getByText("Foto (opcional)")).toBeDefined();
  });

  it("renderiza o botão de enviar", () => {
    render(
      <Wrapper>
        <NewReport />
      </Wrapper>,
    );
    expect(screen.getByText("Cadastrar ponto")).toBeDefined();
  });
});
