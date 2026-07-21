import { Inbox, type LucideIcon } from "lucide-react";
import { ReactNode } from "react";

/**
 * Reusable no-data placeholder for admin tables and lists.
 * Renders a soft icon, title, subtitle and optional action.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-12 rounded-xl border border-dashed border-border/60 bg-muted/20 ${className}`}
    >
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="font-heading font-semibold text-sm">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}