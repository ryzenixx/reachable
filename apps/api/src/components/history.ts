import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { component } from "../db/schema/component";
import { componentStateChange } from "../db/schema/component-history";
import { statusPage } from "../db/schema/status-page";
import { encodeCursor, type Cursor } from "../history/pagination";

const statuses = [
  "operational",
  "degraded_performance",
  "partial_outage",
  "major_outage",
  "under_maintenance",
  "unknown",
  "untracked",
] as const;
type Status = (typeof statuses)[number];
type Durations = Record<Status, number>;
type Range = { from: Date; to: Date };

export function parseHistoryRange(url: URL): Range | undefined {
  if (["from", "to"].some((key) => url.searchParams.getAll(key).length > 1)) return undefined;
  const fromText = url.searchParams.get("from");
  const toText = url.searchParams.get("to");
  url.searchParams.delete("from");
  url.searchParams.delete("to");
  const date = z.iso
    .datetime({ offset: true })
    .refine((value) => Number.isFinite(Date.parse(value)));
  if (
    (fromText !== null && !date.safeParse(fromText).success) ||
    (toText !== null && !date.safeParse(toText).success)
  )
    return undefined;
  const now = Date.now();
  const to = toText ? new Date(toText) : new Date(now);
  const from = fromText ? new Date(fromText) : new Date(to.getTime() - 90 * 86_400_000);
  if (
    from >= to ||
    to.getTime() > now ||
    to.getTime() - from.getTime() > 366 * 86_400_000 ||
    from.getUTCFullYear() < 1
  )
    return undefined;
  return { from, to };
}

function emptyDurations(): Durations {
  return {
    operational: 0,
    degraded_performance: 0,
    partial_outage: 0,
    major_outage: 0,
    under_maintenance: 0,
    unknown: 0,
    untracked: 0,
  };
}

function availability(durations: Durations) {
  const available = durations.operational + durations.degraded_performance;
  const total = available + durations.partial_outage + durations.major_outage;
  return {
    eligibleDurationMs: total,
    lowerBoundPercent: total ? (100 * available) / total : null,
    upperBoundPercent: total ? (100 * (available + durations.partial_outage)) / total : null,
  };
}

async function findComponent(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  pageId: string,
  componentId: string,
  publicOnly: boolean,
) {
  const [item] = await tx
    .select({ id: component.id, name: component.name })
    .from(component)
    .innerJoin(statusPage, eq(statusPage.id, component.statusPageId))
    .where(
      and(
        eq(component.id, componentId),
        eq(component.statusPageId, pageId),
        publicOnly ? eq(statusPage.published, true) : undefined,
      ),
    );
  return item;
}

export async function getComponentHistory(
  pageId: string,
  componentId: string,
  range: Range,
  publicOnly = false,
) {
  return db.transaction(
    async (tx) => {
      const item = await findComponent(tx, pageId, componentId, publicOnly);
      if (!item) return undefined;
      const [first] = await tx
        .select({ occurredAt: componentStateChange.occurredAt })
        .from(componentStateChange)
        .where(eq(componentStateChange.componentId, componentId))
        .orderBy(asc(componentStateChange.occurredAt), asc(componentStateChange.id))
        .limit(1);
      const rows = (await tx.execute(sql`
      with points as (
        select ${range.from.toISOString()}::timestamptz as at,
          coalesce((select status from ${componentStateChange} where ${componentStateChange.componentId} = ${componentId}::uuid
            and ${componentStateChange.occurredAt} <= ${range.from.toISOString()}::timestamptz
            order by ${componentStateChange.occurredAt} desc, ${componentStateChange.id} desc limit 1), 'untracked') as status,
          null::uuid as id
        union all
        select ${componentStateChange.occurredAt}, ${componentStateChange.status}, ${componentStateChange.id}
        from ${componentStateChange} where ${componentStateChange.componentId} = ${componentId}::uuid
          and ${componentStateChange.occurredAt} > ${range.from.toISOString()}::timestamptz
          and ${componentStateChange.occurredAt} < ${range.to.toISOString()}::timestamptz
      ), periods as (
        select at, status, lead(at, 1, ${range.to.toISOString()}::timestamptz) over (order by at, id) as until from points
      ), days as (
        select day as utc_day from generate_series(
          date_trunc('day', ${range.from.toISOString()}::timestamptz at time zone 'UTC'),
          date_trunc('day', (${range.to.toISOString()}::timestamptz - interval '1 microsecond') at time zone 'UTC'),
          interval '1 day') as day
      )
      select to_char(utc_day, 'YYYY-MM-DD') as day, periods.status,
        (sum(extract(epoch from least(periods.until, (utc_day + interval '1 day') at time zone 'UTC')
          - greatest(periods.at, utc_day at time zone 'UTC'))) * 1000)::double precision as duration_ms
      from days join periods on periods.at < (utc_day + interval '1 day') at time zone 'UTC'
        and periods.until > utc_day at time zone 'UTC'
      group by utc_day, periods.status order by utc_day, periods.status
    `)) as unknown as { day: string; status: Status; duration_ms: number }[];
      const daily = new Map<string, Durations>();
      const totals = emptyDurations();
      for (const row of rows) {
        const durations = daily.get(row.day) ?? emptyDurations();
        durations[row.status] += row.duration_ms;
        totals[row.status] += row.duration_ms;
        daily.set(row.day, durations);
      }
      return {
        component: item,
        from: range.from,
        to: range.to,
        trackingStartedAt: first?.occurredAt ?? null,
        timezone: "UTC",
        basis: "declared_status",
        durationsMs: totals,
        availability: availability(totals),
        days: [...daily].map(([date, durationsMs]) => ({
          date,
          durationsMs,
          availability: availability(durationsMs),
        })),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export async function listComponentStateChanges(
  pageId: string,
  componentId: string,
  range: Range,
  limit: number,
  cursor: Cursor | undefined,
  publicOnly = false,
) {
  return db.transaction(
    async (tx) => {
      const item = await findComponent(tx, pageId, componentId, publicOnly);
      if (!item) return undefined;
      const rows = await tx
        .select({
          id: componentStateChange.id,
          status: componentStateChange.status,
          source: componentStateChange.source,
          sourceId: componentStateChange.sourceId,
          occurredAt: componentStateChange.occurredAt,
          cursorTimestamp: sql<string>`to_char(${componentStateChange.occurredAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        })
        .from(componentStateChange)
        .where(
          and(
            eq(componentStateChange.componentId, componentId),
            gte(componentStateChange.occurredAt, range.from),
            lt(componentStateChange.occurredAt, range.to),
            cursor
              ? sql`(${componentStateChange.occurredAt}, ${componentStateChange.id}) < (${cursor.timestamp}::timestamptz, ${cursor.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(desc(componentStateChange.occurredAt), desc(componentStateChange.id))
        .limit(limit + 1);
      const selected = rows.slice(0, limit);
      const last = selected.at(-1);
      return {
        data: selected.map(({ cursorTimestamp: _, ...entry }) => entry),
        nextCursor:
          rows.length > limit && last ? encodeCursor(last.cursorTimestamp, last.id) : null,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}
