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

function resolveRuntimeHost(configuredHost: string): string {
  if (typeof window === "undefined") {
    return configuredHost;
  }

  const browserHostname = window.location.hostname;

  if (isLoopbackHost(configuredHost) && !isLoopbackHost(browserHostname)) {
    return browserHostname;
  }

  return configuredHost;
}

function resolveRuntimeApiRoot(): string {
  const configuredRoot = env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, "");

  if (typeof window === "undefined") {
    return configuredRoot.replace(/\/$/, "");
  }

  try {
    const url = new URL(configuredRoot);
    const browserHostname = window.location.hostname;

    if (isLoopbackHost(url.hostname) && !isLoopbackHost(browserHostname)) {
      url.hostname = browserHostname;
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    return configuredRoot.replace(/\/$/, "");
  }

  return configuredRoot.replace(/\/$/, "");
}

export function createEcho(token?: string): Echo<"reverb"> {
  const apiRoot = resolveRuntimeApiRoot();

  return new Echo({
    broadcaster: "reverb",
    key: env.NEXT_PUBLIC_REVERB_APP_KEY,
    wsHost: resolveRuntimeHost(env.NEXT_PUBLIC_REVERB_HOST),
    wsPort: env.NEXT_PUBLIC_REVERB_PORT,
    wssPort: env.NEXT_PUBLIC_REVERB_PORT,
    forceTLS: env.NEXT_PUBLIC_REVERB_SCHEME === "https",
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
