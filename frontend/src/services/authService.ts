import api from "../api/client";
import type { User } from "../types";

interface LoginResponse {
  access_token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", { email, password });
  return data;
}

export async function register(
  name: string,
  email: string,
  password: string,
  type: string,
  registrationCode = "",
): Promise<void> {
  await api.post("/auth/register", {
    name,
    email,
    password,
    password_confirm: password,
    type,
    registration_code: registrationCode,
  });
}
