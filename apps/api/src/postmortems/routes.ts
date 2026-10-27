import { Hono } from "hono";
import { z } from "zod";
import { requireOrganizationAdmin, type OrganizationContext } from "../organizations/access";
import { getPostmortem, listPublications, publishPostmortem, savePostmortem } from "./queries";
import { publishPostmortemSchema, savePostmortemSchema } from "./validation";

type PostmortemContext = OrganizationContext & { Variables: OrganizationContext["Variables"] & { statusPageId: string } };
export const postmortemRoutes = new Hono<PostmortemContext>();
postmortemRoutes.use("*", requireOrganizationAdmin);

postmortemRoutes.get("/", async (c) => {
  const id = z.uuid().safeParse(c.req.param("incidentId"));
  if (!id.success) return c.json({ error: "Invalid incident ID" }, 400);
  const entry = await getPostmortem(c.get("statusPageId"), id.data);
  if (!entry) return c.json({ error: "Not found" }, 404);
  return c.json(entry);
});

postmortemRoutes.get("/publications", async (c) => {
  const id = z.uuid().safeParse(c.req.param("incidentId"));
  if (!id.success) return c.json({ error: "Invalid incident ID" }, 400);
  const entries = await listPublications(c.get("statusPageId"), id.data);
  if (!entries) return c.json({ error: "Not found" }, 404);
  return c.json(entries);
});

postmortemRoutes.put("/", async (c) => {
  const id = z.uuid().safeParse(c.req.param("incidentId"));
  if (!id.success) return c.json({ error: "Invalid incident ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = savePostmortemSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  const entry = await savePostmortem(c.get("statusPageId"), id.data, c.get("userId"), input.data.draft);
  if (!entry) return c.json({ error: "Not found" }, 404);
  if (entry === "not_resolved") return c.json({ error: "Incident must be resolved" }, 409);
  return c.json(entry);
});

postmortemRoutes.post("/publish", async (c) => {
  const id = z.uuid().safeParse(c.req.param("incidentId"));
  if (!id.success) return c.json({ error: "Invalid incident ID" }, 400);
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) return c.json({ error: "Expected application/json" }, 415);
  const input = publishPostmortemSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) return c.json({ error: "Invalid input" }, 400);
  const entry = await publishPostmortem(c.get("statusPageId"), id.data, c.get("userId"), input.data.notifySubscribers ?? false);
  if (!entry) return c.json({ error: "Not found" }, 404);
  if (entry === "not_resolved") return c.json({ error: "Incident must be resolved" }, 409);
  if (entry === "empty_draft") return c.json({ error: "Postmortem draft is empty or missing" }, 409);
  return c.json(entry);
});
