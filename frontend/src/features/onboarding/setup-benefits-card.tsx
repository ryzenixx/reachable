import { BellRing, Globe, Siren } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupBenefitsCard(): React.JSX.Element {
  return (
    <Card className="hidden h-full rounded-lg border-border/90 lg:block">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-base">Included from day one</CardTitle>
        <CardDescription>
          Everything required to run a professional status page from your first login.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 p-5 pt-0">
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="mb-1 inline-flex items-center gap-2 text-sm font-semibold">
            <Globe className="size-4 text-muted-foreground" />
            Public status page
          </div>
          <p className="text-xs text-muted-foreground">
            Live service status, uptime bars, incident history, and subscribe flow.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="mb-1 inline-flex items-center gap-2 text-sm font-semibold">
            <Siren className="size-4 text-muted-foreground" />
            Incident workflow
          </div>
          <p className="text-xs text-muted-foreground">
            Create incidents, publish updates, and resolve with clear timeline history.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="mb-1 inline-flex items-center gap-2 text-sm font-semibold">
            <BellRing className="size-4 text-muted-foreground" />
            Email subscriptions
          </div>
          <p className="text-xs text-muted-foreground">
            Confirmation and incident notifications delivered through your SMTP settings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
