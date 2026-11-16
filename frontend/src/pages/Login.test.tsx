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
    mockLogin.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } });
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
    expect(screen.getByLabelText("Email")).toHaveValue("erro@teste.com");
    expect(screen.getByLabelText("Senha")).toHaveValue("senha-errada");
  });

  it.each(["email-invalido", "ana@", "ana@dominio", "@teste.com"])(
    "mostra erro para %s sem chamar a API",
    async (email) => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>,
      );
      await user.type(screen.getByLabelText("Email"), email);
      await user.type(screen.getByLabelText("Senha"), "123456");
      await user.click(screen.getByRole("button", { name: "Entrar" }));
      expect(
        await screen.findByText("Informe um e-mail válido, como nome@exemplo.com."),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("Email")).toHaveFocus();
      expect(mockLogin).not.toHaveBeenCalled();
    },
  );

  it("mostra erros dos campos vazios", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(screen.getByText("Informe seu e-mail.")).toBeInTheDocument();
    expect(screen.getByText("Informe sua senha.")).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("remove erro ao corrigir o e-mail e permite enviar", async () => {
    mockLogin.mockResolvedValueOnce({ id: 1, name: "Ana" });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText("Email"), "invalido");
    await user.tab();
    expect(
      screen.getByText("Informe um e-mail válido, como nome@exemplo.com."),
    ).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "ana@teste.com");
    await user.type(screen.getByLabelText("Senha"), "123456");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(
      screen.queryByText("Informe um e-mail válido, como nome@exemplo.com."),
    ).not.toBeInTheDocument();
    expect(mockLogin).toHaveBeenCalledWith("ana@teste.com", "123456");
  });

  it("mantém o aviso de erro acima do botão enquanto os dados continuam inválidos", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText("Email"), "email-invalido");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    const alert = screen.getByRole("alert");
    const button = screen.getByRole("button", { name: "Entrar" });
    expect(alert.nextElementSibling).toBe(button);
    expect(alert).toHaveTextContent("Informe um e-mail válido");
    expect(alert).toHaveTextContent("Informe sua senha.");
    await user.type(screen.getByLabelText("Senha"), "123456");
    expect(screen.getByRole("alert")).toHaveTextContent("Informe um e-mail válido");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
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
