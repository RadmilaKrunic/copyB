import { PaginationPage } from "components/ui/Pagination/Pagination";

export interface ClientManagementCustomer {
  customerId: string;
  customerType: string;
  name: string;
  primaryEmail: string;
  phoneNumber: string;
  assetCount: number;
}

export interface ClientManagementCustomersRequest {
  ascId: string;
  searchTerm?: string;
  customerTypes?: string[];
}

export interface ClientManagementCustomersResponse {
  content: ClientManagementCustomer[];
  page: PaginationPage;
}

export interface ClientManagementCustomerBillingAddress {
  city: string;
  stateProvinceRegion: string;
  countryCode: string;
  postalCode: string;
}

export interface ClientManagementCustomerDetails {
  customerId: string;
  name: string;
  phoneNumber: string;
  email: string;
  billingAddress: ClientManagementCustomerBillingAddress;
  assetCount: number;
  totalActiveJobs: number;
  createdAt: string;
}
