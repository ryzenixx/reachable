import type { Organization } from "@/types/api";

type OrganizationAvatarProps = {
  organization: Pick<Organization, "name" | "logo_url">;
  className?: string;
};

export function OrganizationAvatar({ organization, className = "h-8 w-8" }: OrganizationAvatarProps): React.JSX.Element {
  if (organization.logo_url) {
    return (
      <img
        alt={organization.name}
        className={`${className} rounded-lg border object-cover`}
        src={organization.logo_url}
      />
    );
  }

  return (
    <div className={`${className} flex items-center justify-center rounded-lg border bg-muted text-xs font-semibold text-muted-foreground`}>
      {organization.name.slice(0, 1).toUpperCase()}
    </div>
  );
}
