"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { env } from "@/env.mjs";

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

if (typeof window !== "undefined") {
  window.Pusher = Pusher;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function resolveRuntimeApiRoot(): string {
  const configuredRoot = env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, "");
  const normalized = configuredRoot.replace(/\/$/, "");

  if (typeof window === "undefined") {
    return normalized;
  }

  try {
    const url = new URL(normalized);
    const browserHostname = window.location.hostname;

    if (isLoopbackHost(url.hostname) && !isLoopbackHost(browserHostname)) {
      return window.location.origin.replace(/\/$/, "");
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return normalized;
  }
}

export function createEcho(token?: string): Echo<"reverb"> {
  const apiRoot = resolveRuntimeApiRoot();
  const runtimeTls = typeof window !== "undefined" ? window.location.protocol === "https:" : false;
  const runtimeHost = typeof window !== "undefined" ? window.location.hostname : env.NEXT_PUBLIC_REVERB_HOST;
  const runtimePort =
    typeof window !== "undefined" && window.location.port.length > 0
      ? Number(window.location.port)
      : runtimeTls
        ? 443
        : 80;

  const useRuntimeSocket =
    typeof window !== "undefined"
    && isLoopbackHost(env.NEXT_PUBLIC_REVERB_HOST)
    && !isLoopbackHost(runtimeHost);

  const wsHost = useRuntimeSocket ? runtimeHost : env.NEXT_PUBLIC_REVERB_HOST;
  const wsPort = useRuntimeSocket ? runtimePort : env.NEXT_PUBLIC_REVERB_PORT;
  const forceTls = useRuntimeSocket ? runtimeTls : env.NEXT_PUBLIC_REVERB_SCHEME === "https";

  return new Echo({
    broadcaster: "reverb",
    key: env.NEXT_PUBLIC_REVERB_APP_KEY,
    wsHost,
    wsPort,
    wssPort: wsPort,
    forceTLS: forceTls,
    enabledTransports: ["ws", "wss"],
    authEndpoint: `${apiRoot}/broadcasting/auth`,
    auth: {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    },
  });
}
