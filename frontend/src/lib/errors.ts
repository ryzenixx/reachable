import { toast } from "sonner";
import { isApiError } from "@/lib/api";

export function toastApiError(error: unknown, fallbackMessage: string): void {
  if (isApiError(error)) {
    toast.error(error.message || fallbackMessage);
    return;
  }

  toast.error(fallbackMessage);
}

export function fieldError(error: unknown, field: string): string | null {
  if (!isApiError(error)) {
    return null;
  }

  const [first] = error.fields[field] ?? [];
  return first ?? null;
}
