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

export function createEcho(token?: string): Echo<"reverb"> {
  const apiRoot = env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, "");

  return new Echo({
    broadcaster: "reverb",
    key: env.NEXT_PUBLIC_REVERB_APP_KEY,
    wsHost: env.NEXT_PUBLIC_REVERB_HOST,
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
