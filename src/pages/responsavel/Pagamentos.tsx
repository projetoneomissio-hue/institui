import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Loader2, DollarSign, AlertCircle, CreditCard, Wallet, Calendar, CheckCircle2, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { ReciboPagamento } from "@/components/reports/ReciboPagamento";

const Pagamentos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [payingId, setPayingId] = useState<string | null>(null);

  // Handle cancel from InfinitePay (success redirects to dedicated page)
  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      toast({
        title: "Pagamento cancelado",
        description: "O pagamento foi cancelado. Você pode tentar novamente.",
        variant: "destructive",
      });
      setSearchParams({});
    }
  }, [searchParams, toast, setSearchParams]);

  // Mutation para pagar online via InfinitePay
  const pagarOnlineMutation = useMutation({
    mutationFn: async (pagamentoId: string) => {
      const { data, error } = await supabase.functions.invoke("create-infinitepay-link", {
        body: { pagamentoId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data.gateway_url) {
        window.open(data.gateway_url, "_blank");
        setPayingId(null);
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao processar pagamento",
        description: error.message,
        variant: "destructive",
      });
      setPayingId(null);
    },
  });

  const handlePagarOnline = (pagamento: any) => {
    // Se já existe um link gerado, redireciona direto
    if (pagamento.gateway_url) {
      window.open(pagamento.gateway_url, "_blank");
      return;
    }
    // Caso contrário, gera um novo link
    setPayingId(pagamento.id);
    pagarOnlineMutation.mutate(pagamento.id);
  };

  // Fetch pagamentos do responsável
  const { data: pagamentos, isLoading } = useQuery({
    queryKey: ["pagamentos-responsavel", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Primeiro busca alunos do responsável
      const { data: alunosData, error: e1 } = await supabase
        .from("alunos")
        .select("id")
        .eq("responsavel_id", user.id);

      if (e1) throw e1;
      if (!alunosData || alunosData.length === 0) return [];

      const alunoIds = alunosData.map((a) => a.id);

      // Busca matrículas dos alunos
      const { data: matriculasData, error: e2 } = await supabase
        .from("matriculas")
        .select(`
          id,
          aluno_id,
          turma_id,
          alunos(nome_completo),
          turmas(nome, atividade_id, atividades(nome))
        `)
        .in("aluno_id", alunoIds);

      if (e2) throw e2;

      const matriculaIds = matriculasData?.map((m) => m.id) || [];
      if (matriculaIds.length === 0) return [];

      // Busca pagamentos (pendentes primeiro, depois por vencimento)
      const { data, error } = await supabase
        .from("pagamentos")
        .select("*")
        .in("matricula_id", matriculaIds)
        .order("status", { ascending: true })
        .order("data_vencimento", { ascending: true });

      if (error) throw error;

      // Mapeia pagamentos com dados das matrículas
      return data?.map((pag) => {
        const matricula = matriculasData?.find((m) => m.id === pag.matricula_id);
        return {
          ...pag,
          matricula,
        };
      }) || [];
    },
    enabled: !!user,
  });

  // Calcula totais
  const totalPendente = pagamentos
    ?.filter((p) => p.status === "pendente" || p.status === "atrasado")
    .reduce((acc, p) => acc + parseFloat(p.valor.toString()), 0) || 0;

  const totalPago = pagamentos
    ?.filter((p) => p.status === "pago")
    .reduce((acc, p) => acc + parseFloat(p.valor.toString()), 0) || 0;

  const getStatusBadge = (status: string, dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);

    if (status === "pago") {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1" /> Pago</Badge>;
    } else if (status === "cancelado") {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground"><AlertCircle className="w-3 h-3 mr-1" /> Cancelado</Badge>;
    } else if (vencimento < hoje) {
      return <Badge variant="destructive" className="animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"><AlertCircle className="w-3 h-3 mr-1" /> Atrasado</Badge>;
    } else {
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 shadow-sm"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  const isDueOrOverdue = (status: string, dataVencimento: string) => {
    if (status === "pago" || status === "cancelado") return false;
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diasAteVencimento = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diasAteVencimento <= 7;
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">💳 Meus Pagamentos</h1>
            <p className="text-base text-muted-foreground mt-1">
              Acompanhe e pague as mensalidades dos seus alunos
            </p>
          </div>
          {totalPendente > 0 && (
            <Button asChild>
              <Link to="/responsavel/registrar-pagamento">
                <CreditCard className="mr-2 h-4 w-4" />
                Registrar Pagamento
              </Link>
            </Button>
          )}
        </div>

        {/* Resumo */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-t-4 border-t-destructive shadow-lg bg-red-50/30 dark:bg-red-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-destructive/80">Valor Pendente</CardTitle>
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-sm font-medium text-destructive/70 mt-1">
                {pagamentos?.filter((p) => p.status === "pendente" || p.status === "atrasado").length || 0} mensalidades aguardando
              </p>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-success shadow-lg bg-green-50/30 dark:bg-green-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-success/80">Total Pago</CardTitle>
              <div className="p-2 bg-success/10 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                R$ {totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-sm font-medium text-success/70 mt-1">
                {pagamentos?.filter((p) => p.status === "pago").length || 0} mensalidades quitadas
              </p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pagamentos && pagamentos.length > 0 ? (
          <Card className="shadow-md border-primary/20">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Histórico de Mensalidades
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                {pagamentos.map((pagamento) => (
                  <Card
                    key={pagamento.id}
                    className={`overflow-hidden transition-all hover:shadow-md ${isDueOrOverdue(pagamento.status, pagamento.data_vencimento)
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-border/50 bg-card/50"
                      }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                        <div className="flex-1 w-full">
                          <div className="flex items-center justify-between md:justify-start gap-3 mb-2">
                            <h3 className="font-bold text-lg text-foreground">
                              {pagamento.matricula?.alunos?.nome_completo || "N/A"}
                            </h3>
                            {getStatusBadge(pagamento.status, pagamento.data_vencimento)}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-foreground/80 font-medium bg-muted/50 w-fit px-3 py-1 rounded-md mb-3">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            {pagamento.matricula?.turmas?.atividades?.nome || "N/A"} -{" "}
                            {pagamento.matricula?.turmas?.nome || "N/A"}
                          </div>

                          <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Vencimento:</span>
                              <span className="font-semibold text-foreground">
                                {format(new Date(pagamento.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>

                            {pagamento.data_pagamento && (
                              <div className="flex items-center gap-1.5 text-success">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Pago em:</span>
                                <span className="font-semibold">
                                  {format(new Date(pagamento.data_pagamento), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              </div>
                            )}
                            {pagamento.forma_pagamento && (
                              <div className="flex items-center gap-1.5 col-span-2">
                                <CreditCard className="h-3.5 w-3.5" />
                                <span>Forma: {pagamento.forma_pagamento}</span>
                              </div>
                            )}
                          </div>
                          {pagamento.observacoes && (
                            <p className="text-xs text-muted-foreground mt-3 italic bg-muted/30 p-2 rounded-md border-l-2 border-l-primary">
                              Obs: {pagamento.observacoes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col md:items-end justify-between self-stretch pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-border/50 md:pl-5 min-w-[200px]">
                          <div className="text-left md:text-right mb-4 border-l-4 md:border-l-0 border-primary md:border-transparent pl-3 md:pl-0">
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Valor da Parcela</p>
                            <p className="text-3xl font-bold text-foreground">
                              R$ {parseFloat(pagamento.valor.toString()).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div className="flex w-full md:w-auto gap-2">
                            {(pagamento.status === "pendente" || pagamento.status === "atrasado") && (
                              <Button
                                onClick={() => handlePagarOnline(pagamento)}
                                disabled={payingId === pagamento.id}
                                size="lg"
                                className="w-full md:w-auto shadow-md hover:shadow-primary/20 relative overflow-hidden group text-base font-bold px-6 py-3"
                              >
                                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:animate-[shimmer_1.5s_infinite]"></span>
                                {payingId === pagamento.id ? (
                                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                ) : (
                                  <CreditCard className="h-5 w-5 mr-2" />
                                )}
                                {pagamento.gateway_url ? "Pagar Agora" : "Gerar Link de Pagamento"}
                              </Button>
                            )}
                            {pagamento.status === "pago" && (
                              <Button
                                variant="outline"
                                size="icon"
                                title="Baixar comprovante"
                                onClick={async () => {
                                  try {
                                    toast({
                                      title: "Gerando recibo...",
                                      description: "Aguarde enquanto preparamos o PDF."
                                    });

                                    const blob = await pdf(
                                      <ReciboPagamento pagamento={pagamento as any} />
                                    ).toBlob();

                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = `recibo-${pagamento.id.slice(0, 8)}.pdf`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);
                                  } catch (error) {
                                    console.error("Erro ao gerar recibo:", error);
                                    toast({
                                      title: "Erro",
                                      description: "Não foi possível gerar o recibo.",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                Nenhum pagamento registrado ainda.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Pagamentos;
