import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DEFAULT_GC_TIME_MS, DEFAULT_STALE_TIME_MS } from "utils/queryConstants";
import { postDefaultParameter } from "./action";
import { DefaultParameterSource, DefaultQuantities } from "./prices.types";
import { buildDefaultParameterRequest, toDefaultQuantities } from "./prices.utils";

/**
 * Returns a function that loads the backend default quantities per position.
 * Same request within the stale time is served from cache (one call when several
 * rows are added). Resolves null when the request cannot be built or fails, so
 * callers keep the country-config quantity.
 */
export const useFetchDefaultQuantities = () => {
  const queryClient = useQueryClient();
  return useCallback(
    async (source: DefaultParameterSource): Promise<DefaultQuantities | null> => {
      const request = buildDefaultParameterRequest(source);
      if (!request) return null;
      try {
        const response = await queryClient.fetchQuery({
          queryKey: ["defaultParameter", request],
          queryFn: () => postDefaultParameter(request),
          staleTime: DEFAULT_STALE_TIME_MS,
          gcTime: DEFAULT_GC_TIME_MS,
          retry: false,
        });
        return toDefaultQuantities(response);
      } catch {
        return null;
      }
    },
    [queryClient],
  );
};
