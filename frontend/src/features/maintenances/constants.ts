import type { MaintenanceValues } from "@/schemas";

export const MAINTENANCE_DEFAULT_VALUES: MaintenanceValues = {
  title: "",
  description: "",
  scheduled_at: "",
  ended_at: null,
  status: "scheduled",
};
