import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/DashboardCard";
import { Button } from "@/components/ui/button";
import { Users, FileText, UserPlus, ClipboardList, ArrowRight, TrendingUp, MessageSquare, Mail, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useUnidade } from "@/contexts/UnidadeContext";

const DashboardSecretaria = () => {
  const { currentUnidade } = useUnidade();

  // Total de alunos
  const { data: totalAlunos, isLoading: loadingAlunos } = useQuery({
    queryKey: ["secretaria-total-alunos"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("alunos")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Matrículas pendentes
  const { data: matriculasPendentes, isLoading: loadingPendentes } = useQuery({
    queryKey: ["secretaria-matriculas-pendentes"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("matriculas")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");
      if (error) throw error;
      return count || 0;
    },
  });

  // Alunos cadastrados hoje
  const { data: cadastrosHoje, isLoading: loadingHoje } = useQuery({
    queryKey: ["secretaria-cadastros-hoje"],
    queryFn: async () => {
      const hoje = new Date().toISOString().split("T")[0];
      const { count, error } = await supabase
        .from("alunos")
        .select("*", { count: "exact", head: true })
        .gte("created_at", hoje);
      if (error) throw error;
      return count || 0;
    },
  });

  // Atividades ativas
  const { data: atividadesAtivas, isLoading: loadingAtividades } = useQuery({
    queryKey: ["secretaria-atividades-ativas"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("atividades")
        .select("*", { count: "exact", head: true })
        .eq("ativa", true);
      if (error) throw error;
      return count || 0;
    },
  });

  // Funil de captação — interessados (solicitacoes_matricula)
  const { data: totalInteressados, isLoading: loadingInteressados } = useQuery({
    queryKey: ["secretaria-interessados"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("solicitacoes_matricula")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Funil — convites enviados
  const { data: totalConvites, isLoading: loadingConvites } = useQuery({
    queryKey: ["secretaria-convites"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("invitations")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Funil — matrículas ativas
  const { data: matriculasAtivas, isLoading: loadingAtivas } = useQuery({
    queryKey: ["secretaria-matriculas-ativas"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("matriculas")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativa");
      if (error) throw error;
      return count || 0;
    },
  });

  const funnelSteps = [
    {
      label: "Interessados",
      value: totalInteressados ?? 0,
      loading: loadingInteressados,
      icon: MessageSquare,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
      href: null,
    },
    {
      label: "Convites Enviados",
      value: totalConvites ?? 0,
      loading: loadingConvites,
      icon: Mail,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      href: "/secretaria/convites-legados",
    },
    {
      label: "Aguardando Aprovação",
      value: matriculasPendentes ?? 0,
      loading: loadingPendentes,
      icon: ClipboardList,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      href: null,
    },
    {
      label: "Matrículas Ativas",
      value: matriculasAtivas ?? 0,
      loading: loadingAtivas,
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      href: "/secretaria/alunos",
    },
  ];

  const conversionRate = (from: number, to: number) =>
    from > 0 ? Math.round((to / from) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Secretaria</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo ao painel de atendimento
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/secretaria/cadastrar-aluno" className="group">
            <Card className="h-full border-2 border-dashed border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 transition-all cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserPlus className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-foreground">Cadastrar Aluno</h3>
                  <p className="text-sm text-muted-foreground">Registrar novo aluno no sistema</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/secretaria/nova-matricula" className="group">
            <Card className="h-full border-2 border-dashed border-blue-500/30 bg-blue-500/5 hover:border-blue-500/60 hover:bg-blue-500/10 transition-all cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="h-7 w-7 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-foreground">Nova Matrícula</h3>
                  <p className="text-sm text-muted-foreground">Solicitar matrícula pendente</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Total de Alunos"
            value={totalAlunos ?? 0}
            icon={Users}
            description="Alunos cadastrados"
            variant="alunos"
            isLoading={loadingAlunos}
          />
          <DashboardCard
            title="Pendentes"
            value={matriculasPendentes ?? 0}
            icon={ClipboardList}
            description="Matrículas aguardando aprovação"
            variant="ocupacao"
            isLoading={loadingPendentes}
          />
          <DashboardCard
            title="Cadastros Hoje"
            value={cadastrosHoje ?? 0}
            icon={UserPlus}
            description="Novos alunos no dia"
            variant="financeiro"
            isLoading={loadingHoje}
          />
          <DashboardCard
            title="Atividades"
            value={atividadesAtivas ?? 0}
            icon={FileText}
            description="Modalidades abertas"
            variant="atividades"
            isLoading={loadingAtividades}
          />
        </div>

        {/* Funil de Captação */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <TrendingUp className="h-4 w-4 text-primary" />
              Funil de Captação
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop: horizontal flow */}
            <div className="hidden sm:flex items-stretch gap-2">
              {funnelSteps.map((step, i) => {
                const nextStep = funnelSteps[i + 1];
                const rate = nextStep ? conversionRate(step.value, nextStep.value) : null;
                return (
                  <div key={step.label} className="flex items-center flex-1 min-w-0">
                    <div className={`flex-1 rounded-2xl border p-4 space-y-2 ${step.border} ${step.bg} min-w-0`}>
                      <div className={`flex items-center gap-2 ${step.color} text-xs font-bold uppercase tracking-wider`}>
                        <step.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{step.label}</span>
                      </div>
                      {step.loading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : step.href ? (
                        <Link to={step.href} className={`text-3xl font-bold ${step.color} hover:underline`}>
                          {step.value}
                        </Link>
                      ) : (
                        <p className={`text-3xl font-bold ${step.color}`}>{step.value}</p>
                      )}
                    </div>
                    {rate !== null && (
                      <div className="flex flex-col items-center px-2 shrink-0">
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                        <span className="text-[10px] font-bold text-muted-foreground">{rate}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile: vertical stack */}
            <div className="sm:hidden space-y-2">
              {funnelSteps.map((step, i) => {
                const nextStep = funnelSteps[i + 1];
                const rate = nextStep ? conversionRate(step.value, nextStep.value) : null;
                return (
                  <div key={step.label}>
                    <div className={`flex items-center justify-between rounded-xl border p-3 ${step.border} ${step.bg}`}>
                      <div className="flex items-center gap-2">
                        <step.icon className={`h-4 w-4 shrink-0 ${step.color}`} />
                        <span className="text-xs font-bold text-muted-foreground">{step.label}</span>
                      </div>
                      {step.loading ? (
                        <Skeleton className="h-5 w-8" />
                      ) : step.href ? (
                        <Link to={step.href} className={`text-xl font-bold ${step.color} hover:underline`}>{step.value}</Link>
                      ) : (
                        <span className={`text-xl font-bold ${step.color}`}>{step.value}</span>
                      )}
                    </div>
                    {rate !== null && (
                      <div className="flex items-center gap-1 pl-4 py-0.5">
                        <div className="w-px h-3 bg-border" />
                        <span className="text-[10px] text-muted-foreground font-bold">{rate}% conversão</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Info banner */}
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <ClipboardList className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Sobre as matrículas</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Todas as matrículas criadas ficam como <strong>pendente</strong> e precisam ser aprovadas pela diretoria.
                Casos de alunos com necessidades especiais (PNE) são sinalizados automaticamente na ficha.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardSecretaria;
