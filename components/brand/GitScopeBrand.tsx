import GitScopeLogo from "./GitScopeLogo";

type GitScopeBrandProps = { className?: string; compact?: boolean };

export default function GitScopeBrand({ className = "", compact = false }: GitScopeBrandProps) {
  return (
    <span className={`flex shrink-0 items-center gap-3 ${className}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-foreground"><GitScopeLogo className="h-7 w-7" /></span>
      <span className="min-w-max">
        <span className="block whitespace-nowrap text-sm font-semibold tracking-tight"><span>Git</span><span className="text-primary">Scope</span></span>
        {!compact && <span className="block whitespace-nowrap text-[10px] uppercase tracking-[.16em] text-muted">Developer insights</span>}
      </span>
    </span>
  );
}
