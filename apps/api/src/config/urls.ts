export function getApplicationUrl() {
  const value = process.env.APP_URL;
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || url.search || url.hash || url.pathname !== "/") return undefined;
    return url;
  } catch {
    return undefined;
  }
}
