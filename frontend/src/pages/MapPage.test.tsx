import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCategories } from "../services/categoryService";
import { fetchPoints } from "../services/pointService";
import MapPage from "./MapPage";

// Leaflet não renderiza no jsdom; só a lógica de filtros interessa aqui.
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Popup: () => null,
  useMap: () => ({}),
}));
vi.mock("../services/pointService", () => ({ fetchPoints: vi.fn(), fetchHeatmap: vi.fn() }));
vi.mock("../services/categoryService", () => ({ fetchCategories: vi.fn() }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MapPage />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchPoints).mockResolvedValue([]);
  vi.mocked(fetchCategories).mockResolvedValue([{ id: 3, name: "Baterias", map_color: "#000" }]);
});

describe("Mapa — filtros", () => {
  it("aplica o filtro de status escolhido", async () => {
    const user = setup();
    const status = await screen.findByDisplayValue("Todos os status");
    await user.selectOptions(status, "resolved");
    await waitFor(() =>
      expect(fetchPoints).toHaveBeenLastCalledWith({ status: "resolved", category_id: "" }),
    );
    expect((status as HTMLSelectElement).value).toBe("resolved");
  });

  it("aplica o filtro de material escolhido", async () => {
    const user = setup();
    const category = await screen.findByDisplayValue("Todos os tipos");
    await user.selectOptions(category, "3");
    await waitFor(() =>
      expect(fetchPoints).toHaveBeenLastCalledWith({ status: "", category_id: "3" }),
    );
  });
});
