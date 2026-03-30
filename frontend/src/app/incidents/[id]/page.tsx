import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicIncidentPageClient } from "@/components/status/public-incident-page-client";
import type { PublicIncidentPayload } from "@/types/api";

function apiBaseUrl(): string {
  return (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8081/api/v1").replace(/\/$/, "");
}

async function fetchPublicIncident(incidentId: string): Promise<PublicIncidentPayload | null> {
  const response = await fetch(`${apiBaseUrl()}/public/incidents/${encodeURIComponent(incidentId)}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to fetch public incident");
  }

  return (await response.json()) as PublicIncidentPayload;
}

export async function generateMetadata(props: PageProps<"/incidents/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const payload = await fetchPublicIncident(id);

  if (!payload) {
    return {
      title: "Incident Not Found | Reachable",
      description: "The requested incident could not be found.",
    };
  }

  return {
    title: `${payload.incident.title} | ${payload.organization.name} Status`,
    description: `Incident timeline and updates for ${payload.organization.name}.`,
  };
}

export default async function PublicIncidentPage(props: PageProps<"/incidents/[id]">): Promise<React.JSX.Element> {
  const { id } = await props.params;
  const payload = await fetchPublicIncident(id);

  if (!payload) {
    notFound();
  }

  return <PublicIncidentPageClient incidentId={id} />;
}
