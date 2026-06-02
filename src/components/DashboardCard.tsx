import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type CardVariant = "default" | "alunos" | "financeiro" | "atividades" | "ocupacao";

const variantConfig: Record<CardVariant, { iconBg: string; iconColor: string; accentBar: string }> = {
  default:    { iconBg: "bg-primary/10",                              iconColor: "text-primary",                           accentBar: "bg-primary" },
  alunos:     { iconBg: "bg-teal-100 dark:bg-teal-900/40",            iconColor: "text-teal-700 dark:text-teal-400",       accentBar: "bg-teal-400" },
  financeiro: { iconBg: "bg-emerald-100 dark:bg-emerald-900/40",      iconColor: "text-emerald-700 dark:text-emerald-400", accentBar: "bg-success" },
  atividades: { iconBg: "bg-violet-100 dark:bg-violet-900/40",        iconColor: "text-violet-700 dark:text-violet-400",   accentBar: "bg-conhecimento" },
  ocupacao:   { iconBg: "bg-amber-100 dark:bg-amber-900/40",          iconColor: "text-amber-700 dark:text-amber-400",     accentBar: "bg-amber-400" },
};

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  isLoading?: boolean;
  variant?: CardVariant;
}

export const DashboardCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  isLoading,
  variant = "default",
}: DashboardCardProps) => {
  const config = variantConfig[variant];

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
      className
    )}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", config.accentBar)} />
      <CardContent className="p-4 pl-5">
        {isLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", config.iconBg)}>
              <Icon className={cn("h-5 w-5", config.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                {title}
              </p>
              <div className="text-2xl font-bold text-foreground tracking-tight leading-tight mt-0.5">
                {value}
              </div>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
              )}
              {trend && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md",
                    trend.isPositive
                      ? "text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/40"
                      : "text-destructive bg-destructive/10"
                  )}>
                    {trend.isPositive
                      ? <TrendingUp className="h-3 w-3" />
                      : <TrendingDown className="h-3 w-3" />}
                    {trend.isPositive ? "+" : ""}{trend.value}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">vs. mês anterior</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
