import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPoints, reviewPoint } from "../services/pointService";
import type { DisposalPoint } from "../types";
import ManagerDashboard from "./ManagerDashboard";

vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: 99 } }) }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../services/pointService", () => ({
  fetchPoints: vi.fn(),
  reviewPoint: vi.fn(),
  updatePointStatus: vi.fn(),
}));

const point: DisposalPoint = {
  id: 5,
  user_id: 1,
  categories: [],
  description: "Ponto",
  photo_url: null,
  status: "pending",
  review_status: "pending",
  reviewed_at: null,
  latitude: -23.5,
  longitude: -46.6,
  created_at: "2026-11-01T10:00:00Z",
  updated_at: "2026-11-01T10:00:00Z",
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ManagerDashboard />
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchPoints).mockResolvedValue([point]);
  vi.mocked(reviewPoint).mockResolvedValue({ ...point, review_status: "approved" });
});

describe("Painel do gestor — revisão", () => {
  it("aprova contribuição e recarrega a lista", async () => {
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "Aprovar registro #5" }));
    expect(reviewPoint).toHaveBeenCalledWith(5, "approved");
    await waitFor(() => expect(fetchPoints).toHaveBeenCalledTimes(2));
  });

  it("filtra por status de revisão", async () => {
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "Rejeitado" }));
    await waitFor(() =>
      expect(fetchPoints).toHaveBeenLastCalledWith({ review_status: "rejected" }),
    );
  });

  it("não oferece revisão do próprio registro", async () => {
    vi.mocked(fetchPoints).mockResolvedValue([{ ...point, user_id: 99 }]);
    setup();
    expect(await screen.findByText("Seu registro: outro gestor revisa")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aprovar registro/ })).not.toBeInTheDocument();
  });
});
