import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        operational: "bg-operational/15 text-operational",
        degraded: "bg-degraded/15 text-degraded",
        partialOutage: "bg-partial-outage/15 text-partial-outage",
        majorOutage: "bg-major-outage/15 text-major-outage",
        maintenance: "bg-maintenance/15 text-maintenance",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps): React.JSX.Element {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
