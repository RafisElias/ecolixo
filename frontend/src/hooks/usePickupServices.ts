import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deletePickupService,
  fetchPickupService,
  fetchPickupServices,
  savePickupService,
} from "../services/pickupService";

export function usePickupServices(categoryId: string) {
  return useQuery({
    queryKey: ["pickup-services", categoryId],
    queryFn: () => fetchPickupServices(categoryId),
  });
}

export function usePickupService(id: number) {
  return useQuery({
    queryKey: ["pickup-services", "detail", id],
    queryFn: () => fetchPickupService(id),
    enabled: Number.isSafeInteger(id) && id > 0,
    retry: false,
  });
}

export function usePickupServiceMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: ["pickup-services"] });
  const save = useMutation({ mutationFn: savePickupService, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deletePickupService, onSuccess: invalidate });
  return { save, remove };
}
