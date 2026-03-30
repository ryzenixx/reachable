import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>): React.JSX.Element {
  return <LabelPrimitive.Root data-slot="label" className={cn("text-sm font-medium", className)} {...props} />;
}
