import { isJsonContentType } from "../http/content-type";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "../auth";
import { db } from "../db";
import { apikey } from "../db/schema/auth";
import { recordOrganizationActivity } from "../activity/record";
import {
  requireOrganization,
  requireOrganizationAdmin,
  type OrganizationContext,
} from "../organizations/access";
import { pageBelongsToOrganization } from "../status-pages/queries";
import { createApiKeySchema } from "./validation";
import { createApiKeyDoc, deleteApiKeyDoc, listApiKeysDoc } from "./openapi";

export const apiKeyRoutes = new Hono<OrganizationContext>();
apiKeyRoutes.use("*", requireOrganization);
apiKeyRoutes.use("*", requireOrganizationAdmin);
apiKeyRoutes.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});

apiKeyRoutes.get("/", listApiKeysDoc, async (c) => {
  const query = new URL(c.req.url).searchParams;
  if (
    [...query.keys()].some((key) => !["limit", "offset"].includes(key)) ||
    ["limit", "offset"].some((key) => query.getAll(key).length > 1)
  )
    return c.json({ error: "Invalid query parameters" }, 400);
  const pagination = z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).max(100000).default(0),
    })
    .safeParse(Object.fromEntries(query));
  if (!pagination.success) return c.json({ error: "Invalid query parameters" }, 400);
  const keys = await db
    .select({
      id: apikey.id,
      name: apikey.name,
      start: apikey.start,
      enabled: apikey.enabled,
      expiresAt: apikey.expiresAt,
      createdAt: apikey.createdAt,
      lastUsedAt: apikey.lastRequest,
      permissions: apikey.permissions,
      metadata: apikey.metadata,
    })
    .from(apikey)
    .where(and(eq(apikey.referenceId, c.get("organizationId")), eq(apikey.configId, "default")))
    .orderBy(desc(apikey.createdAt), desc(apikey.id))
    .limit(pagination.data.limit + 1)
    .offset(pagination.data.offset);
  return c.json({
    data: keys.slice(0, pagination.data.limit).map((key) => ({
      ...key,
      permissions: parseJson(key.permissions),
      metadata: parseJson(key.metadata),
    })),
    nextOffset:
      keys.length > pagination.data.limit ? pagination.data.offset + pagination.data.limit : null,
  });
});

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

apiKeyRoutes.post("/", createApiKeyDoc, bodyLimit({ maxSize: 16384 }), async (c) => {
  if (!isJsonContentType(c.req.header("content-type")))
    return c.json({ error: "Expected application/json" }, 415);
  const input = createApiKeySchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  const organizationId = c.get("organizationId");
  if (!(await pageBelongsToOrganization(input.data.pageId, organizationId)))
    return c.json({ error: "Not found" }, 404);
  const key = await auth.api.createApiKey({
    body: {
      userId: c.get("userId"),
      organizationId,
      name: input.data.name,
      expiresIn: input.data.expiresInDays * 86400,
      permissions: input.data.permissions,
      metadata: { pageId: input.data.pageId },
    },
  });
  try {
    await db.transaction((tx) =>
      recordOrganizationActivity(tx, organizationId, {
        actor: { type: "member", id: c.get("userId") },
        action: "api_key.created",
        resourceType: "api_key",
        resourceId: key.id,
        details: {
          name: input.data.name,
          pageId: input.data.pageId,
          permissions: input.data.permissions,
        },
      }),
    );
  } catch (error) {
    await db
      .delete(apikey)
      .where(and(eq(apikey.id, key.id), eq(apikey.referenceId, organizationId)));
    throw error;
  }
  return c.json(
    {
      id: key.id,
      name: key.name,
      key: key.key,
      start: key.start,
      expiresAt: key.expiresAt,
      pageId: input.data.pageId,
      permissions: input.data.permissions,
    },
    201,
  );
});

apiKeyRoutes.delete("/:keyId", deleteApiKeyDoc, async (c) => {
  const id = z.string().min(1).max(128).safeParse(c.req.param("keyId"));
  if (!id.success) return c.json({ error: "Invalid key ID" }, 400);
  const removed = await db.transaction(async (tx) => {
    const [key] = await tx
      .delete(apikey)
      .where(
        and(
          eq(apikey.id, id.data),
          eq(apikey.referenceId, c.get("organizationId")),
          eq(apikey.configId, "default"),
        ),
      )
      .returning({ id: apikey.id, name: apikey.name });
    if (!key) return false;
    await recordOrganizationActivity(tx, c.get("organizationId"), {
      actor: { type: "member", id: c.get("userId") },
      action: "api_key.revoked",
      resourceType: "api_key",
      resourceId: key.id,
      details: { name: key.name },
    });
    return true;
  });
  if (!removed) return c.json({ error: "Not found" }, 404);
  return c.body(null, 204);
});
