import { SubscribeDialog } from "@/components/status/subscribe-dialog";
import type { Organization } from "@/types/api";

type PublicStatusHeaderProps = {
  organization: Organization;
};

export function PublicStatusHeader({ organization }: PublicStatusHeaderProps): React.JSX.Element {
  return (
    <header className="flex items-center justify-between py-8">
      <div className="flex items-center gap-3">
        {organization.logo_url ? (
          <img
            alt={`${organization.name} logo`}
            className="h-8 w-8 rounded-lg object-cover"
            src={organization.logo_url}
          />
        ) : null}
        <h1 className="text-base font-semibold leading-none">{organization.name}</h1>
      </div>
      <SubscribeDialog isEnabled={organization.smtp_enabled !== false} hcaptchaSitekey={organization.hcaptcha_sitekey} />
    </header>
  );
}
