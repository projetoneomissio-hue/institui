import { Activity } from "lucide-react";
import { PanelCard } from "@/components/ui/panel-card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface FinancialChartsProps {
  fluxocaixa: any[] | undefined;
  receitaPorAtividadeData: any[];
  kpis: any;
  colors: {
    atividade: string;
    conversa: string;
    escuta: string;
    conhecimento: string;
    quietude: string;
  };
}

export const FinancialCharts = ({
  fluxocaixa,
  receitaPorAtividadeData,
  kpis,
  colors,
}: FinancialChartsProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Fluxo de Caixa (2/3) */}
      <PanelCard
        title="Fluxo de Caixa"
        description="Receitas vs. Despesas · 7 meses"
        className="lg:col-span-2"
        accent="default"
      >
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={fluxocaixa || []}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.atividade} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={colors.atividade} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.conhecimento} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={colors.conhecimento} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.06} vertical={false} />
              <XAxis
                dataKey="mes"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", opacity: 0.45, fontSize: 11, fontWeight: 600 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "currentColor", opacity: 0.45, fontSize: 11, fontWeight: 600 }}
                tickFormatter={(v) => `R$ ${v.toLocaleString("pt-BR")}`}
                dx={-10}
              />
              <Tooltip
                cursor={{ stroke: colors.atividade, strokeWidth: 1, strokeDasharray: "4 4" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              />
              <Area type="monotone" dataKey="receita" stroke={colors.atividade} strokeWidth={2.5} fillOpacity={1} fill="url(#colorReceita)" />
              <Area type="monotone" dataKey="despesa" stroke={colors.conhecimento} strokeWidth={2.5} fillOpacity={1} fill="url(#colorDespesa)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </PanelCard>

      {/* Receita por Atividade (1/3) */}
      <PanelCard
        title="Distribuição"
        description="Receita por Atividade"
        icon={<Activity className="h-4 w-4" />}
        accent="amber"
      >
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative h-[160px] w-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={receitaPorAtividadeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                >
                  {receitaPorAtividadeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card border border-border p-2 rounded-lg shadow-md text-xs">
                          <p className="font-semibold text-muted-foreground mb-1">{payload[0].name}</p>
                          <p className="font-bold text-foreground">
                            R$ {Number(payload[0].value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <p className="font-semibold" style={{ color: payload[0].payload.color }}>
                            {payload[0].payload.percentage}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Total</span>
              <span className="text-base font-bold text-foreground">
                R$ {kpis?.receita?.total?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0,00"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto">
          {receitaPorAtividadeData.map((item, index) => (
            <div
              key={`legend-${item.name}-${index}`}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border"
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-medium text-muted-foreground truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-foreground">
                  R$ {item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: item.color }}>
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
};
