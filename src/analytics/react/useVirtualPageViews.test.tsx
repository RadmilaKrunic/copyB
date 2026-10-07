import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, useNavigate } from "react-router-dom";
import { useVirtualPageViews } from "./useVirtualPageViews";
import { createNoopAnalytics, type Analytics } from "../core/analytics";

const createMockAnalytics = (): Analytics & { trackVirtualPage: ReturnType<typeof vi.fn> } => ({
  ...createNoopAnalytics(),
  trackVirtualPage: vi.fn(),
});

function RouterHost({ analytics }: { analytics: Analytics }): React.JSX.Element {
  useVirtualPageViews({ analytics });
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate("/job-list")}>to-job-list</button>
      <button onClick={() => navigate("/")}>to-index</button>
      <button onClick={() => navigate("/job-overview/job-a")}>to-job-a</button>
      <button onClick={() => navigate("/job-overview/job-b")}>to-job-b</button>
    </>
  );
}

function HashHost({ analytics }: { analytics: Analytics }): React.JSX.Element {
  useVirtualPageViews({ analytics });
  return <div>host</div>;
}

describe("useVirtualPageViews", () => {
  it("fires a pageview on mount", () => {
    const analytics = createMockAnalytics();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <RouterHost analytics={analytics} />
      </MemoryRouter>,
    );
    expect(analytics.trackVirtualPage).toHaveBeenCalledTimes(1);
  });

  it("fires once per location change", () => {
    const analytics = createMockAnalytics();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <RouterHost analytics={analytics} />
      </MemoryRouter>,
    );
    expect(analytics.trackVirtualPage).toHaveBeenCalledTimes(1); // /dashboard

    fireEvent.click(screen.getByText("to-job-list"));
    expect(analytics.trackVirtualPage).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByText("to-job-list")); // same location → no repeat
    expect(analytics.trackVirtualPage).toHaveBeenCalledTimes(2);
  });

  it("counts a second job opened from a first, which shares its virtual page", () => {
    const analytics = createMockAnalytics();
    render(
      <MemoryRouter initialEntries={["/job-overview/job-a"]}>
        <RouterHost analytics={analytics} />
      </MemoryRouter>,
    );
    expect(analytics.trackVirtualPage).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("to-job-b"));
    expect(analytics.trackVirtualPage).toHaveBeenCalledTimes(2);
  });

  it("does nothing when disabled", () => {
    const analytics = createMockAnalytics();
    function DisabledHost(): React.JSX.Element {
      useVirtualPageViews({ analytics, enabled: false });
      return <div />;
    }
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DisabledHost />
      </MemoryRouter>,
    );
    expect(analytics.trackVirtualPage).not.toHaveBeenCalled();
  });
});

describe("useVirtualPageViews — hash (tab) tracking", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/job-overview/1");
  });
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("fires on a native hashchange (overview tab switch) that React Router does not observe", () => {
    const analytics = createMockAnalytics();
    render(
      <BrowserRouter>
        <HashHost analytics={analytics} />
      </BrowserRouter>,
    );
    // Mount at /job-overview/1 (no hash) → default customer-payment-data tab.
    expect(analytics.trackVirtualPage).toHaveBeenCalledTimes(1);

    act(() => {
      window.history.pushState({}, "", "/job-overview/1#diagnosticData");
      window.dispatchEvent(new Event("hashchange"));
    });
    expect(analytics.trackVirtualPage).toHaveBeenCalledTimes(2);
  });
});
