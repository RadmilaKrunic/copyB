import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { API_TIMEOUTS } from "./timeouts";

export interface ApiClientOptions {
  /** Path appended to VITE_API_BASE_URL, e.g. "/v1/files". */
  basePath?: string;
  timeout?: number;
}

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(JSON.stringify(error));

const onRequest = (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
};

const onRequestError = (error: unknown) => Promise.reject(toError(error));

const onResponse = (response: AxiosResponse<unknown>) => response;

const onResponseError = (error: unknown) => {
  const maybeAxios = error as { response?: { status?: number }; config?: { url?: string } };
  if (maybeAxios.response?.status === 401) {
    console.error("Unauthorized, redirecting...");
    const redirectUri = encodeURIComponent(globalThis.location.href);
    globalThis.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/login?redirect_uri=${redirectUri}`;
  }
  if (maybeAxios.response?.status === 403 && maybeAxios.config?.url?.includes("/auth/me")) {
    console.error("403, redirecting...");
    globalThis.location.href = `${import.meta.env.VITE_API_BASE_URL}/v1/auth/logout`;
  } else if (maybeAxios.response?.status === 403) {
    console.error("Forbidden... You don't have permission to access this resource.");
  }
  return Promise.reject(toError(error));
};

/**
 * Creates an axios instance with the shared config and auth/error interceptors.
 * Use for a domain that needs its own base path or timeout; otherwise use the default `axiosClient`.
 */
export const createApiClient = ({
  basePath = "",
  timeout = API_TIMEOUTS.DEFAULT,
}: ApiClientOptions = {}): AxiosInstance => {
  const instance = axios.create({
    baseURL: `${import.meta.env.VITE_API_BASE_URL}${basePath}`,
    timeout,
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
  });
  instance.interceptors.request.use(onRequest, onRequestError);
  instance.interceptors.response.use(onResponse, onResponseError);
  return instance;
};

const axiosClient: AxiosInstance = createApiClient();

export default axiosClient;
