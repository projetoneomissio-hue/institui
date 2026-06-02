import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardCard } from "@/components/DashboardCard";
import { Users, GraduationCap, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { handleError } from "@/utils/error-handler";

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Redirecionamento por Papel (Role)
  if (user?.role === "responsavel") {
    return <Navigate to="/responsavel/dashboard" replace />;
  }

  if (user?.role === "direcao") {
    return <Navigate to="/direcao/dashboard" replace />;
  }

  if (user?.role === "coordenacao") {
    return <Navigate to="/coordenacao/dashboard" replace />;
  }

  if (user?.role === "secretaria") {
    return <Navigate to="/secretaria/dashboard" replace />;
  }

  if (user?.role === "professor") {
    return <Navigate to="/professor/turmas" replace />;
  }

  // Fetch total de alunos
  const { data: totalAlunos, isLoading: loadingAlunos } = useQuery({
    queryKey: ["dashboard-total-alunos"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("alunos")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch atividades ativas
  const { data: atividadesAtivas, isLoading: loadingAtividadesAtivas } = useQuery({
    queryKey: ["dashboard-atividades-ativas"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("atividades")
        .select("*", { count: "exact", head: true })
        .eq("ativa", true);
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch receita mensal (pagamentos pagos do mês atual)
  const { data: receitaMensal, isLoading: loadingReceita } = useQuery({
    queryKey: ["dashboard-receita-mensal"],
    queryFn: async () => {
      const hoje = new Date();
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from("pagamentos")
        .select("valor")
        .eq("status", "pago")
        .gte("data_pagamento", primeiroDia.toISOString())
        .lte("data_pagamento", ultimoDia.toISOString());

      if (error) throw error;
      const total = data?.reduce((acc, p) => acc + parseFloat(p.valor.toString()), 0) || 0;
      return total;
    },
  });

  // Fetch taxa de ocupação
  const { data: taxaOcupacao, isLoading: loadingOcupacao } = useQuery({
    queryKey: ["dashboard-taxa-ocupacao"],
    queryFn: async () => {
      const { data: turmas, error } = await supabase
        .from("turmas")
        .select(`
          capacidade_maxima,
          matriculas(count)
        `)
        .eq("ativa", true);

      if (error) throw error;

      const capacidadeTotal = turmas?.reduce((acc, t) => acc + t.capacidade_maxima, 0) || 0;
      const alunosMatriculados = turmas?.reduce((acc, t) => acc + (t.matriculas?.[0]?.count || 0), 0) || 0;

      return capacidadeTotal > 0 ? Math.round((alunosMatriculados / capacidadeTotal) * 100) : 0;
    },
  });

  // Fetch atividades populares
  const { data: atividadesPopulares, isLoading: loadingAtividades } = useQuery({
    queryKey: ["dashboard-atividades-populares"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atividades")
        .select(`
          nome,
          turmas(
            matriculas(count)
          )
        `)
        .eq("ativa", true)
        .limit(4);

      if (error) throw error;

      const result = data?.map((ativ) => ({
        nome: ativ.nome,
        alunos: ativ.turmas?.reduce((acc, t) => acc + (t.matriculas?.[0]?.count || 0), 0) || 0,
      }))
        .sort((a, b) => b.alunos - a.alunos)
        .slice(0, 4);

      return result || [];
    },
  });

  // Fetch status de pagamentos
  const { data: statusPagamentos, isLoading: loadingPagamentosStatus } = useQuery({
    queryKey: ["dashboard-pagamentos-status"],
    queryFn: async () => {
      const hoje = new Date().toISOString().split("T")[0];
      const seteDiasDepois = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const { count: vencidos, error: e1 } = await supabase
        .from("pagamentos")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente")
        .lt("data_vencimento", hoje);

      const { count: vencemEmBreve, error: e2 } = await supabase
        .from("pagamentos")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente")
        .gte("data_vencimento", hoje)
        .lte("data_vencimento", seteDiasDepois);

      const { count: emDia, error: e3 } = await supabase
        .from("pagamentos")
        .select("*", { count: "exact", head: true })
        .eq("status", "pago");

      if (e1 || e2 || e3) throw e1 || e2 || e3;

      return {
        vencidos: vencidos || 0,
        vencemEmBreve: vencemEmBreve || 0,
        emDia: emDia || 0,
      } as { vencidos: number; vencemEmBreve: number; emDia: number };
    },
  });

  // Fetch solicitações de matrícula (pendentes e sem pagamento)
  const { data: solicitacoesPendentes, isLoading: loadingSolicitacoes, refetch: refetchSolicitacoes } = useQuery({
    queryKey: ["dashboard-solicitacoes-pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matriculas")
        .select(`
          id,
          data_inicio,
          alunos!inner(nome_completo),
          turmas!inner(
            nome,
            atividades!inner(nome, valor_mensal)
          ),
          pagamentos(count)
        `)
        .eq("status", "pendente")
        .order("data_inicio", { ascending: false });

      if (error) throw error;

      // Filter localmente para garantir que nao tem pagamento (embora pudesse ser via query complexa)
      // Mantemos apenas matriculas que NAO tem pagamentos registrados
      return (data || []).filter((m: any) => m.pagamentos?.[0]?.count === 0);
    },
  });

  const aprovarMatriculaMutation = useMutation({
    mutationFn: async (matricula: any) => {
      const valor = matricula.turmas?.atividades?.valor_mensal || 0;

      // Buscar dia de vencimento configurado
      const { data: configData } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "dia_vencimento")
        .single();

      const diaVencimento = configData?.valor ? parseInt(configData.valor) : 5;

      // Calcular próximo vencimento (próximo mês, dia configurado)
      const hoje = new Date();
      let mesVencimento = hoje.getMonth() + 1; // próximo mês
      let anoVencimento = hoje.getFullYear();
      if (mesVencimento > 11) {
        mesVencimento = 0;
        anoVencimento++;
      }

      // Garantir que o dia não ultrapasse o último dia do mês
      const ultimoDia = new Date(anoVencimento, mesVencimento + 1, 0).getDate();
      const diaFinal = Math.min(diaVencimento, ultimoDia);
      const dataVencimento = new Date(anoVencimento, mesVencimento, diaFinal);
      const referencia = `${anoVencimento}-${String(mesVencimento + 1).padStart(2, '0')}`;

      // Atualizar status da matrícula para ativa
      await supabase
        .from("matriculas")
        .update({ status: "ativa" })
        .eq("id", matricula.id);

      // Gerar primeiro pagamento
      const { error } = await supabase.from("pagamentos").insert({
        matricula_id: matricula.id,
        valor: valor,
        data_vencimento: dataVencimento.toISOString().split("T")[0],
        status: "pendente",
        referencia: referencia,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Matrícula Aprovada!",
        description: "Pagamento gerado automaticamente. O responsável será notificado.",
      });
      refetchSolicitacoes();
    },
    onError: (error) => {
      handleError(error, "Erro ao aprovar");
    },
  });


  const recusarMatriculaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("matriculas")
        .update({ status: "cancelada" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Solicitação Recusada",
        description: "A matrícula foi cancelada.",
      });
      refetchSolicitacoes();
    },
  });

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 lg:p-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-9 bg-primary rounded-full shrink-0" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Bem-vindo ao sistema de gestão Zafen
            </p>
          </div>
        </div>

        {/* Solicitações de Matrícula (Admission Funnel) */}
        {loadingSolicitacoes ? (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </CardContent>
          </Card>
        ) : solicitacoesPendentes && solicitacoesPendentes.length > 0 && (
          <Card className="border-l-4 border-l-primary shadow-sm bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Solicitações de Vaga Pendentes
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {solicitacoesPendentes.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {solicitacoesPendentes.map((solicitacao: any) => (
                  <div
                    key={solicitacao.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-background border rounded-lg gap-4 shadow-sm"
                  >
                    <div>
                      <h3 className="font-semibold text-lg">{solicitacao.alunos?.nome_completo}</h3>
                      <p className="text-sm text-muted-foreground">
                        {solicitacao.turmas?.atividades?.nome} - {solicitacao.turmas?.nome}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Solicitado em: {new Date(solicitacao.data_inicio).toLocaleDateString("pt-BR")} |
                        Valor: R$ {solicitacao.turmas?.atividades?.valor_mensal?.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        className="flex-1 sm:flex-none border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => recusarMatriculaMutation.mutate(solicitacao.id)}
                        disabled={recusarMatriculaMutation.isPending}
                      >
                        Recusar
                      </Button>
                      <Button
                        className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => aprovarMatriculaMutation.mutate(solicitacao)}
                        disabled={aprovarMatriculaMutation.isPending}
                      >
                        {aprovarMatriculaMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Aprovar e Cobrar"
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Total de Alunos"
            value={totalAlunos?.toString() || "0"}
            icon={Users}
            description="Alunos cadastrados"
            isLoading={loadingAlunos}
            variant="alunos"
          />
          <DashboardCard
            title="Atividades Ativas"
            value={atividadesAtivas?.toString() || "0"}
            icon={GraduationCap}
            description="Modalidades oferecidas"
            isLoading={loadingAtividadesAtivas}
            variant="atividades"
          />
          <DashboardCard
            title="Receita Mensal"
            value={`R$ ${receitaMensal?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}`}
            icon={DollarSign}
            description="Pagamentos recebidos"
            isLoading={loadingReceita}
            variant="financeiro"
          />
          <DashboardCard
            title="Taxa de Ocupação"
            value={`${taxaOcupacao || 0}%`}
            icon={TrendingUp}
            description="Capacidade utilizada"
            isLoading={loadingOcupacao}
            variant="ocupacao"
          />
        </div>

        {/* Quick Overview */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-0.5 h-4 bg-muted-foreground/40 rounded-full" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Visão Geral</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 -mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Atividades Populares</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingAtividades ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : atividadesPopulares && atividadesPopulares.length > 0 ? (
                atividadesPopulares.map((ativ) => (
                  <div key={ativ.nome} className="flex justify-between items-center">
                    <span className="text-sm text-foreground">{ativ.nome}</span>
                    <span className="text-sm font-medium text-primary">
                      {ativ.alunos} alunos
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma atividade cadastrada
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pagamentos Pendentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingPagamentosStatus ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : statusPagamentos ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-foreground">Vencidos</span>
                    <span className="text-sm font-medium text-destructive">
                      {statusPagamentos.vencidos}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-foreground">Vencem em 7 dias</span>
                    <span className="text-sm font-medium text-warning">
                      {statusPagamentos.vencemEmBreve}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-foreground">Em dia</span>
                    <span className="text-sm font-medium text-success">
                      {statusPagamentos.emDia}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sem dados de pagamentos
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Visão Geral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground">Alunos Ativos</span>
                <span className="text-sm font-medium text-primary">
                  {totalAlunos || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground">Turmas Abertas</span>
                <span className="text-sm font-medium text-primary">
                  {atividadesAtivas || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground">Taxa de Ocupação</span>
                <span className="text-sm font-medium text-primary">
                  {taxaOcupacao || 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
