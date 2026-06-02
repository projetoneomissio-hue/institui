import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Bell, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUnidade } from "@/contexts/UnidadeContext";

const GerenciarNotificacoes = () => {
  const { toast } = useToast();
  const { currentUnidade } = useUnidade();
  const [isProcessing, setIsProcessing] = useState(false);

  // Buscar estatísticas de notificações pendentes
  const { data: stats, isLoading } = useQuery({
    queryKey: ["notification-stats"],
    queryFn: async () => {
      // Pagamentos próximos ao vencimento (5 dias)
      const cincoDiasDepois = new Date();
      cincoDiasDepois.setDate(cincoDiasDepois.getDate() + 5);
      const dataLimite = cincoDiasDepois.toISOString().split("T")[0];
      const hoje = new Date().toISOString().split("T")[0];

      const { count: pagamentosCount } = await supabase
        .from("pagamentos")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente")
        .gte("data_vencimento", hoje)
        .lte("data_vencimento", dataLimite);

      // Pagamentos atrasados
      const { count: atrasadosCount } = await supabase
        .from("pagamentos")
        .select("*", { count: "exact", head: true })
        .eq("status", "atrasado");

      // Matrículas pendentes (mais de 3 dias)
      const tresDiasAtras = new Date();
      tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);

      const { count: matriculasCount } = await supabase
        .from("matriculas")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente")
        .lt("created_at", tresDiasAtras.toISOString());

      return {
        pagamentosProximos: pagamentosCount || 0,
        pagamentosAtrasados: atrasadosCount || 0,
        matriculasPendentes: matriculasCount || 0,
      };
    },
  });

  // Enviar notificações automáticas
  const enviarNotificacoesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-notifications");

      if (error) {
        console.error("Error invoking function:", error);
        throw new Error(error.message || "Erro ao processar notificações");
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Notificações enviadas!",
        description: `Foram enviadas notificações para ${data?.stats?.upcomingPayments || 0} pagamentos próximos e ${data?.stats?.pendingEnrollments || 0} matrículas pendentes.`,
      });
      setIsProcessing(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar notificações",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  // Enviar lembrete de pagamento individual
  const enviarLembreteMutation = useMutation({
    mutationFn: async (pagamentoId: string) => {
      const { data: pagamento, error: errorPag } = await supabase
        .from("pagamentos")
        .select(`
          *,
          matricula:matriculas!inner(
            aluno:alunos!inner(
              nome_completo,
              responsavel:profiles!responsavel_id(
                nome_completo,
                email,
                telefone
              )
            ),
            turma:turmas!inner(
              nome,
              atividade:atividades!inner(nome)
            )
          )
        `)
        .eq("id", pagamentoId)
        .single();

      if (errorPag) throw errorPag;

      const matricula = pagamento.matricula as any;
      const aluno = matricula.aluno;
      const responsavel = aluno.responsavel;
      const turma = matricula.turma;

      const diasAtraso = Math.ceil(
        (new Date().getTime() - new Date(pagamento.data_vencimento).getTime()) / (1000 * 60 * 60 * 24)
      );

      const { error } = await supabase.functions.invoke("send-payment-reminder", {
        body: {
          to: responsavel.email,
          responsavelNome: responsavel.nome_completo,
          alunoNome: aluno.nome_completo,
          atividadeNome: turma.atividade.nome,
          turmaNome: turma.nome,
          valorDevido: Number(pagamento.valor),
          diasAtraso: Math.max(0, diasAtraso),
          dataVencimento: new Date(pagamento.data_vencimento).toLocaleDateString("pt-BR"),
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Lembrete enviado!",
        description: "O lembrete de pagamento foi enviado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar lembrete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEnviarNotificacoes = () => {
    setIsProcessing(true);
    enviarNotificacoesMutation.mutate();
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Notificações</h1>
          <p className="text-muted-foreground mt-1">
            Sistema automatizado de lembretes por email e WhatsApp
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Pagamentos Próximos</CardDescription>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pagamentosProximos || 0}</div>
              <p className="text-xs text-muted-foreground">Vencem em até 5 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Pagamentos Atrasados</CardDescription>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats?.pagamentosAtrasados || 0}
              </div>
              <p className="text-xs text-muted-foreground">Requerem atenção</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Matrículas Pendentes</CardDescription>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.matriculasPendentes || 0}</div>
              <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
            </CardContent>
          </Card>
        </div>

        {/* Ações Principais */}
        <Card>
          <CardHeader>
            <CardTitle>Enviar Notificações Automáticas</CardTitle>
            <CardDescription>
              Envia lembretes por email para pagamentos próximos ao vencimento e matrículas pendentes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">Email Automático</h4>
                  <p className="text-xs text-muted-foreground">
                    • Lembretes de pagamento 5 dias antes do vencimento<br />
                    • Alertas de matrículas pendentes há mais de 3 dias<br />
                    • Emails HTML formatados com detalhes completos
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">WhatsApp (Em Breve)</h4>
                  <p className="text-xs text-muted-foreground">
                    Integração com WhatsApp Business API para envio automático de mensagens
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    Próxima Atualização
                  </Badge>
                </div>
              </div>
            </div>

            <Button
              onClick={handleEnviarNotificacoes}
              disabled={isProcessing || enviarNotificacoesMutation.isPending}
              className="w-full"
              size="lg"
            >
              {isProcessing || enviarNotificacoesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Notificações Agora
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Informações Adicionais */}
        <Card>
          <CardHeader>
            <CardTitle>Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                1
              </div>
              <p>
                <strong className="text-foreground">Pagamentos Próximos:</strong> O sistema identifica
                pagamentos com vencimento em até 5 dias e envia lembretes por email aos responsáveis.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                2
              </div>
              <p>
                <strong className="text-foreground">Matrículas Pendentes:</strong> Notifica a coordenação
                sobre matrículas aguardando aprovação há mais de 3 dias.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                3
              </div>
              <p>
                <strong className="text-foreground">Automação:</strong> Configure o agendamento automático
                para enviar notificações diariamente sem intervenção manual.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contato WhatsApp Manual */}
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Envio Manual via WhatsApp
            </CardTitle>
            <CardDescription>
              Enquanto a integração automática não está disponível, você pode enviar mensagens manualmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Utilize o número oficial da unidade {currentUnidade?.nome || 'Zafen'} para enviar lembretes personalizados:
            </p>
            <Button variant="outline" className="gap-2" asChild>
              <a
                href="https://wa.me/5541984406992"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageSquare className="h-4 w-4" />
                Abrir WhatsApp (41) 98440-6992
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default GerenciarNotificacoes;
