import api from "../api/client";
import type { Notification } from "../types";

export async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await api.get<Notification[]>("/notifications");
  return data;
}
