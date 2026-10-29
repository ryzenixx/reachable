import { isJsonContentType } from "../http/content-type";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { db } from "../db";
import { recordPageActivity } from "../activity/record";
import { parseHistoryQuery, type Cursor } from "../history/pagination";
import {
  requireOrganization,
  requireOrganizationAdmin,
  requireStatusPage,
  type StatusPageContext,
} from "../organizations/access";
import {
  getSubscription,
  listSubscriptions,
  removeSubscription,
  removeSubscriptions,
  summarizeSubscriptions,
  updateSubscriptionPreferences,
} from "./admin-queries";
import { parseSubscriptionCsv, subscriptionCsv, subscriptionCsvHeader } from "./csv";
import { requestEmailSubscription } from "./queries";
import { emailSchema, preferencesSchema } from "./validation";
import { resendWebhookConfirmation } from "../webhooks/subscriptions";
import {
  bulkDeleteSubscribersDoc,
  createSubscriberDoc,
  deleteSubscriberDoc,
  exportSubscribersDoc,
  getSubscriberDoc,
  importSubscribersDoc,
  listSubscribersDoc,
  resendSubscriberConfirmationDoc,
  setSubscriberPreferencesDoc,
  subscriberSummaryDoc,
} from "./admin-openapi";

export const adminSubscriptionRoutes = new Hono<StatusPageContext>();
adminSubscriptionRoutes.use("*", requireOrganization);
adminSubscriptionRoutes.use("*", requireOrganizationAdmin);
adminSubscriptionRoutes.use("*", requireStatusPage);

adminSubscriptionRoutes.get("/", listSubscribersDoc, async (c) => {
  const url = new URL(c.req.url);
  if (["channel", "search"].some((key) => url.searchParams.getAll(key).length > 1))
    return c.json({ error: "Invalid query parameters" }, 400);
  const channel = url.searchParams.get("channel");
  const search = url.searchParams.get("search");
  url.searchParams.delete("channel");
  url.searchParams.delete("search");
  const options = parseHistoryQuery(url.toString(), ["all", "confirmed", "pending"] as const);
  if (
    !options ||
    (channel !== null && channel !== "email" && channel !== "webhook") ||
    (search !== null && !z.string().trim().min(1).max(254).safeParse(search).success)
  ) {
    return c.json({ error: "Invalid query parameters" }, 400);
  }
  return c.json(
    await listSubscriptions(c.get("statusPageId"), {
      ...options,
      channel: channel ?? undefined,
      search: search?.trim(),
    }),
  );
});

adminSubscriptionRoutes.get("/export", exportSubscribersDoc, async (c) => {
  if ([...new URL(c.req.url).searchParams].length)
    return c.json({ error: "Invalid query parameters" }, 400);
  const pageId = c.get("statusPageId");
  await db.transaction((tx) =>
    recordPageActivity(tx, pageId, {
      actor: { type: "member", id: c.get("userId") },
      action: "subscription.export_started",
      resourceType: "status_page",
      resourceId: pageId,
      details: { format: "csv" },
    }),
  );
  let cursor: Cursor | undefined;
  let first = true;
  let done = false;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (done || c.req.raw.signal.aborted) {
        controller.close();
        return;
      }
      try {
        const result = await listSubscriptions(pageId, {
          state: "all",
          channel: "email",
          limit: 100,
          cursor,
        });
        const rows = result.data.map((item) => [
          item.channel,
          item.destination,
          item.state,
          item.scope,
          item.components.map(({ id }) => id).join(";"),
          item.createdAt.toISOString(),
          item.confirmedAt?.toISOString() ?? "",
        ]);
        const content = subscriptionCsv(first ? [subscriptionCsvHeader, ...rows] : rows);
        first = false;
        if (content) controller.enqueue(new TextEncoder().encode(content));
        if (result.nextCursor)
          cursor = parseHistoryQuery(`http://localhost/?cursor=${result.nextCursor}`, [
            "all",
          ] as const)!.cursor;
        else {
          done = true;
          controller.close();
        }
      } catch (error) {
        controller.error(error);
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="subscribers.csv"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

adminSubscriptionRoutes.get("/summary", subscriberSummaryDoc, async (c) =>
  c.json({ channels: await summarizeSubscriptions(c.get("statusPageId")) }),
);

adminSubscriptionRoutes.post(
  "/import",
  importSubscribersDoc,
  bodyLimit({ maxSize: 65536 }),
  async (c) => {
    if (!c.req.header("content-type")?.toLowerCase().startsWith("text/csv"))
      return c.json({ error: "Expected text/csv" }, 415);
    const rows = parseSubscriptionCsv(await c.req.text());
    if (!rows) return c.json({ error: "Invalid CSV or more than 100 rows" }, 400);
    const results: { row: number; result: string }[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (row.error) {
        results.push({ row: row.row, result: row.error });
        continue;
      }
      if (seen.has(row.email)) {
        results.push({ row: row.row, result: "duplicate" });
        continue;
      }
      seen.add(row.email);
      try {
        const result = await requestEmailSubscription({
          type: "admin",
          pageId: c.get("statusPageId"),
          actorId: c.get("userId"),
          email: row.email,
          preferences: row.preferences,
        });
        results.push({ row: row.row, result });
      } catch {
        results.push({ row: row.row, result: "queue_failed" });
      }
    }
    return c.json({ results });
  },
);

adminSubscriptionRoutes.post(
  "/bulk-delete",
  bulkDeleteSubscribersDoc,
  bodyLimit({ maxSize: 16384 }),
  async (c) => {
    if (!isJsonContentType(c.req.header("content-type")))
      return c.json({ error: "Expected application/json" }, 415);
    const parsed = z
      .strictObject({
        ids: z
          .array(z.uuid())
          .min(1)
          .max(100)
          .refine((ids) => new Set(ids).size === ids.length),
      })
      .safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
    const removed = await removeSubscriptions(
      c.get("statusPageId"),
      parsed.data.ids,
      c.get("userId"),
    );
    const removedIds = new Set(removed);
    return c.json({ removed, notFound: parsed.data.ids.filter((id) => !removedIds.has(id)) });
  },
);

adminSubscriptionRoutes.post("/", createSubscriberDoc, bodyLimit({ maxSize: 16384 }), async (c) => {
  if (!isJsonContentType(c.req.header("content-type")))
    return c.json({ error: "Expected application/json" }, 415);
  const parsed = z
    .strictObject({
      channel: z.literal("email"),
      email: emailSchema,
      preferences: preferencesSchema.optional(),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
  try {
    const result = await requestEmailSubscription({
      type: "admin",
      pageId: c.get("statusPageId"),
      actorId: c.get("userId"),
      email: parsed.data.email,
      preferences: parsed.data.preferences,
    });
    if (result === "invalid_components") return c.json({ error: "Invalid components" }, 400);
    if (result === "already_confirmed")
      return c.json({ error: "Subscription already confirmed" }, 409);
    if (result === "cooldown" || result === "rate_limited") return c.json({ error: result }, 429);
    if (result !== "queued") return c.json({ error: "Page or channel unavailable" }, 409);
    return c.json({ result }, 202);
  } catch {
    return c.json({ error: "Could not queue confirmation" }, 503);
  }
});

adminSubscriptionRoutes.get("/:subscriptionId", getSubscriberDoc, async (c) => {
  const id = z.uuid().safeParse(c.req.param("subscriptionId"));
  if (!id.success) return c.json({ error: "Invalid subscription ID" }, 400);
  const entry = await getSubscription(c.get("statusPageId"), id.data);
  if (!entry) return c.json({ error: "Not found" }, 404);
  return c.json(entry);
});

adminSubscriptionRoutes.put(
  "/:subscriptionId/preferences",
  setSubscriberPreferencesDoc,
  bodyLimit({ maxSize: 16384 }),
  async (c) => {
    const id = z.uuid().safeParse(c.req.param("subscriptionId"));
    if (!id.success) return c.json({ error: "Invalid subscription ID" }, 400);
    if (!isJsonContentType(c.req.header("content-type")))
      return c.json({ error: "Expected application/json" }, 415);
    const parsed = preferencesSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Invalid input" }, 400);
    const result = await updateSubscriptionPreferences(
      c.get("statusPageId"),
      id.data,
      parsed.data,
      c.get("userId"),
    );
    if (result === "not_found") return c.json({ error: "Not found" }, 404);
    if (result === "invalid_components") return c.json({ error: "Invalid components" }, 400);
    return c.json({ success: true });
  },
);

adminSubscriptionRoutes.post(
  "/:subscriptionId/resend-confirmation",
  resendSubscriberConfirmationDoc,
  async (c) => {
    const id = z.uuid().safeParse(c.req.param("subscriptionId"));
    if (!id.success) return c.json({ error: "Invalid subscription ID" }, 400);
    try {
      const entry = await getSubscription(c.get("statusPageId"), id.data);
      if (!entry) return c.json({ error: "Not found" }, 404);
      const result =
        entry.channel === "webhook"
          ? await resendWebhookConfirmation(c.get("statusPageId"), id.data, c.get("userId"))
          : await requestEmailSubscription({
              type: "resend",
              pageId: c.get("statusPageId"),
              subscriptionId: id.data,
              actorId: c.get("userId"),
            });
      if (result === "not_found") return c.json({ error: "Not found" }, 404);
      if (result === "already_confirmed")
        return c.json({ error: "Subscription already confirmed" }, 409);
      if (result === "cooldown" || result === "rate_limited") return c.json({ error: result }, 429);
      if (result !== "queued") return c.json({ error: "Page or channel unavailable" }, 409);
      return c.json({ result }, 202);
    } catch {
      return c.json({ error: "Could not queue confirmation" }, 503);
    }
  },
);

adminSubscriptionRoutes.delete("/:subscriptionId", deleteSubscriberDoc, async (c) => {
  const id = z.uuid().safeParse(c.req.param("subscriptionId"));
  if (!id.success) return c.json({ error: "Invalid subscription ID" }, 400);
  if (!(await removeSubscription(c.get("statusPageId"), id.data, c.get("userId"))))
    return c.json({ error: "Not found" }, 404);
  return c.body(null, 204);
});
