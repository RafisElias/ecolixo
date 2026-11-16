import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DisposalPoint } from "../types";
import CollectionPointDetails from "./CollectionPointDetails";

const point: DisposalPoint = {
  id: 10,
  user_id: 1,
  categories: [
    { id: 1, name: "Pilhas", map_color: "#123456" },
    { id: 2, name: "Computadores", map_color: "#654321" },
  ],
  description: "Recebe pequenos eletrônicos",
  photo_url: "/uploads/exemplo.png",
  status: "under_review",
  latitude: -23.55,
  longitude: -46.63,
  created_at: "2026-01-01T12:00:00Z",
  updated_at: "2026-02-01T12:00:00Z",
};

describe("Detalhes de ponto de coleta", () => {
  it("exibe os dados cadastrados e todas as categorias", () => {
    render(<CollectionPointDetails point={point} />);
    expect(screen.getByText("Ponto de coleta #10")).toBeInTheDocument();
    expect(screen.getByText(/Pilhas, Computadores/)).toBeInTheDocument();
    expect(screen.getByText("Em análise")).toBeInTheDocument();
    expect(screen.getByText(/Recebe pequenos eletrônicos/)).toBeInTheDocument();
    expect(screen.getByText(/-23.550000, -46.630000/)).toBeInTheDocument();
    expect(screen.getByText("Cadastrado em:")).toBeInTheDocument();
    expect(screen.getByText("Atualizado em:")).toBeInTheDocument();
  });
  it("carrega fotos pela rota de proxy do backend", () => {
    render(<CollectionPointDetails point={point} />);
    expect(screen.getByRole("img", { name: "Foto do ponto de coleta #10" })).toHaveAttribute(
      "src",
      "/api/uploads/exemplo.png",
    );
  });
  it("mostra alternativas para informações opcionais ausentes", () => {
    render(
      <CollectionPointDetails
        point={{ ...point, categories: [], description: null, photo_url: null }}
      />,
    );
    expect(screen.getByText(/Não informados/)).toBeInTheDocument();
    expect(screen.getByText(/Não informada/)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
