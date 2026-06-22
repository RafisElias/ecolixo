import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./Login";

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza formulário de login", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText("🌿 EcoLixo")).toBeDefined();
    expect(screen.getByText("Entrar")).toBeDefined();
    expect(screen.getByText("Cadastre-se")).toBeDefined();
  });

  it("chama login e navega ao submit com dados corretos", async () => {
    mockLogin.mockResolvedValueOnce({ id: 1, name: "Ana" });
    const user = userEvent.setup();

    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    const emailInput = container.querySelector('input[name="email"]')!;
    const passInput = container.querySelector('input[name="password"]')!;

    await user.type(emailInput, "ana@teste.com");
    await user.type(passInput, "123456");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(mockLogin).toHaveBeenCalledWith("ana@teste.com", "123456");
  });

  it("exibe mensagem de erro quando login falha", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Credenciais inválidas"));
    const user = userEvent.setup();

    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(container.querySelector('input[name="email"]')!, "erro@teste.com");
    await user.type(container.querySelector('input[name="password"]')!, "senha-errada");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText("Email ou senha incorretos")).toBeDefined();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("desabilita botão durante o envio", async () => {
    mockLogin.mockReturnValueOnce(new Promise(() => {}));
    const user = userEvent.setup();

    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(container.querySelector('input[name="email"]')!, "a@b.com");
    await user.type(container.querySelector('input[name="password"]')!, "123456");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(screen.getByRole("button", { name: /entrando/i })).toBeDisabled();
  });
});
