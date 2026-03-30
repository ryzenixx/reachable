import { formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";

export function formatRelative(dateValue: string | Date): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatRelativePrecise(dateValue: string | Date): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return formatDistanceToNowStrict(date, { addSuffix: true, roundingMethod: "floor" });
}

export function toDateTimeLocalValue(dateValue: string | Date): string {
  const date = new Date(dateValue);
  const pad = (value: number) => value.toString().padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
