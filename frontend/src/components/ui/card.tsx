import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  return <div data-slot="card" className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  return <div data-slot="card-header" className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">): React.JSX.Element {
  return <h3 data-slot="card-title" className={cn("text-base font-semibold", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">): React.JSX.Element {
  return <p data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  return <div data-slot="card-content" className={cn("p-6 pt-0", className)} {...props} />;
}
