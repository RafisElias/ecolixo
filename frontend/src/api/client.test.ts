import { type AxiosAdapter, AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import api from "./client";

const originalAdapter = api.defaults.adapter;
const originalLocation = window.location;

function rejectWith(status: number): AxiosAdapter {
  return async (config) => {
    throw new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, undefined, {
      status,
      statusText: "Error",
      data: {},
      headers: new AxiosHeaders(),
      config,
    });
  };
}

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { href: "http://localhost/login", origin: "http://localhost" },
  });
});
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
});

describe("API client", () => {
  it("adiciona token quando existe", async () => {
    localStorage.setItem("token", "meu-token-jwt");
    const adapter = vi.fn<AxiosAdapter>(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    await api.get("/points", { adapter });
    expect(adapter.mock.calls[0][0].headers.Authorization).toBe("Bearer meu-token-jwt");
  });

  it("não adiciona token quando não existe", async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    await api.get("/points", { adapter });
    expect(adapter.mock.calls[0][0].headers.Authorization).toBeUndefined();
  });

  it("limpa sessão e redireciona em 401 de rota protegida", async () => {
    localStorage.setItem("token", "expirado");
    localStorage.setItem("user", "{}");
    await expect(api.get("/points", { adapter: rejectWith(401) })).rejects.toBeInstanceOf(
      AxiosError,
    );
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(window.location.href).toBe("/login");
  });

  it.each(["/auth/login", "/auth/register", "/api/auth/login", "http://localhost/api/auth/login"])(
    "propaga 401 de %s sem redirecionar ou limpar sessão",
    async (url) => {
      localStorage.setItem("token", "existente");
      localStorage.setItem("user", "{}");
      await expect(api.post(url, {}, { adapter: rejectWith(401) })).rejects.toBeInstanceOf(
        AxiosError,
      );
      expect(window.location.href).toBe("http://localhost/login");
      expect(localStorage.getItem("token")).toBe("existente");
      expect(localStorage.getItem("user")).toBe("{}");
    },
  );

  it("não redireciona em outros erros", async () => {
    await expect(api.get("/points", { adapter: rejectWith(500) })).rejects.toBeInstanceOf(
      AxiosError,
    );
    expect(window.location.href).toBe("http://localhost/login");
  });
});
