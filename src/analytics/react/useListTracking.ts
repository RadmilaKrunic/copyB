import { useEffect, useRef } from "react";
import { useAnalytics } from "./useAnalytics";
import { ListInteractionType } from "../domain/enums";

const SEARCH_SETTLE_MS = 500;

export interface UseListTrackingOptions {
  readonly searchValue?: string;
  /** Applied filter keys. Values are never sent: they can hold a customer name or serial number. */
  readonly activeFilterKeys?: readonly string[];
  /**
   * Changes when a filter's value changes but its key set does not, e.g. moving a date range.
   * Compared internally only and never pushed, so it may contain values.
   */
  readonly filterSignature?: string;
  readonly resultCount: number;
  /** Holds reporting back until the count belongs to the new search. Pass `isFetching || isError`. */
  readonly isLoading?: boolean;
}

const sameKeys = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((key) => b.includes(key));

/**
 * Reports search and filter use for one list screen. Lives here rather than in the shared Filters
 * component because filtering happens in each screen, so only the screen knows the result count.
 * The list is identified by the virtual page, which the tracker injects on every push.
 */
export const useListTracking = ({
  searchValue = "",
  activeFilterKeys = [],
  filterSignature = "",
  resultCount,
  isLoading = false,
}: UseListTrackingOptions): void => {
  const analytics = useAnalytics();
  const reportedSearchRef = useRef<string | null>(null);
  const reportedFiltersRef = useRef<readonly string[] | null>(null);
  const reportedSignatureRef = useRef<string | null>(null);

  // Read at fire time so a result arriving mid-settle does not restart the clock.
  const resultCountRef = useRef(resultCount);
  resultCountRef.current = resultCount;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  useEffect(() => {
    if (reportedSearchRef.current === null) {
      if (isLoading) return undefined;
      reportedSearchRef.current = searchValue;
      return undefined;
    }
    if (reportedSearchRef.current === searchValue) return undefined;

    const timer = setTimeout(() => {
      if (isLoadingRef.current) return;
      reportedSearchRef.current = searchValue;
      if (searchValue.trim().length === 0) return;
      analytics.trackListInteraction({
        interactionType: ListInteractionType.SEARCH,
        resultCount: resultCountRef.current,
      });
    }, SEARCH_SETTLE_MS);

    return () => clearTimeout(timer);
  }, [analytics, searchValue, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const previousKeys = reportedFiltersRef.current;
    const previousSignature = reportedSignatureRef.current;
    if (previousKeys === null) {
      reportedFiltersRef.current = activeFilterKeys;
      reportedSignatureRef.current = filterSignature;
      return;
    }

    const keysChanged = !sameKeys(previousKeys, activeFilterKeys);
    const signatureChanged = previousSignature !== filterSignature;
    if (!keysChanged && !signatureChanged) return;
    reportedFiltersRef.current = activeFilterKeys;
    reportedSignatureRef.current = filterSignature;

    const added = activeFilterKeys.filter((key) => !previousKeys.includes(key));
    const removed = previousKeys.filter((key) => !activeFilterKeys.includes(key));

    for (const filterName of added) {
      analytics.trackListInteraction({
        interactionType: ListInteractionType.FILTER_APPLIED,
        filterName,
        resultCount,
      });
    }
    for (const filterName of removed) {
      analytics.trackListInteraction({
        interactionType: ListInteractionType.FILTER_CLEARED,
        filterName,
        resultCount,
      });
    }
    if (added.length === 0 && removed.length === 0) {
      analytics.trackListInteraction({
        interactionType: ListInteractionType.FILTER_APPLIED,
        filterName: activeFilterKeys.length === 1 ? activeFilterKeys[0] : undefined,
        resultCount,
      });
    }
  }, [analytics, activeFilterKeys, filterSignature, resultCount, isLoading]);
};
