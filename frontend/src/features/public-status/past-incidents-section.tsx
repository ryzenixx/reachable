import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { incidentStatusLabelMap } from "@/lib/status";
import { cn } from "@/lib/utils";
import { formatEventTime, incidentTitleClass, type PastIncidentDay } from "./utils";
import { SectionTitle } from "./section-title";

type PastIncidentsSectionProps = {
  days: PastIncidentDay[];
};

export function PastIncidentsSection({ days }: PastIncidentsSectionProps): React.JSX.Element {
  return (
    <section className="mb-6" id="incident-history">
      <SectionTitle>Past incidents</SectionTitle>

      <Card className="rounded-lg shadow-sm">
        <CardContent className="p-0">
          {days.map((day, index) => (
            <div key={day.key} className={cn("px-4 py-4 sm:px-5", index > 0 ? "border-t" : "")}>
              <h3 className="text-base font-semibold">{day.label}</h3>

              {day.incidents.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No incidents reported.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {day.incidents.map((incident) => (
                    <article key={incident.incidentId} className="rounded-lg bg-muted/20 p-3">
                      <Link className={cn("text-sm font-semibold", incidentTitleClass(incident.impact))} href={incident.href}>
                        {incident.title}
                      </Link>

                      <div className="mt-2 space-y-2">
                        {incident.events.map((event) => (
                          <div key={event.id}>
                            <p className="text-sm leading-5">
                              <span className="font-semibold">{incidentStatusLabelMap[event.status]}</span>
                              {" - "}
                              <span className="text-muted-foreground">{event.message}</span>
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{formatEventTime(event.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
