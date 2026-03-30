"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { onNetworkError, onNetworkRecovered } from "@/lib/api";

export function NetworkBanner(): React.JSX.Element | null {
  const [isDisconnected, setIsDisconnected] = useState(false);

  useEffect(() => {
    const unsubscribeError = onNetworkError(() => {
      setIsDisconnected(true);
    });

    const unsubscribeRecovered = onNetworkRecovered(() => {
      setIsDisconnected(false);
    });

    return () => {
      unsubscribeError();
      unsubscribeRecovered();
    };
  }, []);

  if (!isDisconnected) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[100] border-b border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-700 dark:text-red-300">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2">
        <AlertTriangle className="size-3.5" />
        <span>Unable to connect to server, retrying...</span>
      </div>
    </div>
  );
}
