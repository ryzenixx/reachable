import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { component, componentStatus } from "../db/schema/component";
import { communicationTemplate, communicationTemplateComponent } from "../db/schema/template";
import { encodeCursor, type Cursor } from "../history/pagination";
import { recordPageActivity } from "../activity/record";
import type { TemplateInput } from "./validation";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Row = typeof communicationTemplate.$inferSelect;
type LinkedComponent = {
  templateId: string;
  componentId: string;
  impact: (typeof componentStatus.enumValues)[number] | null;
};

function componentEntries(input: TemplateInput) {
  if (input.kind === "incident" || input.kind === "incident_update") {
    return input.components?.map(({ componentId, status }) => ({ componentId, impact: status }));
  }
  return input.componentIds?.map((componentId) => ({ componentId, impact: null }));
}

function templateValues(input: TemplateInput) {
  const maintenance = input.kind === "maintenance" || input.kind === "maintenance_update";
  return {
    kind: input.kind,
    name: input.name,
    message: input.message,
    title: "title" in input ? input.title : null,
    status: input.kind === "maintenance" ? "scheduled" : input.status,
    notifySubscribers: input.notifySubscribers,
    componentsSpecified: componentEntries(input) !== undefined,
    durationMinutes: input.kind === "maintenance" ? (input.durationMinutes ?? null) : null,
    autoStart: maintenance ? (input.autoStart ?? null) : null,
    autoComplete: maintenance ? (input.autoComplete ?? null) : null,
    notifyOnAutoTransition: maintenance ? (input.notifyOnAutoTransition ?? null) : null,
    reminderSpecified: maintenance && input.reminderMinutes !== undefined,
    reminderMinutes: maintenance ? (input.reminderMinutes ?? null) : null,
  };
}

function renderTemplate(row: Row, linked: LinkedComponent[]) {
  const components = linked.filter((entry) => entry.templateId === row.id);
  const incident = row.kind === "incident" || row.kind === "incident_update";
  const maintenance = !incident;
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    defaults: {
      ...(row.title !== null && { title: row.title }),
      ...(row.kind !== "maintenance" && { status: row.status }),
      message: row.message,
      notifySubscribers: row.notifySubscribers,
      ...(row.componentsSpecified &&
        (incident
          ? {
              components: components.map(({ componentId, impact }) => ({
                componentId,
                status: impact,
              })),
            }
          : { componentIds: components.map(({ componentId }) => componentId) })),
      ...(row.kind === "maintenance" &&
        row.durationMinutes !== null && { durationMinutes: row.durationMinutes }),
      ...(maintenance && row.autoStart !== null && { autoStart: row.autoStart }),
      ...(maintenance && row.autoComplete !== null && { autoComplete: row.autoComplete }),
      ...(maintenance &&
        row.notifyOnAutoTransition !== null && {
          notifyOnAutoTransition: row.notifyOnAutoTransition,
        }),
      ...(maintenance && row.reminderSpecified && { reminderMinutes: row.reminderMinutes }),
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function loadComponents(tx: Transaction, rows: Row[]) {
  return rows.length
    ? tx
        .select({
          templateId: communicationTemplateComponent.templateId,
          componentId: communicationTemplateComponent.componentId,
          impact: communicationTemplateComponent.impact,
        })
        .from(communicationTemplateComponent)
        .where(
          inArray(
            communicationTemplateComponent.templateId,
            rows.map(({ id }) => id),
          ),
        )
        .orderBy(communicationTemplateComponent.componentId)
    : [];
}

async function validateComponents(
  tx: Transaction,
  pageId: string,
  entries: ReturnType<typeof componentEntries>,
) {
  if (!entries?.length) return true;
  const components = await tx
    .select({ id: component.id })
    .from(component)
    .where(
      and(
        eq(component.statusPageId, pageId),
        inArray(
          component.id,
          entries.map(({ componentId }) => componentId),
        ),
      ),
    )
    .orderBy(component.id)
    .for("share");
  return components.length === entries.length;
}

export async function createTemplate(pageId: string, input: TemplateInput, actorId: string) {
  return db.transaction(async (tx) => {
    const entries = componentEntries(input);
    if (!(await validateComponents(tx, pageId, entries))) return "invalid_components" as const;
    const [created] = await tx
      .insert(communicationTemplate)
      .values({ statusPageId: pageId, ...templateValues(input) })
      .returning();
    if (entries?.length)
      await tx
        .insert(communicationTemplateComponent)
        .values(
          entries.map((entry) => ({ templateId: created.id, statusPageId: pageId, ...entry })),
        );
    await recordPageActivity(tx, pageId, {
      actor: { type: "member", id: actorId },
      action: "template.created",
      resourceType: "template",
      resourceId: created.id,
      details: { kind: input.kind },
    });
    return renderTemplate(created, await loadComponents(tx, [created]));
  });
}

export async function updateTemplate(
  pageId: string,
  id: string,
  input: TemplateInput,
  actorId: string,
) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(communicationTemplate)
      .where(and(eq(communicationTemplate.id, id), eq(communicationTemplate.statusPageId, pageId)))
      .for("update");
    if (!current) return undefined;
    const entries = componentEntries(input);
    if (!(await validateComponents(tx, pageId, entries))) return "invalid_components" as const;
    const previous = await loadComponents(tx, [current]);
    const values = templateValues(input);
    const fieldsChanged = Object.entries(values).some(
      ([key, value]) => current[key as keyof typeof values] !== value,
    );
    const previousEntries = previous.map(({ componentId, impact }) => ({ componentId, impact }));
    const nextEntries = [...(entries ?? [])].sort((a, b) =>
      a.componentId.localeCompare(b.componentId),
    );
    if (!fieldsChanged && JSON.stringify(previousEntries) === JSON.stringify(nextEntries))
      return renderTemplate(current, previous);
    await tx
      .delete(communicationTemplateComponent)
      .where(eq(communicationTemplateComponent.templateId, id));
    if (entries?.length)
      await tx
        .insert(communicationTemplateComponent)
        .values(entries.map((entry) => ({ templateId: id, statusPageId: pageId, ...entry })));
    const [updated] = await tx
      .update(communicationTemplate)
      .set({ ...values, updatedAt: sql`clock_timestamp()` })
      .where(eq(communicationTemplate.id, id))
      .returning();
    await recordPageActivity(tx, pageId, {
      actor: { type: "member", id: actorId },
      action: "template.updated",
      resourceType: "template",
      resourceId: id,
      details: { kind: input.kind },
    });
    return renderTemplate(updated, await loadComponents(tx, [updated]));
  });
}

export async function deleteTemplate(pageId: string, id: string, actorId: string) {
  return db.transaction(async (tx) => {
    const [removed] = await tx
      .delete(communicationTemplate)
      .where(and(eq(communicationTemplate.id, id), eq(communicationTemplate.statusPageId, pageId)))
      .returning({ kind: communicationTemplate.kind });
    if (!removed) return false;
    await recordPageActivity(tx, pageId, {
      actor: { type: "member", id: actorId },
      action: "template.deleted",
      resourceType: "template",
      resourceId: id,
      details: { kind: removed.kind },
    });
    return true;
  });
}

export async function getTemplate(pageId: string, id: string) {
  return db.transaction(
    async (tx) => {
      const [row] = await tx
        .select()
        .from(communicationTemplate)
        .where(
          and(eq(communicationTemplate.id, id), eq(communicationTemplate.statusPageId, pageId)),
        );
      if (!row) return undefined;
      return renderTemplate(row, await loadComponents(tx, [row]));
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export async function listTemplates(
  pageId: string,
  options: { limit: number; cursor?: Cursor; kind?: string },
) {
  return db.transaction(
    async (tx) => {
      const rows = await tx
        .select({
          template: communicationTemplate,
          cursorTimestamp: sql<string>`to_char(${communicationTemplate.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        })
        .from(communicationTemplate)
        .where(
          and(
            eq(communicationTemplate.statusPageId, pageId),
            options.kind ? eq(communicationTemplate.kind, options.kind) : undefined,
            options.cursor
              ? sql`(${communicationTemplate.createdAt}, ${communicationTemplate.id}) < (${options.cursor.timestamp}::timestamptz, ${options.cursor.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(communicationTemplate.createdAt), desc(communicationTemplate.id))
        .limit(options.limit + 1);
      const selected = rows.slice(0, options.limit);
      const components = await loadComponents(
        tx,
        selected.map(({ template }) => template),
      );
      const last = selected.at(-1);
      return {
        data: selected.map(({ template }) => renderTemplate(template, components)),
        nextCursor:
          rows.length > options.limit && last
            ? encodeCursor(last.cursorTimestamp, last.template.id)
            : null,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
