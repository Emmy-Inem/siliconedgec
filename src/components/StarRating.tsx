import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

/**
 * Renders a 5-star gold rating with partial-fill support.
 * Uses overlay technique: gray base stars + clipped gold stars on top.
 */
export function StarRating({ value, max = 5, size = "md", showValue = false, className = "" }: StarRatingProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const pct = (clamped / max) * 100;
  const cls = sizeClasses[size];

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="relative inline-flex" aria-label={`${clamped} out of ${max} stars`}>
        {/* Empty base */}
        <span className="flex">
          {Array.from({ length: max }).map((_, i) => (
            <Star key={`b${i}`} className={`${cls} text-muted-foreground/30`} />
          ))}
        </span>
        {/* Filled overlay, clipped by width */}
        <span
          className="absolute inset-0 flex overflow-hidden"
          style={{ width: `${pct}%` }}
          aria-hidden
        >
          {Array.from({ length: max }).map((_, i) => (
            <Star key={`f${i}`} className={`${cls} fill-gold text-gold flex-shrink-0`} />
          ))}
        </span>
      </span>
      {showValue && (
        <span className="text-xs text-muted-foreground font-medium">{clamped.toFixed(1)}</span>
      )}
    </span>
  );
}