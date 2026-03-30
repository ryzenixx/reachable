import axios, { type AxiosRequestConfig } from "axios";
import { env } from "@/env.mjs";
import type { ApiEnvelope } from "@/types/api";
import { mapApiError } from "./errors";

const NETWORK_ERROR_EVENT = "reachable:network-error";
const NETWORK_OK_EVENT = "reachable:network-ok";

function emitNetwork(eventName: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(eventName));
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function resolveBrowserAwareApiBaseUrl(configuredUrl: string): string {
  const normalized = configuredUrl.replace(/\/$/, "");

  if (typeof window === "undefined") {
    return normalized;
  }

  try {
    const url = new URL(normalized);
    const browserHostname = window.location.hostname;

    if (isLoopbackHost(url.hostname) && !isLoopbackHost(browserHostname)) {
      const runtimeUrl = new URL(window.location.origin);
      runtimeUrl.pathname = url.pathname;
      runtimeUrl.search = url.search;
      return runtimeUrl.toString().replace(/\/$/, "");
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return normalized;
  }
}

export const apiClient = axios.create({
  baseURL: resolveBrowserAwareApiBaseUrl(env.NEXT_PUBLIC_API_URL),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => {
    emitNetwork(NETWORK_OK_EVENT);
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error) && !error.response) {
      emitNetwork(NETWORK_ERROR_EVENT);
    }
    return Promise.reject(error);
  },
);

export function setApiToken(token: string | null): void {
  if (!token) {
    delete apiClient.defaults.headers.common.Authorization;
    return;
  }

  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
}

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (typeof payload === "object" && payload !== null && "data" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload;
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.request<T | ApiEnvelope<T>>(config);
    return unwrap(response.data);
  } catch (error) {
    throw mapApiError(error);
  }
}

export function onNetworkError(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(NETWORK_ERROR_EVENT, listener);

  return () => {
    window.removeEventListener(NETWORK_ERROR_EVENT, listener);
  };
}

export function onNetworkRecovered(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(NETWORK_OK_EVENT, listener);

  return () => {
    window.removeEventListener(NETWORK_OK_EVENT, listener);
  };
}
