import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "./client";

describe("API client", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("adiciona token de autenticação no header quando existe", async () => {
    localStorage.setItem("token", "meu-token-jwt");

    const request = api.interceptors.request.handlers[0];
    const config = request.fulfilled({ headers: {} } as any);

    expect(config.headers.Authorization).toBe("Bearer meu-token-jwt");
  });

  it("não adiciona header se não há token", async () => {
    const request = api.interceptors.request.handlers[0];
    const config = request.fulfilled({ headers: {} } as any);

    expect(config.headers.Authorization).toBeUndefined();
  });

  it("redireciona para /login em erro 401", async () => {
    const originalLocation = window.location;
    // biome-ignore lint/suspicious/noAssignInExpressions: necessário para mock
    delete (window as any).location;
    window.location = { href: "" } as Location;

    localStorage.setItem("token", "x");
    localStorage.setItem("user", "{}");

    const response = api.interceptors.response.handlers[0];
    const err = {
      response: { status: 401 },
      config: {},
    };

    await expect(response.rejected(err)).rejects.toThrow();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(window.location.href).toBe("/login");

    window.location = originalLocation;
  });

  it("não redireciona para erros que não são 401", async () => {
    const response = api.interceptors.response.handlers[0];
    const err = {
      response: { status: 404 },
      config: {},
    };

    await expect(response.rejected(err)).rejects.toThrow();
  });
});
