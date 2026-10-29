import { isJsonContentType } from "../http/content-type";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../db";
import { organizationChannel } from "../db/schema/subscription";
import {
  requireOrganization,
  requireOrganizationAdmin,
  type OrganizationContext,
} from "../organizations/access";
import { recordOrganizationActivity } from "../activity/record";
import { describeRoute, resolver } from "hono-openapi";

export const channelRoutes = new Hono<OrganizationContext>();
channelRoutes.use("*", requireOrganization);

const channelState = z.object({ enabled: z.boolean() });
const errorContent = { "application/json": { schema: resolver(z.object({ error: z.string() })) } };
const channelParameters = [
  {
    name: "organizationId",
    in: "path" as const,
    required: true,
    schema: { type: "string" as const },
  },
];
const channelErrors = {
  401: { description: "Authentication required", content: errorContent },
  403: { description: "Insufficient permissions or forbidden origin", content: errorContent },
};

channelRoutes.get(
  "/",
  describeRoute({
    operationId: "listOrganizationNotificationChannels",
    summary: "Get organization notification channels",
    tags: ["Notification channels"],
    description: "Requires a signed-in organization member.",
    parameters: channelParameters,
    responses: {
      200: {
        description: "Channel settings",
        content: {
          "application/json": {
            schema: resolver(z.object({ email: channelState, webhook: channelState })),
          },
        },
      },
      ...channelErrors,
    },
  }),
  async (c) => {
    const channels = await db
      .select()
      .from(organizationChannel)
      .where(eq(organizationChannel.organizationId, c.get("organizationId")));
    return c.json(
      Object.fromEntries(
        ["email", "webhook"].map((channel) => [
          channel,
          { enabled: channels.find((item) => item.channel === channel)?.enabled ?? false },
        ]),
      ),
    );
  },
);

channelRoutes.put(
  "/:channel",
  describeRoute({
    operationId: "updateOrganizationNotificationChannel",
    summary: "Enable or disable a notification channel",
    tags: ["Notification channels"],
    description: "Requires an organization owner or admin.",
    parameters: [
      ...channelParameters,
      {
        name: "channel",
        in: "path",
        required: true,
        schema: { type: "string", enum: ["email", "webhook"] },
      },
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": { schema: resolver(z.strictObject({ enabled: z.boolean() })) },
      },
    },
    responses: {
      200: {
        description: "Channel settings",
        content: {
          "application/json": {
            schema: resolver(
              z.object({ channel: z.enum(["email", "webhook"]), enabled: z.boolean() }),
            ),
          },
        },
      },
      400: { description: "Invalid request", content: errorContent },
      ...channelErrors,
      404: { description: "Channel not found", content: errorContent },
      413: {
        description: "Request body exceeds 256 KiB",
        content: { "text/plain": { schema: { type: "string" } } },
      },
      415: { description: "Expected application/json", content: errorContent },
    },
  }),
  requireOrganizationAdmin,
  async (c) => {
    const channel = z.enum(["email", "webhook"]).safeParse(c.req.param("channel"));
    if (!channel.success) return c.json({ error: "Not found" }, 404);
    if (!isJsonContentType(c.req.header("content-type")))
      return c.json({ error: "Expected application/json" }, 415);
    const input = z
      .strictObject({ enabled: z.boolean() })
      .safeParse(await c.req.json().catch(() => null));
    if (!input.success) return c.json({ error: "Invalid input" }, 400);
    await db.transaction(async (tx) => {
      const [changed] = await tx
        .insert(organizationChannel)
        .values({
          organizationId: c.get("organizationId"),
          channel: channel.data,
          enabled: input.data.enabled,
        })
        .onConflictDoUpdate({
          target: [organizationChannel.organizationId, organizationChannel.channel],
          set: { enabled: input.data.enabled },
          setWhere: sql`${organizationChannel.enabled} is distinct from ${input.data.enabled}`,
        })
        .returning();
      if (changed)
        await recordOrganizationActivity(tx, c.get("organizationId"), {
          actor: { type: "member", id: c.get("userId") },
          action: "notification_channel.updated",
          resourceType: "notification_channel",
          resourceId: channel.data,
          details: { enabled: input.data.enabled },
        });
    });
    return c.json({ channel: channel.data, enabled: input.data.enabled });
  },
);
