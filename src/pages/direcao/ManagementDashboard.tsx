import { DashboardLayout } from "@/components/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { Download, Activity, ClipboardList, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { financeiroService } from "@/services/financeiro.service";
import { matriculasService } from "@/services/matriculas.service";
import { turmasService } from "@/services/turmas.service";
import { alunosService } from "@/services/alunos.service";
import { solicitacoesService } from "@/services/solicitacoes.service";
import { useState } from "react";
import { useUnidade } from "@/contexts/UnidadeContext";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SocialImpactDashboard } from "@/components/direcao/SocialImpactDashboard";

// Sub-components
import { ManagementKPIs } from "@/components/direcao/dashboard/ManagementKPIs";
import { FinancialCharts } from "@/components/direcao/dashboard/FinancialCharts";
import { StudentManagementStats } from "@/components/direcao/dashboard/StudentManagementStats";
import { RecentActivityTabs } from "@/components/direcao/dashboard/RecentActivityTabs";
import { InadimplenciaList } from "@/components/direcao/dashboard/InadimplenciaList";
import { OccupationStats } from "@/components/direcao/dashboard/OccupationStats";

interface FinanceiroKPIs {
    receita?: { total: number; liquida: number; repasse_professores: number };
    inadimplencia?: { total: number; vencidos: number; quantidade: number };
}

interface ReceitaAtividade {
    nome: string;
    valor: number;
}

const ManagementDashboard = () => {
    const navigate = useNavigate();
    const { currentUnidade } = useUnidade();
    const unitName = currentUnidade?.nome || "Zafen";

    // Design System colors
    const colors = {
        atividade: "#E8004F",
        conversa: "#FFC200",
        escuta: "#4DD9C0",
        conhecimento: "#6B5CE7",
        quietude: "#001F7A",
    };

    // Filter State
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [activeTabSub, setActiveTabSub] = useState<string>("leads");

    const months = [
        { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" },
        { value: 3, label: "Março" }, { value: 4, label: "Abril" },
        { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
        { value: 7, label: "Julho" }, { value: 8, label: "Agosto" },
        { value: 9, label: "Setembro" }, { value: 10, label: "Outubro" },
        { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
    ];

    const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);

    // Helpers
    const getActivityColor = (name: string = "") => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes("jiu")) return colors.atividade;
        if (lowerName.includes("desenho")) return colors.conversa;
        if (lowerName.includes("vôlei") || lowerName.includes("volei")) return colors.escuta;
        if (lowerName.includes("pilates")) return colors.conhecimento;
        if (lowerName.includes("reforço") || lowerName.includes("reforco")) return colors.quietude;
        if (lowerName.includes("ballet") || lowerName.includes("balé")) return "#FFB6C1";
        if (lowerName.includes("inglês") || lowerName.includes("ingles")) return "#00A8FF";
        return colors.escuta;
    };

    // Data Fetching
    const { data: todosAlunos, isLoading: loadingTodosAlunos } = useQuery({
        queryKey: ["management-todos-alunos"],
        queryFn: () => alunosService.fetchAll(),
    });

    const totalCadastrados = todosAlunos?.length || 0;
    const totalAlunosAtivos = todosAlunos?.filter(a => a.matriculas?.some((m: any) => m.status === 'ativa')).length || 0;
    const alunosOrfaos = todosAlunos?.filter(a => !a.matriculas || a.matriculas.length === 0) || [];

    const { data: kpis, isLoading: loadingKpis } = useQuery<FinanceiroKPIs>({
        queryKey: ["management-kpis", selectedMonth, selectedYear, currentUnidade?.id],
        queryFn: () => financeiroService.fetchFinanceiroKPIs({ month: selectedMonth, year: selectedYear, unidadeId: currentUnidade?.id }),
    });

    const { data: fluxocaixa, isLoading: loadingFluxo } = useQuery({
        queryKey: ["management-fluxo-caixa", selectedYear, currentUnidade?.id],
        queryFn: async () => {
            const data = await financeiroService.fetchFluxoCaixaMeses(selectedYear, currentUnidade?.id);
            return Object.entries(data).map(([mes, values]) => ({ mes, ...values }));
        }
    });

    const { data: rawReceitaAtividade } = useQuery<ReceitaAtividade[]>({
        queryKey: ["management-receita-atividade", currentUnidade?.id],
        queryFn: () => financeiroService.fetchReceitaPorAtividade(currentUnidade?.id),
    });

    const totalReceitaAtividade = rawReceitaAtividade ? rawReceitaAtividade.reduce((acc, item) => acc + Number(item.valor), 0) : 0;
    const receitaPorAtividadeData = rawReceitaAtividade ? rawReceitaAtividade.map((item) => {
        const val = Number(item.valor);
        const pct = totalReceitaAtividade > 0 ? ((val / totalReceitaAtividade) * 100).toFixed(1) : "0.0";
        return {
            name: item.nome || "Outros",
            value: val,
            percentage: pct,
            color: getActivityColor(item.nome)
        };
    }) : [];

    const { data: inadimplentes } = useQuery({
        queryKey: ["management-inadimplentes"],
        queryFn: () => financeiroService.fetchInadimplentesOtimizado(),
    });

    const { data: matriculasPendentes, isLoading: loadingPendentes } = useQuery({
        queryKey: ["management-matriculas-pendentes"],
        queryFn: async () => {
            const all = await matriculasService.fetchAll();
            return (all || []).filter((m: any) => m.status === "pendente");
        },
    });

    const { data: turmas, isLoading: loadingTurmas } = useQuery({
        queryKey: ["management-turmas-ocupacao"],
        queryFn: () => turmasService.fetchAll(),
    });

    const { data: leadsCounts, isLoading: loadingLeadsCounts } = useQuery({
        queryKey: ["management-leads-counts"],
        queryFn: () => solicitacoesService.fetchCounts(),
    });

    const { data: leadsRecentes, isLoading: loadingLeadsRecentes } = useQuery({
        queryKey: ["management-leads-recentes"],
        queryFn: async () => {
            const data = await solicitacoesService.fetchAll();
            return data.slice(0, 5);
        },
    });

    const totalCapacidade = turmas?.reduce((acc, t) => acc + (t.capacidade_maxima || 0), 0) || 0;
    const totalMatriculados = turmas?.reduce((acc, t) => acc + (t.matriculas?.[0]?.count || 0), 0) || 0;
    const ocupacaoPercent = totalCapacidade > 0 ? (totalMatriculados / totalCapacidade) * 100 : 0;

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-background p-6 lg:p-8 text-foreground space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Dashboard <span className="text-primary">Diretoria</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Visão Geral · {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Mês" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((m) => (
                                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue placeholder="Ano" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((y) => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button className="gap-2 ml-2">
                            <Download className="h-4 w-4" /> Exportar
                        </Button>
                    </div>
                </div>

                {/* Banner de Matrículas Pendentes */}
                {matriculasPendentes && matriculasPendentes.length > 0 && (
                    <button
                        onClick={() => navigate("/direcao/matriculas?tab=pendente")}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/15 hover:border-yellow-500/60 transition-all text-left group"
                    >
                        <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
                            <ClipboardList className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-foreground text-sm">
                                {matriculasPendentes.length === 1
                                    ? "1 matrícula aguardando aprovação"
                                    : `${matriculasPendentes.length} matrículas aguardando aprovação`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {matriculasPendentes.map((m: any) => m.aluno?.nome_completo).join(", ")}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-yellow-600 uppercase tracking-wide hidden sm:block">Revisar</span>
                            <ArrowRight className="h-4 w-4 text-yellow-600 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                )}

                <Tabs defaultValue="operacional" className="space-y-8 w-full">
                    <TabsList className="bg-card border shadow-sm p-1 rounded-xl h-auto">
                        <TabsTrigger value="operacional" className="rounded-lg py-2.5 px-6 transition-all font-bold text-sm">
                            Gestão Operacional & Financeira
                        </TabsTrigger>
                        <TabsTrigger value="impacto" className="rounded-lg py-2.5 px-6 transition-all font-bold text-sm">
                            Impacto Social & Alcance
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="operacional" className="space-y-8 mt-6">
                        <ManagementKPIs
                            totalAlunosAtivos={totalAlunosAtivos}
                            totalCadastrados={totalCadastrados}
                            loadingTodosAlunos={loadingTodosAlunos}
                            kpis={kpis}
                            loadingKpis={loadingKpis}
                            ocupacaoPercent={ocupacaoPercent}
                            totalMatriculados={totalMatriculados}
                            totalCapacidade={totalCapacidade}
                            loadingTurmas={loadingTurmas}
                            leadsCounts={leadsCounts}
                            loadingLeadsCounts={loadingLeadsCounts}
                            colors={colors}
                        />

                        <FinancialCharts
                            fluxocaixa={fluxocaixa}
                            receitaPorAtividadeData={receitaPorAtividadeData}
                            kpis={kpis}
                            colors={colors}
                        />

                        <StudentManagementStats
                            totalCadastrados={totalCadastrados}
                            totalAlunosAtivos={totalAlunosAtivos}
                            alunosOrfaos={alunosOrfaos}
                            loadingTodosAlunos={loadingTodosAlunos}
                            colors={colors}
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <RecentActivityTabs
                                leadsRecentes={leadsRecentes}
                                matriculasPendentes={matriculasPendentes}
                                loadingLeadsRecentes={loadingLeadsRecentes}
                                loadingPendentes={loadingPendentes}
                                activeTabSub={activeTabSub}
                                setActiveTabSub={setActiveTabSub}
                                colors={colors}
                            />
                            <InadimplenciaList inadimplentes={inadimplentes} colors={colors} />
                            <OccupationStats turmas={turmas} loadingTurmas={loadingTurmas} colors={colors} />
                        </div>
                    </TabsContent>

                    <TabsContent value="impacto" className="mt-6">
                        <SocialImpactDashboard alunos={todosAlunos || []} />
                    </TabsContent>
                </Tabs>

                <div className="flex items-center justify-between pt-6 border-t border-border text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-emerald-500" />
                        Dados atualizados em tempo real via Supabase
                    </div>
                    <span>{unitName} · Gestão</span>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ManagementDashboard;
