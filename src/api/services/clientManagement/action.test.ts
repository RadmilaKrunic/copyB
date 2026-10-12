import { describe, it, expect, vi, beforeEach } from "vitest";
import axiosClient from "api/axios-client/axiosClient";
import { fetchClientManagementCustomers, fetchClientManagementCustomerById } from "./action";
import type {
  ClientManagementCustomerDetails,
  ClientManagementCustomersRequest,
} from "./clientManagement.types";

vi.mock("api/axios-client/axiosClient", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const mockPost = vi.mocked(axiosClient.post);
const mockGet = vi.mocked(axiosClient.get);

const request: ClientManagementCustomersRequest = {
  ascId: "asc-1",
};

const responseData = {
  content: [],
  page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
};

describe("fetchClientManagementCustomers", () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ data: responseData } as any);
  });

  it("posts to the base URL with no query params when page and size are omitted", async () => {
    await fetchClientManagementCustomers(request);

    expect(mockPost).toHaveBeenCalledWith("/v1/data/client-management/customers", request);
  });

  it("appends only the page param when page is provided", async () => {
    await fetchClientManagementCustomers(request, 2);

    expect(mockPost).toHaveBeenCalledWith("/v1/data/client-management/customers?page=2", request);
  });

  it("appends only the size param when size is provided", async () => {
    await fetchClientManagementCustomers(request, undefined, 50);

    expect(mockPost).toHaveBeenCalledWith("/v1/data/client-management/customers?size=50", request);
  });

  it("appends both page and size params when both are provided", async () => {
    await fetchClientManagementCustomers(request, 2, 50);

    expect(mockPost).toHaveBeenCalledWith(
      "/v1/data/client-management/customers?page=2&size=50",
      request,
    );
  });

  it("treats page 0 as a provided value, not as omitted", async () => {
    await fetchClientManagementCustomers(request, 0);

    expect(mockPost).toHaveBeenCalledWith("/v1/data/client-management/customers?page=0", request);
  });

  it("returns response.data on success", async () => {
    const result = await fetchClientManagementCustomers(request);

    expect(result).toEqual(responseData);
  });

  it("logs and rethrows when the request fails", async () => {
    const error = new Error("Network error");
    mockPost.mockRejectedValue(error);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(fetchClientManagementCustomers(request)).rejects.toThrow("Network error");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching client management customers:",
      error,
    );

    consoleErrorSpy.mockRestore();
  });
});

describe("fetchClientManagementCustomerById", () => {
  const customerId = "customer-123";
  const customerDetails = {
    id: customerId,
  } as unknown as ClientManagementCustomerDetails;

  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: customerDetails } as any);
  });

  it("calls GET with the customer id in the URL", async () => {
    await fetchClientManagementCustomerById(customerId);

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith("/v1/data/client-management/customers/customer-123");
  });

  it("returns response.data on success", async () => {
    const result = await fetchClientManagementCustomerById(customerId);

    expect(result).toEqual(customerDetails);
  });

  it("logs and rethrows when the request fails", async () => {
    const error = new Error("Not found");
    mockGet.mockRejectedValue(error);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(fetchClientManagementCustomerById(customerId)).rejects.toThrow("Not found");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching client management customer details:",
      error,
    );

    consoleErrorSpy.mockRestore();
  });
});
