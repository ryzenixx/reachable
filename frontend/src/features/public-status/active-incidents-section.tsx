import type { Incident } from "@/types/api";
import { IncidentCard } from "./incident-card";
import { SectionTitle } from "./section-title";

type ActiveIncidentsSectionProps = {
  incidents: Incident[];
};

export function ActiveIncidentsSection({ incidents }: ActiveIncidentsSectionProps): React.JSX.Element | null {
  if (incidents.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <SectionTitle>Active incidents</SectionTitle>
      <div className="space-y-3">
        {incidents.map((incident) => (
          <IncidentCard
            key={incident.id}
            createdAt={incident.created_at}
            href={`/incidents/${incident.id}`}
            impact={incident.impact}
            message={incident.updates[incident.updates.length - 1]?.message ?? null}
            title={incident.title}
          />
        ))}
      </div>
    </section>
  );
}
