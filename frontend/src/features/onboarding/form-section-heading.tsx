export function FormSectionHeading({ children }: { children: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{children}</p>
      <span className="h-px flex-1 bg-border/80" />
    </div>
  );
}
