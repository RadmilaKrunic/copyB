import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_GC_TIME_MS, DEFAULT_STALE_TIME_MS } from "utils/queryConstants";
import { postDefaultParameter } from "./action";
import { DefaultParameterSource, DefaultQuantities, DefaultPriceRanges } from "./prices.types";
import {
  buildDefaultParameterRequest,
  toDefaultQuantities,
  toTotalAmountPriceRanges,
} from "./prices.utils";

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

const NO_PRICE_RANGES: DefaultPriceRanges = {};

/**
 * Total amount range per position (FR, PC) from the default-parameter API. Shares the cache
 * entry of `useFetchDefaultQuantities`, so rows add no extra call for the same request.
 * Empty while the request is incomplete, loading or failed.
 */
export const useDefaultTotalAmountPriceRanges = (
  source: DefaultParameterSource,
  enabled: boolean,
): DefaultPriceRanges => {
  // The query key is hashed by value, so a new request object per render is fine.
  const request = buildDefaultParameterRequest(source);
  const { data } = useQuery({
    queryKey: ["defaultParameter", request],
    queryFn: () => (request ? postDefaultParameter(request) : Promise.resolve(null)),
    enabled: enabled && request !== null,
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
    retry: false,
    select: toTotalAmountPriceRanges,
  });
  return data ?? NO_PRICE_RANGES;
};
