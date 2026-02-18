import { useQuery } from "@tanstack/react-query";

interface LiveryItem {
  imageKey: string;
  label: string;
  imageUrl: string | null;
  defaultUrl: string;
  mediaType?: "image" | "video";
  textContent?: string | null;
  defaultText?: string | null;
  itemType?: "media" | "text";
}

export function useLivery() {
  const { data: items, isLoading } = useQuery<LiveryItem[]>({
    queryKey: ["/api/livery"],
    staleTime: 5 * 60 * 1000,
  });

  const getImage = (imageKey: string, fallback?: string): string => {
    if (!items) return fallback || "";
    const item = items.find((i) => i.imageKey === imageKey);
    if (!item) return fallback || "";
    return item.imageUrl || item.defaultUrl;
  };

  const getMediaType = (imageKey: string): "image" | "video" => {
    if (!items) return "image";
    const item = items.find((i) => i.imageKey === imageKey);
    return item?.mediaType || "image";
  };

  const getMedia = (imageKey: string, fallback?: string): { url: string; type: "image" | "video" } => {
    if (!items) return { url: fallback || "", type: "image" };
    const item = items.find((i) => i.imageKey === imageKey);
    if (!item) return { url: fallback || "", type: "image" };
    return {
      url: item.imageUrl || item.defaultUrl,
      type: item?.mediaType || "image",
    };
  };

  const getText = (imageKey: string, fallback?: string): string => {
    if (!items) return fallback || "";
    const item = items.find((i) => i.imageKey === imageKey);
    if (!item) return fallback || "";
    if (item.textContent !== null && item.textContent !== undefined) return item.textContent;
    return item.defaultText || fallback || "";
  };

  return { items, isLoading, getImage, getMediaType, getMedia, getText };
}
