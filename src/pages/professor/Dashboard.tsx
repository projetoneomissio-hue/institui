import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardCard } from "@/components/DashboardCard";
import { PanelCard } from "@/components/ui/panel-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GraduationCap, Users, ClipboardList, DollarSign,
  NotebookPen, Trophy, ArrowUpRight, Activity, TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useUnidade } from "@/contexts/UnidadeContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DashboardProfessor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentUnidade } = useUnidade();

  const mesAtual = format(new Date(), "MMMM yyyy", { locale: ptBR });

  const { data, isLoading } = useQuery({
    queryKey: ["professor-dashboard", user?.id],
    queryFn: async () => {
      const { data: professor } = await supabase
        .from("professores")
        .select("id, percentual_comissao, tipo_contrato, valor_fixo")
        .eq("user_id", user?.id)
        .single();

      if (!professor) return { professor: null, turmas: [], totalAlunos: 0 };

      const { data: turmas } = await supabase
        .from("turmas")
        .select("id, nome, horario, dias_semana, capacidade_maxima, atividades(nome)")
        .eq("professor_id", professor.id)
        .eq("ativa", true);

      const turmasWithCounts = await Promise.all(
        (turmas || []).map(async (turma) => {
          const { count } = await supabase
            .from("matriculas")
            .select("*", { count: "exact", head: true })
            .eq("turma_id", turma.id)
            .eq("status", "ativa");
          return { ...turma, alunosMatriculados: count || 0 };
        })
      );

      const totalAlunos = turmasWithCounts.reduce((a, t) => a + t.alunosMatriculados, 0);

      return { professor, turmas: turmasWithCounts, totalAlunos };
    },
    enabled: !!user?.id,
  });

  const turmas = data?.turmas || [];
  const professor = data?.professor;
  const totalAlunos = data?.totalAlunos ?? 0;

  const comissaoLabel = professor
    ? professor.tipo_contrato === "parceiro"
      ? `${professor.percentual_comissao}% receita`
      : "Valor fixo"
    : "—";

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6 lg:p-8 text-foreground space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Dashboard <span className="text-primary">Professor</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Portal do Professor · {mesAtual} · {currentUnidade?.nome || "Zafen"}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title="Minhas Turmas"
            value={turmas.length}
            icon={GraduationCap}
            description="turmas ativas"
            variant="alunos"
            isLoading={isLoading}
          />
          <DashboardCard
            title="Total de Alunos"
            value={totalAlunos}
            icon={Users}
            description="alunos matriculados"
            variant="atividades"
            isLoading={isLoading}
          />
          <DashboardCard
            title="Chamadas Pendentes"
            value={turmas.length}
            icon={ClipboardList}
            description="turmas para registrar"
            variant="ocupacao"
            isLoading={isLoading}
          />
          <div className="cursor-pointer" onClick={() => navigate("/professor/comissoes")}>
            <DashboardCard
              title="Minha Comissão"
              value={comissaoLabel}
              icon={DollarSign}
              description="clique para ver detalhes"
              variant="financeiro"
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Minhas Turmas — quick access */}
          <PanelCard
            title="Minhas Turmas"
            description="Acesso rápido às suas turmas ativas"
            icon={<GraduationCap className="h-4 w-4" />}
            accent="default"
            action={
              <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-semibold px-2">
                {turmas.length} ativas
              </Badge>
            }
          >
            <ScrollArea className="h-[300px] pr-3">
              {isLoading ? (
                <div className="flex items-center justify-center h-full opacity-30 text-xs">Carregando...</div>
              ) : turmas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] opacity-30">
                  <GraduationCap className="h-7 w-7 mb-2" />
                  <span className="text-xs font-medium">Nenhuma turma atribuída</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {turmas.map((turma: any) => {
                    const pct = turma.capacidade_maxima > 0
                      ? (turma.alunosMatriculados / turma.capacidade_maxima) * 100 : 0;
                    const diasLabel = (turma.dias_semana || []).slice(0, 2).join(", ")
                      + ((turma.dias_semana || []).length > 2 ? "..." : "");
                    return (
                      <div key={turma.id} className="p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">{turma.nome}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {turma.horario} · {diasLabel}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-muted-foreground shrink-0 ml-2">
                            {turma.alunosMatriculados}/{turma.capacidade_maxima}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-border rounded-full overflow-hidden mb-2.5">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-7 text-[10px] gap-1 px-2 flex-1"
                            onClick={() => navigate(`/professor/chamada?turma=${turma.id}`)}
                          >
                            <NotebookPen className="h-3 w-3" /> Chamada
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] gap-1 px-2 flex-1"
                            onClick={() => navigate(`/professor/avaliacoes?turma=${turma.id}`)}
                          >
                            <Trophy className="h-3 w-3" /> Notas
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </PanelCard>

          {/* Ocupação das Turmas */}
          <PanelCard
            title="Ocupação das Turmas"
            description="Vagas preenchidas por turma"
            icon={<TrendingUp className="h-4 w-4" />}
            accent="teal"
            action={
              <Button
                variant="link"
                className="text-xs font-semibold h-auto p-0 text-primary gap-1"
                onClick={() => navigate("/professor/turmas")}
              >
                Ver turmas <ArrowUpRight className="h-3 w-3" />
              </Button>
            }
          >
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-[200px] opacity-30 text-xs">Carregando...</div>
              ) : turmas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[200px] opacity-30">
                  <TrendingUp className="h-7 w-7 mb-2" />
                  <span className="text-xs font-medium">Sem turmas para exibir</span>
                </div>
              ) : (
                turmas.map((turma: any) => {
                  const pct = turma.capacidade_maxima > 0
                    ? (turma.alunosMatriculados / turma.capacidade_maxima) * 100 : 0;
                  const isFull = pct >= 100;
                  return (
                    <div key={turma.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className={`font-medium truncate max-w-[180px] ${isFull ? "text-destructive font-semibold" : "text-foreground/80"}`}>
                          {turma.nome}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-muted-foreground">
                            {turma.alunosMatriculados}/{turma.capacidade_maxima}
                          </span>
                          <span className={`font-semibold ${isFull ? "text-destructive" : "text-primary"}`}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${isFull ? "bg-destructive" : "bg-primary"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!isLoading && turmas.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {totalAlunos} aluno{totalAlunos !== 1 ? "s" : ""} distribuído{totalAlunos !== 1 ? "s" : ""} em {turmas.length} turma{turmas.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </PanelCard>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 pt-6 border-t border-border text-xs text-muted-foreground">
          <Activity className="h-3 w-3 text-emerald-500" />
          Dados em tempo real via Supabase
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardProfessor;
