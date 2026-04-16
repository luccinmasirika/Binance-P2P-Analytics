import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, string> = {
  sm: "w-4 h-4 border",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-2",
};

export function Spinner({
  size = "md",
  className,
}: {
  size?: Size;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Chargement"
      className={cn(
        "rounded-full border-primary border-t-transparent animate-spin",
        SIZE_MAP[size],
        className
      )}
    />
  );
}

export function LoaderBlock({
  label = "Chargement",
  height = "h-[240px]",
  className,
}: {
  label?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border/40 rounded bg-muted/5",
        height,
        className
      )}
    >
      <Spinner size="md" className="mb-3" />
      <p className="text-[10px] font-bold uppercase tracking-widest">{label}</p>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function InlineLoader({
  label = "Chargement…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        className
      )}
    >
      <Spinner size="sm" />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-muted/40 h-4 w-full",
        className
      )}
      aria-hidden="true"
    />
  );
}
