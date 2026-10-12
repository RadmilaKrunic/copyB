import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, UseQueryOptions } from "@tanstack/react-query";
import React, { ReactNode } from "react";
import { useClientManagementCustomers, useClientManagementCustomerDetails } from "./hooks";
import { fetchClientManagementCustomers, fetchClientManagementCustomerById } from "./action";
import type {
  ClientManagementCustomerDetails,
  ClientManagementCustomersRequest,
  ClientManagementCustomersResponse,
} from "./clientManagement.types";

vi.mock("./action", () => ({
  fetchClientManagementCustomers: vi.fn(),
  fetchClientManagementCustomerById: vi.fn(),
}));

const mockFetch = vi.mocked(fetchClientManagementCustomers);
const mockFetchById = vi.mocked(fetchClientManagementCustomerById);

const responseData = {
  content: [],
  page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper, queryClient };
};

describe("useClientManagementCustomers", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(responseData);
  });

  it("calls fetchClientManagementCustomers with the request, page and size", async () => {
    const request: ClientManagementCustomersRequest = { ascId: "asc-1" };
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useClientManagementCustomers(request, 2, 50), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(request, 2, 50);
  });

  it("calls the fetcher with undefined page and size when they are omitted", async () => {
    const request: ClientManagementCustomersRequest = { ascId: "asc-1" };
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useClientManagementCustomers(request), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(request, undefined, undefined);
  });

  it("returns the fetched data on success", async () => {
    const request: ClientManagementCustomersRequest = { ascId: "asc-1" };
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useClientManagementCustomers(request), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(responseData);
  });

  it("does not fetch when ascId is empty", () => {
    const request: ClientManagementCustomersRequest = { ascId: "" };
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useClientManagementCustomers(request), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("refetches when searchTerm changes", async () => {
    const { wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      ({ request }: { request: ClientManagementCustomersRequest }) =>
        useClientManagementCustomers(request),
      {
        wrapper,
        initialProps: { request: { ascId: "asc-1", searchTerm: "a" } },
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    rerender({ request: { ascId: "asc-1", searchTerm: "b" } });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(mockFetch).toHaveBeenLastCalledWith(
      { ascId: "asc-1", searchTerm: "b" },
      undefined,
      undefined,
    );
  });

  it("refetches when page changes", async () => {
    const request: ClientManagementCustomersRequest = { ascId: "asc-1" };
    const { wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      ({ page }: { page: number }) => useClientManagementCustomers(request, page, 20),
      { wrapper, initialProps: { page: 0 } },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenLastCalledWith(request, 0, 20);

    rerender({ page: 1 });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(mockFetch).toHaveBeenLastCalledWith(request, 1, 20);
  });

  it("builds the query key from request fields, page and size", async () => {
    const request = {
      ascId: "asc-1",
      searchTerm: "john",
      customerTypes: ["PERSON"],
    } as unknown as ClientManagementCustomersRequest;
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useClientManagementCustomers(request, 2, 50), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey);

    expect(keys).toContainEqual(["clientManagementCustomers", "asc-1", "john", ["PERSON"], 2, 50]);
  });

  it("filters undefined values out of the query key", async () => {
    const request: ClientManagementCustomersRequest = { ascId: "asc-1" };
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useClientManagementCustomers(request), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey);

    expect(keys).toContainEqual(["clientManagementCustomers", "asc-1"]);
  });

  it("keeps previous data as placeholder while the next page is loading", async () => {
    const request: ClientManagementCustomersRequest = { ascId: "asc-1" };
    const nextPageData = {
      content: [],
      page: { number: 1, size: 20, totalElements: 0, totalPages: 0 },
    } as unknown as ClientManagementCustomersResponse;

    let resolveNext: (value: ClientManagementCustomersResponse) => void = () => {};
    mockFetch.mockResolvedValueOnce(responseData as ClientManagementCustomersResponse);
    mockFetch.mockReturnValueOnce(
      new Promise<ClientManagementCustomersResponse>((resolve) => {
        resolveNext = resolve;
      }),
    );

    const { wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      ({ page }: { page: number }) => useClientManagementCustomers(request, page, 20),
      { wrapper, initialProps: { page: 0 } },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ page: 1 });

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true));
    expect(result.current.data).toEqual(responseData);

    resolveNext(nextPageData);

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    expect(result.current.data).toEqual(nextPageData);
  });

  it("allows options to override defaults", () => {
    const request: ClientManagementCustomersRequest = { ascId: "asc-1" };
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useClientManagementCustomers(request, 0, 20, {
          enabled: false,
        } as UseQueryOptions<ClientManagementCustomersResponse, Error>),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("exposes the error when the fetcher fails", async () => {
    const request: ClientManagementCustomersRequest = { ascId: "asc-1" };
    const error = new Error("Network error");
    mockFetch.mockRejectedValue(error);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useClientManagementCustomers(request), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(error);
  });
});

describe("useClientManagementCustomerDetails", () => {
  const customerId = "customer-123";
  const customerDetails = { id: customerId } as unknown as ClientManagementCustomerDetails;

  beforeEach(() => {
    mockFetchById.mockReset();
    mockFetchById.mockResolvedValue(customerDetails);
  });

  it("calls fetchClientManagementCustomerById with the customer id", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useClientManagementCustomerDetails(customerId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetchById).toHaveBeenCalledTimes(1);
    expect(mockFetchById).toHaveBeenCalledWith(customerId);
  });

  it("returns the fetched data on success", async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useClientManagementCustomerDetails(customerId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(customerDetails);
  });

  it("does not fetch when customerId is empty", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useClientManagementCustomerDetails(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetchById).not.toHaveBeenCalled();
  });

  it("uses the customer id in the query key", async () => {
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useClientManagementCustomerDetails(customerId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey);

    expect(keys).toContainEqual(["clientManagementCustomerDetails", customerId]);
  });

  it("refetches when customerId changes", async () => {
    const { wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useClientManagementCustomerDetails(id),
      { wrapper, initialProps: { id: "customer-1" } },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetchById).toHaveBeenLastCalledWith("customer-1");

    rerender({ id: "customer-2" });

    await waitFor(() => expect(mockFetchById).toHaveBeenCalledTimes(2));
    expect(mockFetchById).toHaveBeenLastCalledWith("customer-2");
  });

  it("allows options to override defaults", () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useClientManagementCustomerDetails(customerId, {
          enabled: false,
        } as UseQueryOptions<ClientManagementCustomerDetails, Error>),
      { wrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetchById).not.toHaveBeenCalled();
  });

  it("exposes the error when the fetcher fails", async () => {
    const error = new Error("Not found");
    mockFetchById.mockRejectedValue(error);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useClientManagementCustomerDetails(customerId), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(error);
  });
});
