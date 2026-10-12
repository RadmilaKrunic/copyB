import { useQuery, UseQueryOptions, keepPreviousData } from "@tanstack/react-query";
import { DEFAULT_STALE_TIME_MS } from "utils/queryConstants";
import { fetchClientManagementCustomerById, fetchClientManagementCustomers } from "./action";
import {
  ClientManagementCustomerDetails,
  ClientManagementCustomersRequest,
  ClientManagementCustomersResponse,
} from "./clientManagement.types";

export const useClientManagementCustomers = (
  request: ClientManagementCustomersRequest,
  page?: number,
  size?: number,
  options?: UseQueryOptions<ClientManagementCustomersResponse, Error>,
) => {
  const queryKey = [
    "clientManagementCustomers",
    request.ascId,
    request.searchTerm,
    request.customerTypes,
    page,
    size,
  ].filter((v) => v !== undefined);

  return useQuery({
    queryKey,
    queryFn: () => fetchClientManagementCustomers(request, page, size),
    enabled: !!request.ascId,
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: true,
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const useClientManagementCustomerDetails = (
  customerId: string,
  options?: UseQueryOptions<ClientManagementCustomerDetails, Error>,
) =>
  useQuery({
    queryKey: ["clientManagementCustomerDetails", customerId],
    queryFn: () => fetchClientManagementCustomerById(customerId),
    enabled: !!customerId,
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    ...options,
  });
