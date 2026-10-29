export class DeliveryFailure extends Error {
  constructor(
    readonly kind: "configuration" | "destination" | "dns" | "timeout" | "http",
    readonly responseCode?: number,
  ) {
    super(kind);
  }
}

export function describeFailure(error: unknown, channel: "email" | "webhook") {
  if (error instanceof DeliveryFailure) {
    const permanent =
      error.kind === "destination" ||
      (error.kind === "http" &&
        error.responseCode !== undefined &&
        error.responseCode >= 400 &&
        error.responseCode < 500 &&
        ![408, 425, 429].includes(error.responseCode));
    return { code: error.kind, responseCode: error.responseCode ?? null, permanent };
  }
  const details =
    typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const responseCode =
    typeof details.responseCode === "number" &&
    Number.isInteger(details.responseCode) &&
    details.responseCode >= 100 &&
    details.responseCode <= 599
      ? details.responseCode
      : null;
  const rawCode = typeof details.code === "string" ? details.code : "";
  const code =
    channel === "email" && rawCode === "EAUTH"
      ? "smtp_auth"
      : channel === "email" && responseCode !== null
        ? "smtp_response"
        : ["ETIMEDOUT", "ESOCKETTIMEDOUT"].includes(rawCode)
          ? "timeout"
          : ["ENOTFOUND", "EAI_AGAIN", "EAI_FAIL"].includes(rawCode)
            ? "dns"
            : [
                  "CERT_HAS_EXPIRED",
                  "DEPTH_ZERO_SELF_SIGNED_CERT",
                  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
                  "ERR_TLS_CERT_ALTNAME_INVALID",
                ].includes(rawCode)
              ? "tls"
              : [
                    "ECONNREFUSED",
                    "ECONNRESET",
                    "EHOSTUNREACH",
                    "ENETUNREACH",
                    "ECONNECTION",
                    "ESOCKET",
                  ].includes(rawCode)
                ? "network"
                : "delivery_failed";
  const permanent =
    channel === "email" && responseCode !== null && responseCode >= 500 && responseCode !== 503;
  return { code, responseCode, permanent };
}
