import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
    title: string;
    subtitle?: string;
    value: number;
    variation: number;
    icon: LucideIcon;
    color: string;
    borderColor: string;
    inverse?: boolean;
}

export const KpiCard = ({ title, subtitle, value, variation, icon: Icon, color, borderColor, inverse = false }: KpiCardProps) => {
    const isPositive = variation >= 0;
    const trendColor = inverse
        ? (isPositive ? "text-red-500" : "text-emerald-500")
        : (isPositive ? "text-emerald-500" : "text-red-500");

    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    return (
        <Card className={`transition-all hover:shadow-lg border-l-4 ${borderColor}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <div className={`flex items-center text-xs mt-1 ${trendColor} font-medium`}>
                    <TrendIcon className="h-3 w-3 mr-1" />
                    {Math.abs(variation).toFixed(1)}%
                    <span className="text-muted-foreground ml-1 text-[10px] font-normal">vs mês anterior</span>
                </div>
                {subtitle && (
                    <p className="text-[10px] text-muted-foreground mt-1 truncate" title={subtitle}>{subtitle}</p>
                )}
            </CardContent>
        </Card>
    );
};
