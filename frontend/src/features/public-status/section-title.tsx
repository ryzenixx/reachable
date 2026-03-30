export function SectionTitle({ children }: { children: string }): React.JSX.Element {
  return <h2 className="mb-4 border-b pb-2 text-xs uppercase tracking-widest text-muted-foreground">{children}</h2>;
}
