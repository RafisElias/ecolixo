import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Register from "./Register";

const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ register: mockRegister }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn() },
}));

describe("Register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza formulário de cadastro", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /criar conta/i })).toBeDefined();
    expect(screen.getByText("Cidadão")).toBeDefined();
    expect(screen.getByText("Gestor Municipal")).toBeDefined();
    expect(screen.getByText("Entrar")).toBeDefined();
  });

  it("não exibe campo código de gestor para cidadão", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Código de registro do gestor")).toBeNull();
  });

  it("exibe campo código de gestor quando tipo é manager", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    const select = container.querySelector('select[name="type"]')!;
    await user.selectOptions(select, "manager");

    expect(screen.getByText("Código de registro do gestor")).toBeDefined();
  });

  it("chama register e navega ao submit com dados corretos (cidadão)", async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    const { container } = render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    await user.type(container.querySelector('input[name="name"]')!, "Ana Silva");
    await user.type(container.querySelector('input[name="email"]')!, "ana@teste.com");
    await user.type(container.querySelector('input[name="password"]')!, "123456");
    await user.type(container.querySelector('input[name="passwordConfirm"]')!, "123456");
    await user.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(mockRegister).toHaveBeenCalledWith(
      "Ana Silva",
      "ana@teste.com",
      "123456",
      "citizen",
      "",
    );
  });

  it("não chama register quando senhas não conferem", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    await user.type(container.querySelector('input[name="password"]')!, "123456");
    await user.type(container.querySelector('input[name="passwordConfirm"]')!, "654321");
    await user.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("passa código de registro para gestor", async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    const { container } = render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    await user.selectOptions(container.querySelector('select[name="type"]')!, "manager");
    await user.type(container.querySelector('input[name="name"]')!, "Gestor");
    await user.type(container.querySelector('input[name="email"]')!, "gestor@teste.com");
    await user.type(container.querySelector('input[name="password"]')!, "123456");
    await user.type(container.querySelector('input[name="passwordConfirm"]')!, "123456");
    await user.type(container.querySelector('input[name="registrationCode"]')!, "ecolixo@2026");
    await user.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(mockRegister).toHaveBeenCalledWith(
      "Gestor",
      "gestor@teste.com",
      "123456",
      "manager",
      "ecolixo@2026",
    );
  });
});
