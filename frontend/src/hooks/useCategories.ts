import { useSuspenseQuery } from "@tanstack/react-query";
import { fetchCategories } from "../services/categoryService";
import type { Category } from "../types";

export function useCategories(): Category[] {
  const { data } = useSuspenseQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: Number.POSITIVE_INFINITY,
  });
  return data;
}
