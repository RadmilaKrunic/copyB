import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import { useListTracking, type UseListTrackingOptions } from "./useListTracking";
import { AnalyticsContext } from "./analytics-context";
import { createNoopAnalytics, type Analytics } from "../core/analytics";
import { ListInteractionType } from "../domain/enums";

const createMockAnalytics = (): Analytics & {
  trackListInteraction: ReturnType<typeof vi.fn>;
} => ({ ...createNoopAnalytics(), trackListInteraction: vi.fn() });

function Host(props: UseListTrackingOptions): React.JSX.Element {
  useListTracking(props);
  return <div />;
}

const renderHook = (analytics: Analytics, props: UseListTrackingOptions) =>
  render(
    <AnalyticsContext.Provider value={analytics}>
      <Host {...props} />
    </AnalyticsContext.Provider>,
  );

const settle = () => act(() => void vi.advanceTimersByTime(600));

describe("useListTracking", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not report anything on first render", () => {
    const analytics = createMockAnalytics();
    renderHook(analytics, { searchValue: "", activeFilterKeys: [], resultCount: 10 });
    settle();
    expect(analytics.trackListInteraction).not.toHaveBeenCalled();
  });

  it("reports a search once it settles, with the result count", () => {
    const analytics = createMockAnalytics();
    const { rerender } = renderHook(analytics, {
      searchValue: "",
      activeFilterKeys: [],
      resultCount: 10,
    });

    rerender(
      <AnalyticsContext.Provider value={analytics}>
        <Host searchValue="dril" activeFilterKeys={[]} resultCount={3} />
      </AnalyticsContext.Provider>,
    );
    expect(analytics.trackListInteraction).not.toHaveBeenCalled(); // still typing
    settle();

    expect(analytics.trackListInteraction).toHaveBeenCalledTimes(1);
    expect(analytics.trackListInteraction).toHaveBeenCalledWith({
      interactionType: ListInteractionType.SEARCH,
      resultCount: 3,
    });
  });

  it("reports one search per settle, not one per keystroke", () => {
    const analytics = createMockAnalytics();
    const { rerender } = renderHook(analytics, {
      searchValue: "",
      activeFilterKeys: [],
      resultCount: 9,
    });

    for (const value of ["d", "dr", "dri", "dril"]) {
      rerender(
        <AnalyticsContext.Provider value={analytics}>
          <Host searchValue={value} activeFilterKeys={[]} resultCount={9} />
        </AnalyticsContext.Provider>,
      );
    }
    settle();
    expect(analytics.trackListInteraction).toHaveBeenCalledTimes(1);
  });

  it("reports a zero-result search, which is the point of the result count", () => {
    const analytics = createMockAnalytics();
    const { rerender } = renderHook(analytics, {
      searchValue: "",
      activeFilterKeys: [],
      resultCount: 10,
    });
    rerender(
      <AnalyticsContext.Provider value={analytics}>
        <Host searchValue="nothing matches" activeFilterKeys={[]} resultCount={0} />
      </AnalyticsContext.Provider>,
    );
    settle();
    expect(analytics.trackListInteraction).toHaveBeenCalledWith({
      interactionType: ListInteractionType.SEARCH,
      resultCount: 0,
    });
  });

  it("does not report clearing the search box as a search", () => {
    const analytics = createMockAnalytics();
    const { rerender } = renderHook(analytics, {
      searchValue: "drill",
      activeFilterKeys: [],
      resultCount: 3,
    });
    rerender(
      <AnalyticsContext.Provider value={analytics}>
        <Host searchValue="" activeFilterKeys={[]} resultCount={10} />
      </AnalyticsContext.Provider>,
    );
    settle();
    expect(analytics.trackListInteraction).not.toHaveBeenCalled();
  });

  it("reports an applied filter by key, never by value", () => {
    const analytics = createMockAnalytics();
    const { rerender } = renderHook(analytics, { activeFilterKeys: [], resultCount: 10 });
    rerender(
      <AnalyticsContext.Provider value={analytics}>
        <Host activeFilterKeys={["status"]} resultCount={4} />
      </AnalyticsContext.Provider>,
    );
    expect(analytics.trackListInteraction).toHaveBeenCalledWith({
      interactionType: ListInteractionType.FILTER_APPLIED,
      filterName: "status",
      resultCount: 4,
    });
  });

  it("reports clearing the last filter as filter_cleared", () => {
    const analytics = createMockAnalytics();
    const { rerender } = renderHook(analytics, {
      activeFilterKeys: ["status"],
      resultCount: 4,
    });
    rerender(
      <AnalyticsContext.Provider value={analytics}>
        <Host activeFilterKeys={[]} resultCount={10} />
      </AnalyticsContext.Provider>,
    );
    expect(analytics.trackListInteraction).toHaveBeenCalledWith({
      interactionType: ListInteractionType.FILTER_CLEARED,
      filterName: "status",
      resultCount: 10,
    });
  });

  it("reports removing one filter while others remain as filter_cleared, naming the removed one", () => {
    const analytics = createMockAnalytics();
    const { rerender } = renderHook(analytics, {
      activeFilterKeys: ["status", "assignee"],
      resultCount: 4,
    });
    rerender(
      <AnalyticsContext.Provider value={analytics}>
        <Host activeFilterKeys={["status"]} resultCount={9} />
      </AnalyticsContext.Provider>,
    );
    expect(analytics.trackListInteraction).toHaveBeenCalledTimes(1);
    expect(analytics.trackListInteraction).toHaveBeenCalledWith({
      interactionType: ListInteractionType.FILTER_CLEARED,
      filterName: "assignee",
      resultCount: 9,
    });
  });

  it("reports every filter applied in one save, not just the first", () => {
    const analytics = createMockAnalytics();
    const { rerender } = renderHook(analytics, { activeFilterKeys: [], resultCount: 50 });
    rerender(
      <AnalyticsContext.Provider value={analytics}>
        <Host activeFilterKeys={["status", "model", "serialNumber"]} resultCount={2} />
      </AnalyticsContext.Provider>,
    );
    expect(analytics.trackListInteraction).toHaveBeenCalledTimes(3);
    const names = analytics.trackListInteraction.mock.calls.map((c) => c[0].filterName);
    expect(names).toEqual(["status", "model", "serialNumber"]);
  });

  it("reports a filter whose value changed but whose key did not", () => {
    const analytics = createMockAnalytics();
    const { rerender } = renderHook(analytics, {
      activeFilterKeys: ["dateRange"],
      filterSignature: "2026-01-01|2026-01-31",
      resultCount: 10,
    });
    rerender(
      <AnalyticsContext.Provider value={analytics}>
        <Host
          activeFilterKeys={["dateRange"]}
          filterSignature="2026-02-01|2026-02-28"
          resultCount={4}
        />
      </AnalyticsContext.Provider>,
    );
    expect(analytics.trackListInteraction).toHaveBeenCalledWith({
      interactionType: ListInteractionType.FILTER_APPLIED,
      filterName: "dateRange",
      resultCount: 4,
    });
  });

  it("does not restart the settle clock when the result count arrives mid-search", () => {
    const analytics = createMockAnalytics();
    const { rerender } = renderHook(analytics, {
      searchValue: "",
      activeFilterKeys: [],
      resultCount: 50,
    });
    rerender(
      <AnalyticsContext.Provider value={analytics}>
        <Host searchValue="drill" activeFilterKeys={[]} resultCount={50} />
      </AnalyticsContext.Provider>,
    );
    act(() => void vi.advanceTimersByTime(300));
    rerender(
      <AnalyticsContext.Provider value={analytics}>
        <Host searchValue="drill" activeFilterKeys={[]} resultCount={6} />
      </AnalyticsContext.Provider>,
    );
    act(() => void vi.advanceTimersByTime(300));
    expect(analytics.trackListInteraction).toHaveBeenCalledWith({
      interactionType: ListInteractionType.SEARCH,
      resultCount: 6,
    });
  });

  it("ignores a re-render that changes nothing", () => {
    const analytics = createMockAnalytics();
    const { rerender } = renderHook(analytics, {
      activeFilterKeys: ["status"],
      resultCount: 4,
    });
    rerender(
      <AnalyticsContext.Provider value={analytics}>
        <Host activeFilterKeys={["status"]} resultCount={4} />
      </AnalyticsContext.Provider>,
    );
    expect(analytics.trackListInteraction).not.toHaveBeenCalled();
  });

  it("holds a server-side search back until its own result count has arrived", () => {
    const analytics = createMockAnalytics();
    const { rerender } = renderHook(analytics, {
      searchValue: "",
      activeFilterKeys: [],
      resultCount: 50,
      isLoading: false,
    });

    rerender(
      <AnalyticsContext.Provider value={analytics}>
        <Host searchValue="drill" activeFilterKeys={[]} resultCount={50} isLoading />
      </AnalyticsContext.Provider>,
    );
    settle();
    expect(analytics.trackListInteraction).not.toHaveBeenCalled(); // stale count withheld

    rerender(
      <AnalyticsContext.Provider value={analytics}>
        <Host searchValue="drill" activeFilterKeys={[]} resultCount={7} isLoading={false} />
      </AnalyticsContext.Provider>,
    );
    settle();
    expect(analytics.trackListInteraction).toHaveBeenCalledWith({
      interactionType: ListInteractionType.SEARCH,
      resultCount: 7,
    });
  });
});
