import { useQuery } from "@tanstack/react-query";
import type { SiteLivery } from "@shared/schema";

export function useLivery() {
  const { data: items, isLoading } = useQuery<SiteLivery[]>({
    queryKey: ["/api/livery"],
    staleTime: 5 * 60 * 1000,
  });

  const getImage = (imageKey: string, fallback?: string): string => {
    if (!items) return fallback || "";
    const item = items.find((i) => i.imageKey === imageKey);
    if (!item) return fallback || "";
    return item.imageUrl || item.defaultUrl;
  };

  return { items, isLoading, getImage };
}
