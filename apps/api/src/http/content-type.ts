export function isJsonContentType(value: string | undefined) {
  return value?.split(";", 1)[0].trim().toLowerCase() === "application/json";
}
