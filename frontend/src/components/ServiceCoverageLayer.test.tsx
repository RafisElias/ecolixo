import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePickupServices } from "../hooks/usePickupServices";
import type { PickupService } from "../types";
import ServiceCoverageLayer from "./ServiceCoverageLayer";

vi.mock("../hooks/usePickupServices", () => ({ usePickupServices: vi.fn() }));
vi.mock("react-leaflet", () => ({
  Circle: ({ children, radius }: { children: ReactNode; radius: number }) => (
    <div data-testid="coverage-circle" data-radius={radius}>
      {children}
    </div>
  ),
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
const refetch = vi.fn();
const service: PickupService = {
  id: 1,
  user_id: 1,
  name: "Serviço no mapa",
  provider_type: "individual",
  contact: "teste@example.com",
  service_area: "São Paulo",
  description: "",
  pricing: "free",
  categories: [{ id: 1, name: "Pilhas", map_color: "#000000" }],
  reference_latitude: -23.55,
  reference_longitude: -46.63,
  radius_km: 5,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};
function queryResult(data: PickupService[]) {
  vi.mocked(usePickupServices).mockReturnValue({
    data,
    isPending: false,
    isError: false,
    refetch,
  } as unknown as ReturnType<typeof usePickupServices>);
}
beforeEach(() => {
  vi.clearAllMocks();
  queryResult([]);
});

describe("Camada de serviços", () => {
  it("renderiza somente áreas válidas e converte km para metros", () => {
    queryResult([
      service,
      {
        ...service,
        id: 2,
        name: "Sem coordenadas",
        reference_latitude: null,
        reference_longitude: null,
        radius_km: null,
      },
    ]);
    render(<ServiceCoverageLayer categoryId="1" />);
    expect(usePickupServices).toHaveBeenCalledWith("1");
    expect(screen.getByTestId("coverage-circle")).toHaveAttribute("data-radius", "5000");
    expect(screen.getByText("Serviço no mapa")).toBeInTheDocument();
    expect(screen.queryByText("Sem coordenadas")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 sem referência");
    expect(screen.getByText(/não um ponto de coleta/)).toBeInTheDocument();
  });
  it("indica quando não há serviços para o material", () => {
    render(<ServiceCoverageLayer categoryId="" />);
    expect(screen.getByRole("status")).toHaveTextContent("Nenhum serviço para este material");
  });
  it("trata erro sem impedir o uso dos pontos de coleta", async () => {
    vi.mocked(usePickupServices).mockReturnValue({
      data: [],
      isPending: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof usePickupServices>);
    render(<ServiceCoverageLayer categoryId="" />);
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(refetch).toHaveBeenCalled();
  });
});
