import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({ user: null })),
}));

describe("Home", () => {
  it("renderiza o título principal", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText("EcoLixo")).toBeDefined();
  });

  it("renderiza o subtítulo do projeto", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Mapeamento colaborativo de pontos de coleta/),
    ).toBeDefined();
  });

  it("renderiza a seção 'O problema do lixo eletrônico'", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText("O problema do lixo eletrônico")).toBeDefined();
  });

  it("renderiza a seção 'Como funciona'", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText("Como funciona")).toBeDefined();
  });

  it("renderiza os botões de CTA para usuários não logados", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText("Entrar")).toBeDefined();
    expect(screen.getByText("Cadastre-se")).toBeDefined();
  });

  it("renderiza a seção de funcionalidades", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByText("Funcionalidades")).toBeDefined();
    expect(screen.getByText("Mapa interativo")).toBeDefined();
    expect(screen.getByText("Cadastro simplificado")).toBeDefined();
  });

  it("renderiza o footer", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Mapeamento colaborativo de resíduos eletrônicos/),
    ).toBeDefined();
  });
});
