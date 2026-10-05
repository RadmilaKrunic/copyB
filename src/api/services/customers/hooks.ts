import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DEFAULT_STALE_TIME_MS } from "../../../utils/queryConstants";
import { getCustomerAssets, getCustomerJobs, getCustomerOrders } from "./customers";
import { CustomerAssetsQuery, CustomerJobsQuery, CustomerOrdersQuery } from "./customers.types";

export const useCustomerAssets = (customerId: string, query: CustomerAssetsQuery) =>
  useQuery({
    queryKey: ["customerAssets", customerId, query],
    queryFn: () => getCustomerAssets(customerId, query),
    enabled: !!customerId,
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
  });

export const useCustomerJobs = (customerId: string, query: CustomerJobsQuery) =>
  useQuery({
    queryKey: ["customerJobs", customerId, query],
    queryFn: () => getCustomerJobs(customerId, query),
    enabled: !!customerId,
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });

export const useCustomerOrders = (customerId: string, query: CustomerOrdersQuery) =>
  useQuery({
    queryKey: ["customerOrders", customerId, query],
    queryFn: () => getCustomerOrders(customerId, query),
    enabled: !!customerId,
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
  });
