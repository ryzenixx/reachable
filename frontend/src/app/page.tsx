import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StatusPageClient } from "@/components/status/status-page-client";
import type { OnboardingState, PublicStatusPayload } from "@/types/api";

function apiBaseUrl(): string {
  return (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8009/api/v1").replace(/\/$/, "");
}

async function fetchOnboardingState(): Promise<OnboardingState> {
  const response = await fetch(`${apiBaseUrl()}/onboarding/state`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch onboarding state");
  }

  return (await response.json()) as OnboardingState;
}

async function fetchPublicStatus(): Promise<PublicStatusPayload | null> {
  const response = await fetch(`${apiBaseUrl()}/public?page=1`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to fetch public status");
  }

  return (await response.json()) as PublicStatusPayload;
}

export async function generateMetadata(): Promise<Metadata> {
  const onboardingState = await fetchOnboardingState();

  if (!onboardingState.initialized) {
    return {
      title: "Reachable Setup",
      description: "Initialize your Reachable workspace before publishing your status page.",
    };
  }

  const payload = await fetchPublicStatus();

  if (!payload) {
    return {
      title: "Status Not Found | Reachable",
      description: "The requested status page does not exist.",
    };
  }

  return {
    title: `${payload.organization.name} Status | Reachable`,
    description: `Live service health, incidents, and maintenance updates for ${payload.organization.name}.`,
  };
}

export default async function HomePage(): Promise<React.JSX.Element> {
  const onboardingState = await fetchOnboardingState();

  if (!onboardingState.initialized) {
    redirect("/setup");
  }

  const payload = await fetchPublicStatus();

  if (!payload) {
    notFound();
  }

  return <StatusPageClient />;
}
