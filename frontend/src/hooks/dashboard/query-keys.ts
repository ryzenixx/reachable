"use client";

export const dashboardKeys = {
  status: ["dashboard", "status"] as const,
  services: ["dashboard", "services"] as const,
  monitors: ["dashboard", "monitors"] as const,
  incidents: ["dashboard", "incidents"] as const,
  incident: (incidentId: string) => ["dashboard", "incident", incidentId] as const,
  maintenances: ["dashboard", "maintenances"] as const,
  subscribers: ["dashboard", "subscribers"] as const,
  settings: ["dashboard", "settings"] as const,
  apiTokens: ["dashboard", "api-tokens"] as const,
  uptime: (serviceId: string) => ["dashboard", "uptime", serviceId] as const,
} as const;

export const publicStatusKey = ["public-status"] as const;
