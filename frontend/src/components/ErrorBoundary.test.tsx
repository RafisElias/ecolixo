import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

const GoodChild = () => <p>Componente funcionando</p>;
const BadChild = () => {
  throw new Error("Erro simulado");
};

describe("ErrorBoundary", () => {
  it("renderiza os children quando não há erro", () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Componente funcionando")).toBeDefined();
  });

  it("renderiza fallback padrão quando ocorre um erro", () => {
    // Evita que o erro vaze para o console durante o teste
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Algo deu errado")).toBeDefined();
    expect(screen.getByText("Erro simulado")).toBeDefined();
    expect(screen.getByText("Voltar ao mapa")).toBeDefined();

    spy.mockRestore();
  });
});
