import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createPoint, fetchPoints, reviewPoint, updatePointStatus } from "../services/pointService";
import type { ReviewStatus } from "../types";
import { gamificationKey } from "./useGamification";

type PointFilters = Parameters<typeof fetchPoints>[0];

export const pointsKey = ["points"] as const;

export function usePoints(filters: PointFilters = {}) {
  return useQuery({ queryKey: [...pointsKey, filters], queryFn: () => fetchPoints(filters) });
}

export function useSuspensePoints(filters: PointFilters = {}) {
  return useSuspenseQuery({
    queryKey: [...pointsKey, filters],
    queryFn: () => fetchPoints(filters),
    staleTime: 30_000,
  });
}

export function useCreatePoint() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createPoint,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: pointsKey });
      // A jornada mostra quantas contribuições aguardam revisão.
      client.invalidateQueries({ queryKey: gamificationKey });
    },
  });
}

export function usePointMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: pointsKey });
  const review = useMutation({
    mutationFn: ({ id, review }: { id: number; review: ReviewStatus }) => reviewPoint(id, review),
    onSuccess: invalidate,
  });
  const status = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updatePointStatus(id, status),
    onSuccess: invalidate,
  });
  return { review, status };
}
