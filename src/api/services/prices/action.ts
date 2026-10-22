import axiosClient from "api/axios-client/axiosClient";
import { AxiosResponse } from "axios";
import { DefaultParameterRequest, DefaultParameterResponse } from "./prices.types";

export const postDefaultParameter = async (
  payload: DefaultParameterRequest,
): Promise<DefaultParameterResponse> => {
  try {
    const response: AxiosResponse<DefaultParameterResponse> =
      await axiosClient.post<DefaultParameterResponse>("/v1/job/prices/default-parameter", payload);
    return response.data;
  } catch (error) {
    console.error("Error fetching default price parameters:", error);
    throw error;
  }
};
