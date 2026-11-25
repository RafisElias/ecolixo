import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import api from "../api/client";
import { AuthProvider } from "../contexts/AuthContext";
import Login from "./Login";

const adapter = api.defaults.adapter;
const originalLocation = window.location;
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { origin: "http://localhost", href: "http://localhost/login" },
  });
});
afterEach(() => {
  api.defaults.adapter = adapter;
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
});
function setup() {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/map" element={<p>Mapa após login</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe("Login com cliente HTTP e autenticação reais", () => {
  it("mostra erro 401 sem recarregar e permite corrigir e tentar novamente", async () => {
    api.defaults.adapter = async (config) => {
      throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined, {
        status: 401,
        statusText: "Unauthorized",
        headers: new AxiosHeaders(),
        data: { detail: "E-mail ou senha incorretos" },
        config,
      });
    };
    const user = setup();
    await user.type(screen.getByLabelText("Email"), "ana@teste.com");
    await user.type(screen.getByLabelText("Senha"), "errada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email ou senha incorretos");
    expect(window.location.href).toBe("http://localhost/login");
    expect(screen.getByLabelText("Email")).toHaveValue("ana@teste.com");
    expect(localStorage.getItem("token")).toBeNull();

    api.defaults.adapter = async (config) => ({
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: {
        access_token: "teste-token",
        user: { id: 1, name: "Ana", email: "ana@teste.com", type: "citizen" },
      },
    });
    await user.clear(screen.getByLabelText("Senha"));
    await user.type(screen.getByLabelText("Senha"), "123456");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Mapa após login")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe("teste-token");
  });

  it.each(["network", "server"])("trata falha de %s sem acusar senha incorreta", async (kind) => {
    api.defaults.adapter = async (config) => {
      throw new AxiosError(
        "Falha",
        "ERR_NETWORK",
        config,
        undefined,
        kind === "server"
          ? { status: 500, statusText: "Error", headers: new AxiosHeaders(), data: {}, config }
          : undefined,
      );
    };
    const user = setup();
    await user.type(screen.getByLabelText("Email"), "ana@teste.com");
    await user.type(screen.getByLabelText("Senha"), "123456");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      kind === "network"
        ? "Não foi possível conectar ao servidor"
        : "Não foi possível entrar agora",
    );
    expect(window.location.href).toBe("http://localhost/login");
  });
});
