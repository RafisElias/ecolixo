import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { completeMission, fetchJourney, fetchMissions } from "../services/gamificationService";

export const gamificationKey = ["gamification"] as const;

export function useJourney() {
  return useQuery({ queryKey: [...gamificationKey, "journey"], queryFn: fetchJourney });
}

export function useMissions() {
  return useQuery({ queryKey: [...gamificationKey, "missions"], queryFn: fetchMissions });
}

export function useCompleteMission() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: completeMission,
    onSuccess: (result) => {
      if (result.passed) client.invalidateQueries({ queryKey: gamificationKey });
    },
  });
}
