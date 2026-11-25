import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeMission, fetchJourney, fetchMissions } from "../services/gamificationService";
import type { Journey as JourneyData, Mission } from "../types";
import Journey from "./Journey";

vi.mock("../services/gamificationService", () => ({
  fetchJourney: vi.fn(),
  fetchMissions: vi.fn(),
  completeMission: vi.fn(),
}));

const mission: Mission = {
  key: "missao-v1",
  title: "Missão de teste",
  summary: "Resumo",
  content: ["Conteúdo educativo."],
  questions: [
    {
      id: "q1",
      prompt: "Pergunta 1?",
      options: [
        { id: "a", text: "Opção A" },
        { id: "b", text: "Opção B" },
      ],
    },
  ],
  points: 10,
  completed: false,
};

const journey: JourneyData = {
  balance: 30,
  missions_completed: 0,
  missions_total: 1,
  contributions: { pending: 2, approved: 1, rejected: 0 },
  achievements: [
    {
      key: "primeira-contribuicao",
      title: "Primeira contribuição",
      description: "Tenha um ponto aprovado.",
      unlocked: true,
      progress: 1,
      goal: 1,
    },
  ],
  history: [
    {
      id: 1,
      reason: "contribution_approved",
      description: "Contribuição #7 aprovada",
      points: 30,
      created_at: "2026-11-01T10:00:00Z",
      revoked_at: null,
    },
    {
      id: 2,
      reason: "contribution_approved",
      description: "Contribuição #8 aprovada",
      points: 30,
      created_at: "2026-10-01T10:00:00Z",
      revoked_at: "2026-10-02T10:00:00Z",
    },
  ],
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Journey />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchJourney).mockResolvedValue(journey);
  vi.mocked(fetchMissions).mockResolvedValue([mission]);
});

describe("Minha jornada", () => {
  it("mostra saldo, conquistas e histórico com revogação", async () => {
    setup();
    expect(await screen.findByText("30")).toBeInTheDocument();
    expect(screen.getByText("pontos de participação")).toBeInTheDocument();
    expect(screen.getByText("Conquistada")).toBeInTheDocument();
    expect(screen.getByText(/pontuação revogada/)).toBeInTheDocument();
    expect(screen.getByText(/não medem quantidade reciclada/)).toBeInTheDocument();
  });

  it("envia respostas e mostra pontos ganhos", async () => {
    vi.mocked(completeMission).mockResolvedValue({
      passed: true,
      already_completed: false,
      points_awarded: 10,
      incorrect_question_ids: [],
    });
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "Começar missão" }));
    const submit = screen.getByRole("button", { name: "Enviar respostas" });
    expect(submit).toBeDisabled();
    await user.click(screen.getByLabelText("Opção B"));
    await user.click(submit);
    await waitFor(() =>
      expect(completeMission).toHaveBeenCalledWith(
        { key: "missao-v1", answers: { q1: "b" } },
        expect.anything(),
      ),
    );
    expect(await screen.findByText("Missão concluída! +10 pontos.")).toBeInTheDocument();
    await waitFor(() => expect(fetchJourney).toHaveBeenCalledTimes(2));
  });

  it("destaca resposta incorreta sem recarregar dados", async () => {
    vi.mocked(completeMission).mockResolvedValue({
      passed: false,
      already_completed: false,
      points_awarded: 0,
      incorrect_question_ids: ["q1"],
    });
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "Começar missão" }));
    await user.click(screen.getByLabelText("Opção A"));
    await user.click(screen.getByRole("button", { name: "Enviar respostas" }));
    expect(await screen.findByText("Revise esta resposta.")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Pergunta 1?" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(fetchJourney).toHaveBeenCalledTimes(1);
  });

  it("mostra erro de carregamento", async () => {
    vi.mocked(fetchJourney).mockRejectedValue(new Error("falha"));
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
  });
});
