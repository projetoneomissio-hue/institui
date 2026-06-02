import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, User, Heart, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const Comissoes = () => {
  const { user } = useAuth();

  const { data: comissaoData, isLoading } = useQuery({
    queryKey: ["professor-comissoes", user?.id],
    queryFn: async () => {
      const { data: professor } = await supabase
        .from("professores")
        .select("id, percentual_comissao, tipo_contrato, valor_fixo")
        .eq("user_id", user?.id)
        .single();

      if (!professor) return null;

      // Se não for parceiro, não precisa calcular comissões detalhadas
      if (professor.tipo_contrato !== 'parceiro') {
        return {
          isPartner: false,
          tipoContrato: professor.tipo_contrato,
          valorFixo: professor.valor_fixo || 0,
          current: 0,
          alunos: 0,
          percentual: 0,
          history: []
        };
      }

      // Get turmas do professor
      const { data: turmas } = await supabase
        .from("turmas")
        .select("id")
        .eq("professor_id", professor.id)
        .eq("ativa", true);

      if (!turmas || turmas.length === 0) return {
        isPartner: true,
        tipoContrato: 'parceiro',
        current: 0,
        percentual: professor.percentual_comissao,
        history: []
      };

      const turmaIds = turmas.map((t) => t.id);

      // Get active matriculas for current month
      const now = new Date();
      const { data: matriculas } = await supabase
        .from("matriculas")
        .select(`
          id,
          data_inicio,
          turma_id,
          turmas!inner (
            atividades!inner (
              valor_mensal
            )
          )
        `)
        .in("turma_id", turmaIds)
        .eq("status", "ativa");

      // Calculate current month commission
      let currentTotal = 0;
      let currentAlunos = 0;

      if (matriculas) {
        matriculas.forEach((m: any) => {
          const valorMensal = m.turmas?.atividades?.valor_mensal || 0;
          currentTotal += (valorMensal * professor.percentual_comissao) / 100;
          currentAlunos++;
        });
      }

      // Get last 6 months history
      const history = [];
      for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = format(startOfMonth(date), "yyyy-MM-dd");
        const monthEnd = format(endOfMonth(date), "yyyy-MM-dd");

        const { data: monthMatriculas } = await supabase
          .from("matriculas")
          .select(`
            id,
            turmas!inner (
              atividades!inner (
                valor_mensal
              )
            )
          `)
          .in("turma_id", turmaIds)
          .eq("status", "ativa")
          .lte("data_inicio", monthEnd)
          .or(`data_fim.is.null,data_fim.gte.${monthStart}`);

        let monthTotal = 0;
        let monthAlunos = 0;

        if (monthMatriculas) {
          monthMatriculas.forEach((m: any) => {
            const valorMensal = m.turmas?.atividades?.valor_mensal || 0;
            monthTotal += (valorMensal * professor.percentual_comissao) / 100;
            monthAlunos++;
          });
        }

        history.push({
          mes: format(date, "MMMM yyyy", { locale: ptBR }),
          totalAlunos: monthAlunos,
          total: monthTotal,
          percentual: professor.percentual_comissao,
        });
      }

      return {
        isPartner: true,
        tipoContrato: 'parceiro',
        current: currentTotal,
        alunos: currentAlunos,
        percentual: professor.percentual_comissao,
        history,
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // View Alternativa para Contratos Não-Parceiros
  if (comissaoData && !comissaoData.isPartner) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Meu Contrato</h1>
            <p className="text-muted-foreground mt-1">
              Detalhes da sua remuneração
            </p>
          </div>

          <Card className="border-l-4 border-l-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                {comissaoData.tipoContrato === 'voluntario' ? <Heart className="text-red-500" /> : <User className="text-primary" />}
                Professores {comissaoData.tipoContrato === 'voluntario' ? 'Voluntário' : 'Contratado (Fixo)'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {comissaoData.tipoContrato === 'voluntario'
                  ? "Obrigado por sua dedicação voluntária! Este painel de comissões não se aplica ao seu perfil."
                  : `Seu contrato é de valor fixo mensal. Consulte o RH ou a Direção para detalhes sobre seu holerite.`}
              </p>
              {comissaoData.tipoContrato === 'fixo' && (
                <div className="mt-4 p-4 bg-background rounded border">
                  <span className="text-sm text-muted-foreground">Valor Base Mensal</span>
                  <div className="text-2xl font-bold">
                    R$ {comissaoData.valorFixo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minhas Comissões</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Professor Parceiro · remuneração variável por aluno
          </p>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-800 dark:text-amber-300">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Os valores abaixo são calculados com base nos alunos ativos nas suas turmas.
            O pagamento é processado pela escola após o recebimento das mensalidades dos alunos.
            Consulte a direção para confirmar datas de repasse.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Este Mês</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <>
                <div className="text-2xl font-bold">
                  R$ {comissaoData?.current.toFixed(2).replace(".", ",")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {comissaoData?.alunos} alunos ativos
                </p>
              </>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Percentual</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <>
                <div className="text-2xl font-bold">{comissaoData?.percentual}%</div>
                <p className="text-xs text-muted-foreground">
                  Por aluno matriculado
                </p>
              </>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Comissões</CardTitle>
          </CardHeader>
          <CardContent>
            {!comissaoData?.history || comissaoData.history.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum histórico disponível
              </p>
            ) : (
              <div className="space-y-4">
                {comissaoData.history.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold capitalize">{item.mes}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.totalAlunos} aluno{item.totalAlunos !== 1 ? "s" : ""} × {item.percentual}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        R$ {item.total.toFixed(2).replace(".", ",")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">calculado</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Comissoes;
