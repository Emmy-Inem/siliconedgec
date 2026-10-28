import { cn } from "@/lib/utils";

/** Reuse the real favicon silhouette; keep its transparent edges and small-size proportions. */
export function CoachBrandIcon({ className }: { className?: string }) {
  return <img src="/favicon.png" alt="" aria-hidden="true" width={16} height={16}
    className={cn("shrink-0 object-contain", className)} style={{ filter: "brightness(0) invert(1)" }} />;
}
