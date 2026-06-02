import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, AlertCircle, Wallet, Calendar, CreditCard as CardIcon, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const FORMAS_PAGAMENTO = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência Bancária" },
];

const RegistrarPagamento = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPagamentoId, setSelectedPagamentoId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pagamentosPendentes, isLoading } = useQuery({
    queryKey: ["pagamentos-responsavel", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Step 1: alunos do responsável
      const { data: alunosData } = await supabase
        .from("alunos").select("id").eq("responsavel_id", user.id);
      if (!alunosData?.length) return [];
      const alunoIds = alunosData.map((a: any) => a.id);

      // Step 2: matrículas desses alunos
      const { data: matriculasData } = await supabase
        .from("matriculas").select("id").in("aluno_id", alunoIds);
      if (!matriculasData?.length) return [];
      const matriculaIds = matriculasData.map((m: any) => m.id);

      // Step 3: pagamentos pendentes ou aguardando confirmação
      const { data, error } = await supabase
        .from("pagamentos")
        .select(`
          id, valor, data_vencimento, status, forma_pagamento,
          matricula:matriculas(
            aluno:alunos(nome_completo),
            turma:turmas(nome, atividade:atividades(nome))
          )
        `)
        .in("matricula_id", matriculaIds)
        .in("status", ["pendente", "aguardando_confirmacao"])
        .order("data_vencimento", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const avisarPagamentoMutation = useMutation({
    mutationFn: async (data: {
      pagamento_id: string;
      forma_pagamento: string;
      observacoes: string;
    }) => {
      const { error } = await supabase
        .from("pagamentos")
        .update({
          status: "aguardando_confirmacao",
          forma_pagamento: data.forma_pagamento,
          observacoes: data.observacoes || null,
        })
        .eq("id", data.pagamento_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pagamentos-responsavel"] });
      queryClient.invalidateQueries({ queryKey: ["pagamentos-pendentes"] });
      toast({
        title: "Aviso enviado!",
        description: "A diretoria será notificada e confirmará seu pagamento em breve.",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar aviso",
        description: error.message || "Não foi possível enviar o aviso de pagamento.",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (pagamentoId: string) => {
    setSelectedPagamentoId(pagamentoId);
    setFormaPagamento("");
    setObservacoes("");
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedPagamentoId("");
    setFormaPagamento("");
    setObservacoes("");
  };

  const handleSubmit = () => {
    if (!formaPagamento) {
      toast({
        title: "Forma de pagamento obrigatória",
        description: "Selecione como o pagamento foi realizado.",
        variant: "destructive",
      });
      return;
    }

    avisarPagamentoMutation.mutate({
      pagamento_id: selectedPagamentoId,
      forma_pagamento: formaPagamento,
      observacoes: observacoes,
    });
  };

  const isDueOrOverdue = (dataVencimento: string, status: string) => {
    if (status === "aguardando_confirmacao") return false;
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diffDias <= 7;
  };

  const getStatusBadge = (dataVencimento: string, status: string) => {
    if (status === "aguardando_confirmacao") {
      return <Badge className="bg-blue-500 text-white border-none font-bold px-3">Aguard. Confirmação</Badge>;
    }

    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return <Badge variant="destructive" className="animate-pulse shadow-sm shadow-destructive/20 font-bold px-3">Atrasado</Badge>;
    } else if (diffDias <= 7) {
      return <Badge className="bg-orange-500 text-white border-none font-bold px-3">Vence em breve</Badge>;
    }
    return <Badge variant="secondary" className="bg-muted-foreground/10 text-muted-foreground border-none font-bold px-3">Pendente</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Pagamentos</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe e informe pagamentos realizados
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary animate-pulse" />
              </div>
            </div>
          </div>
        ) : pagamentosPendentes && pagamentosPendentes.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {pagamentosPendentes.map((pagamento: any) => (
              <Card key={pagamento.id} className="overflow-hidden border-primary/10 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 group">
                <div className={`h-1 w-full ${pagamento.status === "aguardando_confirmacao" ? "bg-blue-500" : "bg-primary"}`} />
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                          <CardIcon className="h-4 w-4" />
                        </span>
                        <CardTitle className="text-xl font-semibold">
                          {pagamento.matricula.aluno.nome_completo}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/30 w-fit px-2.5 py-1 rounded-full uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {pagamento.matricula.turma.atividade.nome} • {pagamento.matricula.turma.nome}
                      </div>
                    </div>
                    {getStatusBadge(pagamento.data_vencimento, pagamento.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/50">
                      <div className="flex items-center gap-1.5 text-xs uppercase text-muted-foreground">
                        <Calendar className="h-3 w-3" /> Vencimento
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {format(new Date(pagamento.data_vencimento), "dd 'de' MMM", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-1.5 text-xs uppercase text-primary">
                        <Wallet className="h-3 w-3" /> Valor Total
                      </div>
                      <p className="text-sm font-semibold text-primary">
                        R$ {parseFloat(pagamento.valor.toString()).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  {pagamento.status === "pendente" ? (
                    <Button
                      onClick={() => handleOpenDialog(pagamento.id)}
                      className={`w-full h-11 text-base font-bold transition-all relative overflow-hidden group/btn ${
                        isDueOrOverdue(pagamento.data_vencimento, pagamento.status)
                          ? "shadow-[0_0_15px_rgba(238,17,101,0.3)] hover:shadow-[0_0_20px_rgba(238,17,101,0.5)]"
                          : ""
                      }`}
                      variant={isDueOrOverdue(pagamento.data_vencimento, pagamento.status) ? "default" : "outline"}
                    >
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover/btn:animate-[shimmer_1.5s_infinite]"></span>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Avisar que Paguei
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <Clock className="h-4 w-4 text-blue-600 animate-pulse shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-400">Aguardando confirmação</p>
                        {pagamento.forma_pagamento && (
                          <p className="text-xs text-blue-600/70 dark:text-blue-400/70 capitalize">Via {pagamento.forma_pagamento.replace("_", " ")}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-muted bg-muted/5">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-full bg-muted/20 mb-4 scale-110">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground/60" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">Tudo em dia!</h3>
              <p className="text-muted-foreground max-w-[280px]">
                Não encontramos nenhum pagamento pendente no momento.
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Avisar que Paguei</DialogTitle>
              <DialogDescription>
                Informe como o pagamento foi realizado. A diretoria confirmará o recebimento.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="forma_pagamento">Forma de Pagamento *</Label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger id="forma_pagamento">
                    <SelectValue placeholder="Selecione como pagou" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO.map((forma) => (
                      <SelectItem key={forma.value} value={forma.value}>
                        {forma.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações (opcional)</Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Comprovante número #12345, pago às 14:30"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                disabled={avisarPagamentoMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={avisarPagamentoMutation.isPending}
              >
                {avisarPagamentoMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Avisar que Paguei
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="mt-8 pt-6 border-t border-border flex items-center gap-2 text-xs text-muted-foreground/40">
          <div className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse"></div>
          Sistema de Pagamentos Seguro • Protegido por LGPD
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RegistrarPagamento;
