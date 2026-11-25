import { isAxiosError } from "axios";

/** Mensagem do backend quando ela é texto; erros de validação (listas) usam o fallback. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const detail = isAxiosError(err) ? err.response?.data?.detail : undefined;
  return typeof detail === "string" && detail ? detail : fallback;
}
