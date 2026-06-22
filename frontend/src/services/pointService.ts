import api from "../api/client";
import type { DisposalPoint } from "../types";

export async function fetchPoints(
  filters: { status?: string; category_id?: string } = {},
): Promise<DisposalPoint[]> {
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.category_id) params.category_id = filters.category_id;
  const { data } = await api.get<DisposalPoint[]>("/points", { params });
  return data;
}

export async function fetchHeatmap(): Promise<[number, number, number][]> {
  const { data } = await api.get<[number, number, number][]>("/points/heatmap");
  return data;
}

export async function createPoint(formData: FormData): Promise<void> {
  await api.post("/points", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function updatePointStatus(id: number, status: string): Promise<void> {
  await api.patch(`/points/${id}/status`, { status });
}
