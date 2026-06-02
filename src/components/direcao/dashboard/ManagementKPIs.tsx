import { Users, DollarSign, AlertCircle, TrendingUp, Activity } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { useNavigate } from "react-router-dom";

interface ManagementKPIsProps {
  totalAlunosAtivos: number;
  totalCadastrados: number;
  loadingTodosAlunos: boolean;
  kpis: any;
  loadingKpis: boolean;
  ocupacaoPercent: number;
  totalMatriculados: number;
  totalCapacidade: number;
  loadingTurmas: boolean;
  leadsCounts: any;
  loadingLeadsCounts: boolean;
  colors: {
    atividade: string;
    conversa: string;
    escuta: string;
    conhecimento: string;
    quietude: string;
  };
}

export const ManagementKPIs = ({
  totalAlunosAtivos,
  totalCadastrados,
  loadingTodosAlunos,
  kpis,
  loadingKpis,
  ocupacaoPercent,
  totalMatriculados,
  totalCapacidade,
  loadingTurmas,
  leadsCounts,
  loadingLeadsCounts,
}: ManagementKPIsProps) => {
  const navigate = useNavigate();

  const receitaValue = kpis?.receita?.liquida ?? kpis?.receita?.total ?? 0;
  const repasse = kpis?.receita?.repasse_professores ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <DashboardCard
        title="Total de Alunos"
        value={totalAlunosAtivos}
        icon={Users}
        description={`${totalCadastrados} cadastros no sistema`}
        variant="alunos"
        isLoading={loadingTodosAlunos}
      />
      <DashboardCard
        title="Receita Líquida"
        value={`R$ ${receitaValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={DollarSign}
        description={`Repasse Prof: R$ ${repasse.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
        variant="financeiro"
        isLoading={loadingKpis}
      />
      <DashboardCard
        title="Inadimplência"
        value={kpis?.inadimplencia?.total
          ? `R$ ${kpis.inadimplencia.total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "R$ 0,00"}
        icon={AlertCircle}
        description={`${kpis?.inadimplencia?.vencidos || 0} vencidos`}
        variant="ocupacao"
        isLoading={loadingKpis}
      />
      <DashboardCard
        title="Ocupação Geral"
        value={`${ocupacaoPercent.toFixed(1)}%`}
        icon={TrendingUp}
        description={`${totalMatriculados}/${totalCapacidade} vagas`}
        variant="atividades"
        isLoading={loadingTurmas}
      />
      <div onClick={() => navigate("/direcao/interessados")} className="cursor-pointer">
        <DashboardCard
          title="Novos Interessados"
          value={leadsCounts?.total ?? 0}
          icon={Activity}
          description={`${leadsCounts?.pendente || 0} fichas completas`}
          variant="default"
          isLoading={loadingLeadsCounts}
          className="h-full hover:ring-2 hover:ring-primary/20"
        />
      </div>
    </div>
  );
};
