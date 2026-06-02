import { DashboardLayout } from "@/components/DashboardLayout";
import { PanelCard } from "@/components/ui/panel-card";
import { DashboardCard } from "@/components/DashboardCard";
import { useQuery } from "@tanstack/react-query";
import {
    Users,
    TrendingUp,
    Activity,
    ArrowUpRight,
    GraduationCap,
    ClipboardList,
    Filter
} from "lucide-react";
import { matriculasService } from "@/services/matriculas.service";
import { turmasService } from "@/services/turmas.service";
import { alunosService } from "@/services/alunos.service";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUnidade } from "@/contexts/UnidadeContext";

const DashboardCoordenacao = () => {
    const { currentUnidade } = useUnidade();
    const unitName = currentUnidade?.nome || "Zafen";

    // Design system tokens
    const colors = {
        atividade: "#E8004F",
        conversa: "#FFC200",
        escuta: "#4DD9C0",
        conhecimento: "#6B5CE7",
        quietude: "#001F7A",
    };

    // Data Fetching
    const { data: todosAlunos, isLoading: loadingTodosAlunos } = useQuery({
        queryKey: ["coordenacao-todos-alunos"],
        queryFn: () => alunosService.fetchAll(),
    });

    const totalCadastrados = todosAlunos?.length || 0;
    const totalAlunosAtivos = todosAlunos?.filter(a => a.matriculas?.some((m: any) => m.status === 'ativa')).length || 0;
    const alunosOrfaos = todosAlunos?.filter(a => !a.matriculas || a.matriculas.length === 0) || [];

    const { data: turmas, isLoading: loadingTurmas } = useQuery({
        queryKey: ["coordenacao-turmas-ocupacao"],
        queryFn: () => turmasService.fetchAll(),
    });

    const { data: matriculasPendentes, isLoading: loadingPendentes } = useQuery({
        queryKey: ["coordenacao-matriculas-pendentes"],
        queryFn: () => matriculasService.fetchAll({ status: "pendente" }),
    });

    const { data: atividadesAtivas, isLoading: loadingAtividades } = useQuery({
        queryKey: ["coordenacao-atividades-ativas"],
        queryFn: async () => {
            const { count, error } = await supabase.from("atividades").select("*", { count: "exact", head: true }).eq("ativa", true);
            if (error) throw error;
            return count || 0;
        },
    });

    // Calculations
    const totalCapacidade = turmas?.reduce((acc, t) => acc + (t.capacidade_maxima || 0), 0) || 0;
    const totalMatriculados = turmas?.reduce((acc, t) => acc + (t.matriculas?.[0]?.count || 0), 0) || 0;
    const ocupacaoPercent = totalCapacidade > 0 ? (totalMatriculados / totalCapacidade) * 100 : 0;

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-background p-6 lg:p-8 text-foreground space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Dashboard <span className="text-primary">Coordenação</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Gestão Operacional · {unitName}
                    </p>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <DashboardCard
                        title="Total de Alunos"
                        value={totalAlunosAtivos}
                        icon={Users}
                        description={`${totalCadastrados} cadastros totais`}
                        variant="alunos"
                        isLoading={loadingTodosAlunos}
                    />
                    <DashboardCard
                        title="Turmas Ativas"
                        value={turmas?.length ?? 0}
                        icon={GraduationCap}
                        description="em andamento este mês"
                        variant="atividades"
                        isLoading={loadingTurmas}
                    />
                    <DashboardCard
                        title="Matrículas Pendentes"
                        value={matriculasPendentes?.length ?? 0}
                        icon={ClipboardList}
                        description="aguardando aprovação"
                        variant="ocupacao"
                        isLoading={loadingPendentes}
                    />
                    <DashboardCard
                        title="Ocupação Geral"
                        value={`${ocupacaoPercent.toFixed(1)}%`}
                        icon={TrendingUp}
                        description={`${totalMatriculados}/${totalCapacidade} vagas preenchidas`}
                        variant="default"
                        isLoading={loadingTurmas}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Funil Visual */}
                    <PanelCard
                        title="Funil de Alunos"
                        description="Conversão da Base"
                        icon={<Filter className="h-4 w-4" />}
                        accent="violet"
                    >
                        <div className="flex flex-col gap-5">
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                                    <span>Cadastrados</span>
                                    <span className="text-foreground font-bold">{totalCadastrados}</span>
                                </div>
                                <div className="h-3 w-full bg-border rounded-full overflow-hidden">
                                    <div className="h-full bg-foreground/25 rounded-full" style={{ width: "100%" }} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                                    <span>Matrícula Solicitada</span>
                                    <span className="text-foreground font-bold">{totalCadastrados - alunosOrfaos.length}</span>
                                </div>
                                <div className="h-3 w-full bg-border rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${totalCadastrados ? ((totalCadastrados - alunosOrfaos.length) / totalCadastrados) * 100 : 0}%`, backgroundColor: colors.conversa }} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                                    <span>Ativos (Aprovados)</span>
                                    <span className="font-bold" style={{ color: colors.escuta }}>{totalAlunosAtivos}</span>
                                </div>
                                <div className="h-3 w-full bg-border rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${totalCadastrados ? (totalAlunosAtivos / totalCadastrados) * 100 : 0}%`, backgroundColor: colors.escuta }} />
                                </div>
                            </div>
                        </div>
                    </PanelCard>

                    {/* Aprovação de Matrículas */}
                    <PanelCard
                        title="Aprovação de Matrículas"
                        icon={<Activity className="h-4 w-4" />}
                        accent="amber"
                        action={matriculasPendentes && matriculasPendentes.length > 0 ? (
                            <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-semibold px-2">
                                {matriculasPendentes.length} novas
                            </Badge>
                        ) : undefined}
                    >
                        <ScrollArea className="h-[300px] pr-3">
                            {loadingPendentes ? (
                                <div className="flex items-center justify-center h-full opacity-40 text-xs">Carregando...</div>
                            ) : matriculasPendentes && matriculasPendentes.length > 0 ? (
                                <div className="space-y-2">
                                    {matriculasPendentes.map((m: any) => (
                                        <div key={m.id} className="group p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                                                    {m.aluno?.nome_completo?.[0] || "?"}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-semibold">{m.aluno?.nome_completo}</div>
                                                    <div className="text-[10px] text-muted-foreground">{m.turma?.atividade?.nome || "Atividade"}</div>
                                                </div>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowUpRight className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full opacity-30">
                                    <ClipboardList className="h-7 w-7 mb-2" />
                                    <span className="text-xs font-medium">Nenhuma pendência</span>
                                </div>
                            )}
                        </ScrollArea>
                    </PanelCard>

                    {/* Ocupação por Turma */}
                    <PanelCard
                        title="Ocupação por Turma"
                        icon={<TrendingUp className="h-4 w-4" />}
                        accent="teal"
                    >
                        <ScrollArea className="h-[300px] pr-3">
                            <div className="space-y-4">
                                {loadingTurmas ? (
                                    <div className="flex items-center justify-center h-full opacity-30 text-xs">Carregando...</div>
                                ) : turmas && turmas.length > 0 ? (
                                    turmas.map((turma: any) => {
                                        const mCount = turma.matriculas?.[0]?.count || 0;
                                        const pct = turma.capacidade_maxima > 0 ? (mCount / turma.capacidade_maxima) * 100 : 0;
                                        return (
                                            <div key={turma.id} className="space-y-1.5">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-foreground/80 truncate font-medium">{turma.nome}</span>
                                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                        <span className="text-muted-foreground">{mCount}/{turma.capacidade_maxima}</span>
                                                        <span className="font-semibold text-primary">{pct.toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <span className="text-xs text-muted-foreground">Sem turmas registradas</span>
                                )}
                            </div>
                        </ScrollArea>
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

export default DashboardCoordenacao;
