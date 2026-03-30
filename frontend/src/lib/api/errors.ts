import { AxiosError } from "axios";
import type { ApiErrorPayload } from "@/types/api";

export class ApiError extends Error {
  readonly status: number | null;
  readonly fields: Record<string, string[]>;
  readonly isNetworkError: boolean;

  constructor(message: string, options?: { status?: number | null; fields?: Record<string, string[]>; isNetworkError?: boolean }) {
    super(message);
    this.name = "ApiError";
    this.status = options?.status ?? null;
    this.fields = options?.fields ?? {};
    this.isNetworkError = options?.isNetworkError ?? false;
  }

  firstFieldError(field: string): string | null {
    const [first] = this.fields[field] ?? [];
    return first ?? null;
  }
}

export function mapApiError(error: unknown): ApiError {
  if (!(error instanceof AxiosError)) {
    return new ApiError("Something went wrong.");
  }

  if (!error.response) {
    return new ApiError("Unable to connect to server, retrying...", {
      isNetworkError: true,
    });
  }

  const data = error.response.data as ApiErrorPayload | undefined;

  return new ApiError(data?.message ?? "Request failed.", {
    status: error.response.status,
    fields: data?.errors ?? {},
    isNetworkError: false,
  });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
