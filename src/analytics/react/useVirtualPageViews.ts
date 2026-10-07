import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import type { Analytics } from "../core/analytics";
import type { VirtualPageDefinition } from "../domain/types";
import { resolveVirtualPage, type RouteLocation } from "../core/virtual-pages";

export interface UseVirtualPageViewsOptions {
  readonly analytics: Analytics;
  readonly onResolve?: (page: VirtualPageDefinition) => void;
  readonly enabled?: boolean;
}

/** Keyed on the location, not the virtual page, so job A → job B still counts as a view. */
const toLocationKey = (location: RouteLocation): string =>
  `${location.pathname}#${(location.hash ?? "").replace(/^#/, "")}`;

export const useVirtualPageViews = ({
  analytics,
  onResolve,
  enabled = true,
}: UseVirtualPageViewsOptions): void => {
  const location = useLocation();
  const lastLocationKeyRef = useRef<string | null>(null);
  const onResolveRef = useRef(onResolve);
  onResolveRef.current = onResolve;

  const track = useCallback(
    (routeLocation: RouteLocation): void => {
      const page = resolveVirtualPage(routeLocation);
      onResolveRef.current?.(page);
      if (!enabled) return;
      const locationKey = toLocationKey(routeLocation);
      if (locationKey === lastLocationKeyRef.current) return;
      lastLocationKeyRef.current = locationKey;
      analytics.trackVirtualPage();
    },
    [analytics, enabled],
  );

  useEffect(() => {
    track({ pathname: location.pathname, hash: location.hash });
  }, [location.pathname, location.hash, track]);

  useEffect(() => {
    if (globalThis.window === undefined) return undefined;
    const handleHashChange = (): void =>
      track({
        pathname: globalThis.window.location.pathname,
        hash: globalThis.window.location.hash,
      });
    globalThis.window.addEventListener("hashchange", handleHashChange);
    return () => globalThis.window.removeEventListener("hashchange", handleHashChange);
  }, [track]);
};
