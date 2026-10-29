import { db } from "../db";
import { recordOrganizationActivity, type Actor } from "./record";
import { authActor } from "./auth-context";

type OrganizationEvent = {
  organizationId: string;
  actor: Actor;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
};

async function recordAuthActivity({ organizationId, ...event }: OrganizationEvent) {
  try {
    await db.transaction((tx) => recordOrganizationActivity(tx, organizationId, event));
  } catch (error) {
    console.error("Failed to record organization activity", error);
  }
}

export const organizationActivityHooks = {
  afterCreateOrganization: async ({
    organization,
    user,
  }: {
    organization: { id: string };
    user: { id: string };
  }) => {
    await recordAuthActivity({
      organizationId: organization.id,
      actor: { type: "member", id: user.id },
      action: "organization.created",
      resourceType: "organization",
      resourceId: organization.id,
    });
  },
  afterUpdateOrganization: async ({
    organization,
    user,
  }: {
    organization: { id: string } | null;
    user: { id: string };
  }) => {
    if (organization)
      await recordAuthActivity({
        organizationId: organization.id,
        actor: { type: "member", id: user.id },
        action: "organization.updated",
        resourceType: "organization",
        resourceId: organization.id,
      });
  },
  afterAddMember: async ({
    member,
    organization,
  }: {
    member: { id: string; role: string };
    organization: { id: string };
  }) => {
    await recordAuthActivity({
      organizationId: organization.id,
      actor: authActor(),
      action: "member.added",
      resourceType: "member",
      resourceId: member.id,
      details: { role: member.role },
    });
  },
  afterRemoveMember: async ({
    member,
    organization,
  }: {
    member: { id: string };
    organization: { id: string };
  }) => {
    await recordAuthActivity({
      organizationId: organization.id,
      actor: authActor(),
      action: "member.removed",
      resourceType: "member",
      resourceId: member.id,
    });
  },
  afterUpdateMemberRole: async ({
    member,
    previousRole,
    organization,
  }: {
    member: { id: string; role: string };
    previousRole: string;
    organization: { id: string };
  }) => {
    await recordAuthActivity({
      organizationId: organization.id,
      actor: authActor(),
      action: "member.role_updated",
      resourceType: "member",
      resourceId: member.id,
      details: { previousRole, role: member.role },
    });
  },
  afterCreateInvitation: async ({
    invitation,
    inviter,
    organization,
  }: {
    invitation: { id: string };
    inviter: { id: string };
    organization: { id: string };
  }) => {
    await recordAuthActivity({
      organizationId: organization.id,
      actor: { type: "member", id: inviter.id },
      action: "invitation.created",
      resourceType: "invitation",
      resourceId: invitation.id,
    });
  },
  afterAcceptInvitation: async ({
    invitation,
    user,
    organization,
  }: {
    invitation: { id: string };
    user: { id: string };
    organization: { id: string };
  }) => {
    await recordAuthActivity({
      organizationId: organization.id,
      actor: { type: "member", id: user.id },
      action: "invitation.accepted",
      resourceType: "invitation",
      resourceId: invitation.id,
    });
  },
  afterRejectInvitation: async ({
    invitation,
    user,
    organization,
  }: {
    invitation: { id: string };
    user: { id: string };
    organization: { id: string };
  }) => {
    await recordAuthActivity({
      organizationId: organization.id,
      actor: { type: "member", id: user.id },
      action: "invitation.rejected",
      resourceType: "invitation",
      resourceId: invitation.id,
    });
  },
  afterCancelInvitation: async ({
    invitation,
    cancelledBy,
    organization,
  }: {
    invitation: { id: string };
    cancelledBy: { id: string };
    organization: { id: string };
  }) => {
    await recordAuthActivity({
      organizationId: organization.id,
      actor: { type: "member", id: cancelledBy.id },
      action: "invitation.cancelled",
      resourceType: "invitation",
      resourceId: invitation.id,
    });
  },
};
