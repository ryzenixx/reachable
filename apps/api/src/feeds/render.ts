import type { FeedItem } from "./queries";

type Feed = {
  page: { id: string; name: string; slug: string; createdAt: Date };
  items: FeedItem[];
};
type Format = "rss" | "atom";

function xml(value: string) {
  return value
    .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, "\uFFFD")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function content(item: FeedItem) {
  const window =
    item.starts_at && item.ends_at ? `\n\nScheduled: ${item.starts_at} – ${item.ends_at}` : "";
  const components = item.components ? `\n\nComponents: ${item.components}` : "";
  return item.message + window + components;
}

function title(item: FeedItem) {
  const kind =
    item.kind === "postmortem"
      ? "Postmortem"
      : item.kind === "incident"
        ? "Incident"
        : "Maintenance";
  return `${kind}: ${item.title}${item.status ? ` — ${item.status.replaceAll("_", " ")}` : ""}`;
}

export function renderFeed(feed: Feed, format: Format, origin: URL) {
  const pageUrl = new URL(
    `/api/public/status-pages/${encodeURIComponent(feed.page.slug)}`,
    origin,
  ).toString();
  const selfUrl = `${pageUrl}/feed.${format}`;
  const updated = feed.items.reduce(
    (latest, item) => (item.updated > latest ? item.updated : latest),
    feed.page.createdAt.toISOString().replace("Z", "000Z"),
  );
  if (format === "atom") {
    const entries = feed.items
      .map(
        (item) =>
          `<entry><id>urn:uuid:${item.id}</id><title>${xml(title(item))}</title><link type="application/json" href="${xml(pageUrl)}"/><published>${item.published}</published><updated>${item.updated}</updated><content type="text">${xml(content(item))}</content></entry>`,
      )
      .join("");
    return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>urn:uuid:${feed.page.id}</id><title>${xml(feed.page.name)}</title><link type="application/json" href="${xml(pageUrl)}"/><link rel="self" type="application/atom+xml" href="${xml(selfUrl)}"/><updated>${updated}</updated><author><name>${xml(feed.page.name)}</name></author>${entries}</feed>`;
  }
  const entries = feed.items
    .map(
      (item) =>
        `<item><guid isPermaLink="false">urn:uuid:${item.id}</guid><title>${xml(title(item))}</title><link>${xml(pageUrl)}</link><pubDate>${new Date(item.published).toUTCString()}</pubDate><description>${xml(xml(content(item)))}</description></item>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(feed.page.name)}</title><link>${xml(pageUrl)}</link><description>${xml(`${feed.page.name} status updates`)}</description><atom:link href="${xml(selfUrl)}" rel="self" type="application/rss+xml"/>${entries}</channel></rss>`;
}
