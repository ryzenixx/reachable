type ApiEnvelope<T> = {
  data: T;
};

export function unwrapApiResponse<T>(payload: T | ApiEnvelope<T>): T {
  if (typeof payload === "object" && payload !== null && "data" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}
