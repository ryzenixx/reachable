import { sql } from "drizzle-orm";
import { component } from "../db/schema/component";
import { incident, incidentComponent } from "../db/schema/incident";
import { maintenance, maintenanceComponent } from "../db/schema/maintenance";

const manualSeverity = sql`case ${component.status}
  when 'under_maintenance' then 1
  when 'degraded_performance' then 2
  when 'partial_outage' then 3
  when 'major_outage' then 4
  else 0 end`;

const incidentSeverity = sql`coalesce((
  select max(case ${incidentComponent.impact}
    when 'under_maintenance' then 1
    when 'degraded_performance' then 2
    when 'partial_outage' then 3
    when 'major_outage' then 4
    else 0 end)
  from ${incidentComponent}
  inner join ${incident} on ${incident.id} = ${incidentComponent.incidentId}
  where ${incidentComponent.componentId} = ${component.id} and ${incident.status} <> 'resolved'
), 0)`;

const hasUnknownImpact = sql`exists (
    select 1 from ${incidentComponent}
    inner join ${incident} on ${incident.id} = ${incidentComponent.incidentId}
    where ${incidentComponent.componentId} = ${component.id}
      and ${incident.status} <> 'resolved' and ${incidentComponent.impact} is null
  )`;

const maintenanceSeverity = sql`case when exists (
  select 1 from ${maintenanceComponent}
  inner join ${maintenance} on ${maintenance.id} = ${maintenanceComponent.maintenanceId}
  where ${maintenanceComponent.componentId} = ${component.id}
    and ${maintenance.status} in ('in_progress', 'verifying')
) then 1 else 0 end`;

export const effectiveComponentStatus = sql<typeof component.$inferSelect.status | "unknown">`case
  when ${hasUnknownImpact} then 'unknown'
  else case greatest(${manualSeverity}, ${incidentSeverity}, ${maintenanceSeverity})
  when 4 then 'major_outage'
  when 3 then 'partial_outage'
  when 2 then 'degraded_performance'
  when 1 then 'under_maintenance'
  else 'operational' end end`.as("effective_status");
