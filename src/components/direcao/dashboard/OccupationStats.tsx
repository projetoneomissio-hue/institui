import { TrendingUp, AlertCircle, Activity } from "lucide-react";
import { PanelCard } from "@/components/ui/panel-card";

interface OccupationStatsProps {
  turmas: any[] | undefined;
  loadingTurmas: boolean;
  colors: {
    atividade: string;
    conversa: string;
    escuta: string;
    conhecimento: string;
    quietude: string;
  };
}

export const OccupationStats = ({ turmas, loadingTurmas, colors }: OccupationStatsProps) => {
  const getActivityColor = (name: string = "") => {
    const n = name.toLowerCase();
    if (n.includes("jiu"))    return colors.atividade;
    if (n.includes("desenho")) return colors.conversa;
    if (n.includes("vôlei") || n.includes("volei")) return colors.escuta;
    if (n.includes("pilates")) return colors.conhecimento;
    if (n.includes("reforço") || n.includes("reforco")) return colors.quietude;
    if (n.includes("ballet") || n.includes("balé")) return "#FFB6C1";
    if (n.includes("inglês") || n.includes("ingles")) return "#00A8FF";
    return colors.escuta;
  };

  return (
    <PanelCard
      title="Ocupação"
      description="Vagas preenchidas por turma"
      icon={<TrendingUp className="h-4 w-4" />}
      accent="teal"
    >
      <div className="space-y-4">
        {loadingTurmas ? (
          <div className="flex flex-col items-center justify-center h-[200px] opacity-30">
            <Activity className="h-6 w-6 mb-2 animate-spin" />
            <span className="text-xs font-medium">Carregando turmas...</span>
          </div>
        ) : turmas && turmas.length > 0 ? (
          turmas.map((turma: any) => {
            const mCount = turma.matriculas?.[0]?.count || 0;
            const pct = turma.capacidade_maxima > 0 ? (mCount / turma.capacidade_maxima) * 100 : 0;
            const barColor = getActivityColor(turma.nome);
            const isFull = pct >= 100;

            return (
              <div key={turma.id} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className={`font-medium truncate max-w-[150px] ${isFull ? "text-destructive font-semibold" : "text-foreground/80"}`}>
                    {turma.nome}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-muted-foreground">{mCount}/{turma.capacidade_maxima}</span>
                    <span className="font-semibold" style={{ color: barColor }}>{pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] opacity-30">
            <TrendingUp className="h-7 w-7 mb-2" />
            <span className="text-xs font-medium">Nenhuma turma registrada</span>
          </div>
        )}

        {turmas && turmas.some((t: any) => {
          const count = t.matriculas?.[0]?.count || 0;
          return t.capacidade_maxima > 0 && count >= t.capacidade_maxima;
        }) && (
          <div className="mt-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 flex gap-2 items-center">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-xs font-medium text-destructive">
              Uma ou mais turmas estão lotadas.
            </p>
          </div>
        )}
      </div>
    </PanelCard>
  );
};
