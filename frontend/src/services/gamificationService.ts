import api from "../api/client";
import type { Journey, Mission, MissionResult } from "../types";

export async function fetchJourney(): Promise<Journey> {
  const { data } = await api.get<Journey>("/gamification/journey");
  return data;
}

export async function fetchMissions(): Promise<Mission[]> {
  const { data } = await api.get<Mission[]>("/gamification/missions");
  return data;
}

export async function completeMission({
  key,
  answers,
}: { key: string; answers: Record<string, string> }): Promise<MissionResult> {
  const { data } = await api.post<MissionResult>(
    `/gamification/missions/${encodeURIComponent(key)}/complete`,
    { answers },
  );
  return data;
}
