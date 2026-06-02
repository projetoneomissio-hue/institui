import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

// Accent variants — same semantic tokens as DashboardCard
export type PanelAccent = "default" | "teal" | "emerald" | "violet" | "amber" | "rose" | "blue";

const accentConfig: Record<PanelAccent, { bg: string; text: string }> = {
  default:  { bg: "bg-primary/10",                               text: "text-primary" },
  teal:     { bg: "bg-teal-100 dark:bg-teal-900/40",             text: "text-teal-700 dark:text-teal-400" },
  emerald:  { bg: "bg-emerald-100 dark:bg-emerald-900/40",       text: "text-emerald-700 dark:text-emerald-400" },
  violet:   { bg: "bg-violet-100 dark:bg-violet-900/40",         text: "text-violet-700 dark:text-violet-400" },
  amber:    { bg: "bg-amber-100 dark:bg-amber-900/40",           text: "text-amber-700 dark:text-amber-400" },
  rose:     { bg: "bg-rose-100 dark:bg-rose-900/40",             text: "text-rose-700 dark:text-rose-400" },
  blue:     { bg: "bg-blue-100 dark:bg-blue-900/40",             text: "text-blue-700 dark:text-blue-400" },
};

interface PanelCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  accent?: PanelAccent;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * PanelCard — section panel with structured header.
 * Replaces GlassCard across all dashboards.
 * Pattern: HubSpot / Linear / Pipedrive section panel.
 *
 * Layout:
 * ┌──────────────────────────────────────┐
 * │ [icon] Title          [action]       │ ← border-b separator
 * ├──────────────────────────────────────┤
 * │  children content                    │
 * └──────────────────────────────────────┘
 */
export const PanelCard = ({
  title,
  description,
  icon,
  accent = "default",
  action,
  children,
  className,
  contentClassName,
}: PanelCardProps) => {
  const config = accentConfig[accent];

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
        {icon && (
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
            config.bg,
            config.text
          )}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[13px] text-foreground leading-tight truncate">
            {title}
          </h3>
          {description && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <CardContent className={cn("p-5", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
};
