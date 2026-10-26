import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("./action", () => ({ postDefaultParameter: vi.fn() }));

import { postDefaultParameter } from "./action";
import { useFetchDefaultQuantities } from "./hooks";

const mockPost = vi.mocked(postDefaultParameter);

const getFetchDefaultQuantities = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return renderHook(() => useFetchDefaultQuantities(), { wrapper }).result.current;
};

const source = {
  countryCode: "IN",
  ascId: "ASC1",
  jobId: "J1",
  actionType: "REPAIR",
  jobType: "WARRANTY",
  faultCode: "C1",
  faultCodeLabourQuantity: 6,
};

beforeEach(() => vi.clearAllMocks());

describe("useFetchDefaultQuantities", () => {
  it("returns quantities per position", async () => {
    mockPost.mockResolvedValueOnce({
      byPosition: [
        { position: "LA", value: 1, serviceUnits: 5 },
        { position: "FR", value: 1, serviceUnits: null },
      ],
    });
    const fetchQuantities = getFetchDefaultQuantities();
    expect(await fetchQuantities(source)).toEqual({ LA: 1, FR: 1 });
    expect(mockPost).toHaveBeenCalledWith(source);
  });

  it("calls the API once for the same request", async () => {
    mockPost.mockResolvedValue({ byPosition: [{ position: "FR", value: 1, serviceUnits: null }] });
    const fetchQuantities = getFetchDefaultQuantities();
    await fetchQuantities(source);
    await fetchQuantities(source);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it("resolves null when the call fails", async () => {
    mockPost.mockRejectedValueOnce(new Error("fail"));
    const fetchQuantities = getFetchDefaultQuantities();
    expect(await fetchQuantities(source)).toBeNull();
  });

  it("resolves null without calling the API when the request is incomplete", async () => {
    const fetchQuantities = getFetchDefaultQuantities();
    expect(await fetchQuantities({ ...source, jobType: "" })).toBeNull();
    expect(mockPost).not.toHaveBeenCalled();
  });
});
