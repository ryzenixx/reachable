import type { IncidentValues } from "@/schemas";

export const INCIDENT_DEFAULT_VALUES: IncidentValues = {
  title: "",
  status: "investigating",
  impact: "major",
  message: "",
  service_ids: [],
};
