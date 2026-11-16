import api from "../api/client";
import type { PickupService, PickupServiceInput } from "../types";

export async function fetchPickupServices(categoryId: string): Promise<PickupService[]> {
  const { data } = await api.get<PickupService[]>("/pickup-services", {
    params: categoryId ? { category_id: categoryId } : {},
  });
  return data;
}

export async function fetchPickupService(id: number): Promise<PickupService> {
  const { data } = await api.get<PickupService>(`/pickup-services/${id}`);
  return data;
}

export async function savePickupService({ id, body }: { id?: number; body: PickupServiceInput }) {
  const { data } = id
    ? await api.put<PickupService>(`/pickup-services/${id}`, body)
    : await api.post<PickupService>("/pickup-services", body);
  return data;
}

export async function deletePickupService(id: number) {
  await api.delete(`/pickup-services/${id}`);
}
