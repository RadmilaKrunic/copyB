import axiosClient from "../../axios-client/axiosClient";

export const deleteCustomer = async (customerId: string): Promise<void> => {
  await axiosClient.delete(`/v1/customers/${encodeURIComponent(customerId)}`);
};
