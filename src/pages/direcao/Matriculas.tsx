import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { infinitePayService } from "@/services/infinitepay.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { useUnidade } from "@/contexts/UnidadeContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus, Eye, Search, Phone, Calendar, User, Activity, AlertCircle, Link as LinkIcon, Loader2, Copy, Check, X, Upload
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { matriculasService } from "@/services/matriculas.service";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const getStatusColor = (status: string) => {
  switch (status) {
    case "ativa": return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
    case "pendente": return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
    case "cancelada": return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
    default: return "bg-muted text-muted-foreground";
  }
};

const DetalhesMatriculaSheet = ({ matricula, open, onOpenChange }: any) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUnidade } = useUnidade();
  const [isGenerating, setIsGenerating] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [taxaMatricula, setTaxaMatricula] = useState("25,00");
  const [approveSuccess, setApproveSuccess] = useState<{
    checkoutUrl: string | null;
    valorTaxa: number;
    nomeAluno: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setCheckoutUrl(null);
      setIsGenerating(false);
      setApproveDialogOpen(false);
      setRejectDialogOpen(false);
      setApproveSuccess(null);
    }
  }, [open]);

  const aprovarMutation = useMutation({
    mutationFn: async () => {
      if (!matricula || !currentUnidade?.id) return;

      const { error: errUpdate } = await supabase
        .from("matriculas")
        .update({ status: "ativa" })
        .eq("id", matricula.id);
      if (errUpdate) throw new Error(`Erro ao aprovar: ${errUpdate.message}`);

      const turmaId = matricula.turma?.id;
      const { data: turmaInfo } = turmaId ? await supabase
        .from("turmas")
        .select("atividade_id, atividades(valor_mensal)")
        .eq("id", turmaId)
        .single() : { data: null };

      const valorMensal = (turmaInfo as any)?.atividades?.valor_mensal || 0;
      if (valorMensal > 0) {
        const { data: configData } = await supabase
          .from("configuracoes")
          .select("valor")
          .eq("chave", "dia_vencimento")
          .single();
        const diaVencimento = configData?.valor ? parseInt(configData.valor) : 5;
        const hoje = new Date();
        let mesVencimento = hoje.getMonth() + 1;
        let anoVencimento = hoje.getFullYear();
        if (mesVencimento > 12) { mesVencimento = 1; anoVencimento++; }
        const ultimoDia = new Date(anoVencimento, mesVencimento, 0).getDate();
        const diaFinal = Math.min(diaVencimento, ultimoDia);
        const dataVencimento = new Date(anoVencimento, mesVencimento - 1, diaFinal);
        const referencia = `${anoVencimento}-${String(mesVencimento).padStart(2, "0")}`;
        const { error: errMensalidade } = await supabase.from("pagamentos").insert({
          matricula_id: matricula.id,
          valor: valorMensal,
          data_vencimento: dataVencimento.toISOString().split("T")[0],
          status: "pendente",
          referencia,
          unidade_id: currentUnidade.id,
          observacoes: `Mensalidade ${mesVencimento}/${anoVencimento} - ${matricula.turma?.atividade?.nome || "Atividade"}`,
        });
        if (errMensalidade) throw new Error(`Erro ao criar mensalidade: ${errMensalidade.message}`);
      }

      const valorTaxaNum = parseFloat(taxaMatricula.replace(",", "."));
      let taxaPagamentoId: string | null = null;
      if (valorTaxaNum > 0) {
        const hojeObj = new Date();
        hojeObj.setDate(hojeObj.getDate() + 3);
        const { data: taxaData, error: errTaxa } = await supabase.from("pagamentos").insert({
          matricula_id: matricula.id,
          valor: valorTaxaNum,
          data_vencimento: hojeObj.toISOString().split("T")[0],
          status: "pendente",
          referencia: "TAXA-MATRICULA",
          unidade_id: currentUnidade.id,
          observacoes: "Taxa de Matrícula",
        }).select("id").single();
        if (errTaxa) throw new Error(`Erro ao criar taxa de matrícula: ${errTaxa.message}`);
        taxaPagamentoId = taxaData?.id || null;
      }

      try {
        const { data: responsavelData } = await supabase
          .from("alunos")
          .select("responsavel:responsavel_id(email, nome)")
          .eq("id", matricula.aluno_id)
          .single();
        const emailResp = (responsavelData?.responsavel as any)?.email;
        const nomeResp = (responsavelData?.responsavel as any)?.nome || matricula.aluno?.nome_completo;
        if (emailResp) {
          await supabase.functions.invoke("send-email", {
            body: {
              to: emailResp,
              type: "matricula_aprovada",
              data: { nomeResponsavel: nomeResp, nomeAluno: matricula.aluno?.nome_completo, atividade: matricula.turma?.atividade?.nome || "nossas atividades" },
            },
          });
        }
      } catch {}

      let generatedCheckoutUrl: string | null = null;
      if (taxaPagamentoId) {
        try {
          const result = await infinitePayService.createCheckoutLink(taxaPagamentoId);
          generatedCheckoutUrl = result.gateway_url;
        } catch {}
      }

      return {
        checkoutUrl: generatedCheckoutUrl,
        valorTaxa: valorTaxaNum,
        nomeAluno: matricula.aluno?.nome_completo || "Aluno",
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["matriculas-premium"] });
      queryClient.removeQueries({ queryKey: ["management-matriculas-pendentes"] });
      if (result) {
        setApproveSuccess(result);
      } else {
        toast({ title: "Matrícula Aprovada com Sucesso!" });
        setApproveDialogOpen(false);
        onOpenChange(false);
      }
    },
    onError: (error: any) => {
      toast({ title: "Erro na aprovação", description: error.message, variant: "destructive" });
    },
  });

  const rejeitarMutation = useMutation({
    mutationFn: async () => {
      if (!matricula) return;
      const { error } = await supabase
        .from("matriculas")
        .update({ status: "cancelada" })
        .eq("id", matricula.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matriculas-premium"] });
      queryClient.removeQueries({ queryKey: ["management-matriculas-pendentes"] });
      toast({ title: "Matrícula Cancelada" });
      setRejectDialogOpen(false);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao cancelar", description: error.message, variant: "destructive" });
    },
  });

  if (!matricula) return null;

  const aluno = matricula.aluno;
  const health = aluno?.anamneses?.[0];
  const responsavel = aluno?.responsavel;
  
  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0 border-l border-border">
        <SheetTitle className="sr-only">Detalhes da Matrícula</SheetTitle>
        <SheetDescription className="sr-only">Painel de visualização avançada com resumo de contatos e log financeiro da matrícula e aluno.</SheetDescription>
        <div className="relative h-32 bg-primary/5 flex items-end p-6 border-b border-border">
          <Badge className={cn("absolute top-6 right-6 font-bold uppercase tracking-widest text-[10px] border-none shadow-sm", getStatusColor(matricula.status))}>
            {matricula.status}
          </Badge>
          <div className="flex items-center gap-4 translate-y-8">
            <Avatar className="h-20 w-20 border-4 border-background shadow-xl">
              <AvatarImage src={aluno?.foto_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {aluno?.nome_completo?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="p-6 pt-12 space-y-8">
          {/* Header Info */}
          <div>
            <h2 className="text-xl font-bold text-foreground">{aluno?.nome_completo}</h2>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {aluno?.data_nascimento ? format(new Date(aluno.data_nascimento), "dd/MM/yyyy") : "Não informado"} 
                {aluno?.data_nascimento && ` (${new Date().getFullYear() - new Date(aluno.data_nascimento).getFullYear()} anos)`}
              </span>
            </div>
          </div>

          {/* Enrolment Info */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-2xl border border-primary/5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Activity className="h-3 w-3" /> Dados da Matrícula
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Turma</p>
                <p className="text-sm font-semibold">{matricula.turma?.nome}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{matricula.turma?.horario} • {matricula.turma?.dias_semana?.join(", ")}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Atividade</p>
                <p className="text-sm font-semibold">{matricula.turma?.atividade?.nome}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Data de Início</p>
                <p className="text-sm">{matricula.data_inicio ? format(new Date(matricula.data_inicio), "dd/MM/yyyy") : "-"}</p>
              </div>
            </div>
          </div>

          {/* Responsible Info */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-2xl border border-primary/5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <User className="h-3 w-3" /> Contato Responsável
            </h3>
            {responsavel ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold">{responsavel.nome_completo}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{responsavel.telefone || "Não informado"}</span>
                </div>
                {responsavel.telefone && (
                  <Button 
                    className="w-full mt-2 gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white shadow-xl shadow-[#25D366]/20 font-bold"
                    onClick={() => {
                      const cleanPhone = responsavel.telefone.replace(/\D/g, "");
                      const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                      const msg = encodeURIComponent(`Olá ${responsavel.nome_completo}, referente à matrícula de ${aluno.nome_completo}...`);
                      window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                    Falar no WhatsApp
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nenhum responsável vinculado.</p>
            )}
          </div>

          {/* Approval Actions */}
          {matricula.status === "pendente" && (
            <div className="space-y-3 p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/20">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-yellow-600 flex items-center gap-2">
                <AlertCircle className="h-3 w-3" /> Aguardando Aprovação
              </h3>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  size="sm"
                  onClick={() => setApproveDialogOpen(true)}
                >
                  <Check className="mr-2 h-4 w-4" /> APROVAR
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectDialogOpen(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Financial Actions */}
          {matricula.status === "ativa" && (
            <div className="space-y-3 p-4 bg-green-500/5 rounded-2xl border border-green-500/10">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-green-600 flex items-center gap-2">
                <LinkIcon className="h-3 w-3" /> Recuperação de Cobrança
              </h3>
              
              {!checkoutUrl ? (
                  <Button 
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white shadow-xl shadow-green-600/20 font-bold"
                    onClick={async () => {
                      try {
                        setIsGenerating(true);
                        // Verifica se existe um pagamento pendente
                        let pagId = matricula.pagamentos?.find((p: any) => p.status === "pendente")?.id;
                        
                        // Se não existe, cria um na hora! (Excelente para recuperar perdidos ou isentos)
                        if (!pagId) {
                            const { data: newPag, error } = await supabase.from("pagamentos").insert({
                                matricula_id: matricula.id,
                                valor: 25.00,
                                status: "pendente",
                                data_vencimento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                                referencia: "TAXA-MATRICULA"
                            }).select().single();
                            
                            if (error) throw error;
                            pagId = newPag.id;
                        }

                        const result = await infinitePayService.createCheckoutLink(pagId);
                        setCheckoutUrl(result.gateway_url);
                      } catch(e: any) {
                        toast({ variant: "destructive", title: "Erro InfinitePay", description: e.message || "Erro desconhecido" });
                      } finally {
                        setIsGenerating(false);
                      }
                    }}
                    disabled={isGenerating}
                  >
                    {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <LinkIcon className="h-5 w-5" />}
                    Gerar Pix / Cartão InfinitePay
                  </Button>
              ) : (
                  <div className="space-y-3 mt-2 animate-in fade-in zoom-in-95">
                      <div className="flex bg-background border rounded-lg p-2 items-center gap-2">
                          <LinkIcon className="h-4 w-4 text-muted-foreground ml-2" />
                          <input readOnly value={checkoutUrl} className="bg-transparent border-none flex-1 text-xs outline-none truncate font-mono text-muted-foreground" />
                          <Button size="icon" variant="secondary" className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                  onClick={() => {
                                      navigator.clipboard.writeText(checkoutUrl);
                                      toast({ title: "Link Copiado!" });
                                  }}>
                              <Copy className="h-4 w-4" />
                          </Button>
                      </div>
                      {responsavel?.telefone && (
                          <Button 
                            className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white font-bold uppercase text-xs h-10 rounded-xl shadow-xl shadow-[#25D366]/20 gap-2"
                            onClick={() => {
                                const cleanPhone = responsavel.telefone.replace(/\D/g, "");
                                const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                                const msg = encodeURIComponent(`Olá ${responsavel.nome_completo}! Parabéns, a matrícula de ${aluno.nome_completo} foi aprovada em ${currentUnidade?.nome || 'nossa Unidade'} 🎉\n\nPara concluir o ingresso na modalidade de ${matricula.turma?.atividade?.nome || 'Geral'}, você precisa realizar o pagamento da *Taxa de Matrícula (R$ 25,00)*.\n\nAcesse o link seguro a seguir para pagar via Pix ou Cartão:\n${checkoutUrl}\n\nApós o pagamento o acesso ao sistema será liberado automaticamente!`);
                                window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                            Enviar Cobrança (Pix/Cartão)
                          </Button>
                      )}
                  </div>
              )}
            </div>
          )}

          {/* Health Info */}
          {(health?.is_pne || health?.alergias || health?.doenca_cronica) && (
            <div className="space-y-3 p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-red-500 flex items-center gap-2">
                <AlertCircle className="h-3 w-3" /> Atenção Médica
              </h3>
              <ul className="space-y-2 text-sm">
                {health.is_pne && (
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-red-500">PNE:</span> 
                    <span className="text-muted-foreground">{health.pne_cid || "Sim (CID não informado)"}</span>
                  </li>
                )}
                {health.alergias && (
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-red-500">Alergias:</span> 
                    <span className="text-muted-foreground">{health.alergias}</span>
                  </li>
                )}
                {health.doenca_cronica && (
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-red-500">Doença Crônica:</span> 
                    <span className="text-muted-foreground">{health.doenca_cronica}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

        </div>
      </SheetContent>
    </Sheet>

    {/* Dialog Aprovar */}
    <Dialog open={approveDialogOpen} onOpenChange={(o) => { if (!aprovarMutation.isPending) { setApproveDialogOpen(o); if (!o) setApproveSuccess(null); } }}>
      <DialogContent className="sm:max-w-[500px]">
        {!approveSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar Matrícula</DialogTitle>
              <DialogDescription>
                Aprovar e ativar a matrícula de <strong>{matricula?.aluno?.nome_completo}</strong> na turma <strong>{matricula?.turma?.nome}</strong>?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Essa ação ativa o aluno, aloca a vaga na turma e emite a primeira fatura (se houver valor configurado).
              </p>
              <div className="space-y-2">
                <Label className="font-bold">Taxa de Matrícula (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <input
                    value={taxaMatricula}
                    onChange={(e) => setTaxaMatricula(e.target.value.replace(/[^0-9,]/g, ""))}
                    className="w-full pl-8 pr-3 py-2 border rounded-md bg-background font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="0,00"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Mantenha 0,00 para não cobrar taxa de entrada.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={aprovarMutation.isPending}>
                Cancelar
              </Button>
              <Button onClick={() => aprovarMutation.mutate()} disabled={aprovarMutation.isPending} className="bg-[#E8004F] hover:bg-[#E8004F]/90 text-white font-bold">
                {aprovarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                {aprovarMutation.isPending ? "Aprovando..." : "Confirmar e Ativar"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-4 space-y-5">
            {/* Sucesso */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Matrícula Aprovada!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>{approveSuccess.nomeAluno}</strong> foi matriculado com sucesso na turma <strong>{matricula?.turma?.nome}</strong>.
                </p>
              </div>
            </div>

            {/* Cobrança gerada */}
            {approveSuccess.valorTaxa > 0 && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400">Taxa de Matrícula</p>
                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
                    R$ {approveSuccess.valorTaxa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {approveSuccess.checkoutUrl ? (
                  <>
                    <div className="flex bg-background border rounded-lg p-2 items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-muted-foreground ml-1 shrink-0" />
                      <input readOnly value={approveSuccess.checkoutUrl} className="bg-transparent border-none flex-1 text-xs outline-none truncate font-mono text-muted-foreground" />
                      <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0"
                        onClick={() => { navigator.clipboard.writeText(approveSuccess.checkoutUrl!); toast({ title: "Link copiado!" }); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {matricula?.aluno?.responsavel?.telefone && (
                      <Button
                        className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white font-bold gap-2"
                        onClick={() => {
                          const phone = matricula.aluno.responsavel.telefone.replace(/\D/g, "");
                          const cleanPhone = phone.startsWith("55") ? phone : `55${phone}`;
                          const msg = encodeURIComponent(
                            `Olá ${matricula.aluno.responsavel.nome_completo}! 🎉\n\nA matrícula de *${approveSuccess.nomeAluno}* foi aprovada na turma *${matricula?.turma?.nome}*!\n\nPara confirmar a vaga, realize o pagamento da taxa de matrícula (R$ ${approveSuccess.valorTaxa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}):\n\n${approveSuccess.checkoutUrl}\n\nAté logo!`
                          );
                          window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                        Enviar Link no WhatsApp
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Link de pagamento disponível em Gestão de Cobranças.</p>
                )}
              </div>
            )}

            <Button className="w-full" onClick={() => { setApproveSuccess(null); setApproveDialogOpen(false); onOpenChange(false); }}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Dialog Rejeitar */}
    <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Recusar Matrícula</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja recusar a solicitação de <strong>{matricula?.aluno?.nome_completo}</strong>? Essa ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRejectDialogOpen(false)} disabled={rejeitarMutation.isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => rejeitarMutation.mutate()} disabled={rejeitarMutation.isPending}>
            {rejeitarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Sim, Recusar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
};

const Matriculas = () => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("todas");
  const [selectedMatricula, setSelectedMatricula] = useState<any>(null);

  const navigate = useNavigate();
  const { currentUnidade } = useUnidade();

  const { data: matriculas, isLoading } = useQuery({
    queryKey: ["matriculas-premium"],
    queryFn: matriculasService.fetchAll,
  });

  const filteredData = useMemo(() => {
    if (!matriculas) return [];
    
    return matriculas.filter((m: any) => {
      // Tab filter
      if (activeTab !== "todas" && m.status !== activeTab) return false;
      
      // Search filter
      if (search) {
        const query = search.toLowerCase();
        const nomeAluno = m.aluno?.nome_completo?.toLowerCase() || "";
        const nomeTurma = m.turma?.nome?.toLowerCase() || "";
        const nomeAtividade = m.turma?.atividade?.nome?.toLowerCase() || "";
        
        return nomeAluno.includes(query) || nomeTurma.includes(query) || nomeAtividade.includes(query);
      }
      
      return true;
    });
  }, [matriculas, search, activeTab]);

  const handleWhatsApp = (e: React.MouseEvent, matricula: any) => {
    e.stopPropagation();
    const phone = matricula.aluno?.responsavel?.telefone?.replace(/\D/g, "");
    if (!phone) {
       alert("Responsável não possui telefone cadastrado.");
       return;
    }
    const cleanPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const msg = encodeURIComponent(`Olá ${matricula.aluno?.responsavel?.nome_completo || ''}, falo de ${currentUnidade?.nome || 'nossa Unidade'} sobre a matrícula de ${matricula.aluno?.nome_completo}.`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 lg:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Options */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Matrículas</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Gestão centralizada de alunos e inscrições
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/direcao/matriculas/importar')}
            className="gap-2 h-11 px-4"
          >
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button
            onClick={() => navigate('/direcao/pre-cadastro')}
            className="gap-2 h-11 px-6 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            Nova Matrícula
          </Button>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4 bg-muted/30 p-2 rounded-2xl border border-primary/5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="bg-transparent h-11">
              <TabsTrigger value="todas" className="rounded-xl px-4 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Todas</TabsTrigger>
              <TabsTrigger value="ativa" className="rounded-xl px-4 font-bold data-[state=active]:bg-green-500/10 data-[state=active]:text-green-600">Ativas</TabsTrigger>
              <TabsTrigger value="pendente" className="rounded-xl px-4 font-bold data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-600">Pendentes</TabsTrigger>
              <TabsTrigger value="cancelada" className="rounded-xl px-4 font-bold data-[state=active]:bg-red-500/10 data-[state=active]:text-red-600">Canceladas</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input 
              placeholder="Buscar por aluno, turma ou atividade..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-background/50 border-primary/10 focus-visible:ring-primary/20 rounded-xl"
            />
          </div>
        </div>

        {/* Data Table / List View */}
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Aluno</th>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Turma / Atividade</th>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Data</th>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-6 py-4"><Skeleton className="h-8 w-full rounded-xl" /></td>
                    </tr>
                  ))
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <p className="font-bold">Nenhuma matrícula encontrada.</p>
                      <p className="text-sm">Mude seus filtros ou busque por outro termo.</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((m: any) => (
                    <tr 
                      key={m.id} 
                      className="hover:bg-primary/[0.02] transition-colors cursor-pointer group"
                      onClick={() => setSelectedMatricula(m)}
                    >
                      <td className="px-6 py-4">
                        <Badge className={cn("text-[10px] uppercase font-medium tracking-wide border-none px-2 py-1", getStatusColor(m.status))}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-primary/10">
                            <AvatarImage src={m.aluno?.foto_url} />
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                              {m.aluno?.nome_completo?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{m.aluno?.nome_completo}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate">
                              {m.aluno?.responsavel?.nome_completo || "Sem Responsável"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <p className="font-bold text-sm text-foreground">{m.turma?.nome}</p>
                        <p className="text-[10px] text-primary/70 font-medium mt-0.5">{m.turma?.atividade?.nome}</p>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground font-medium">
                        {m.data_inicio ? format(new Date(m.data_inicio), "dd/MM/yyyy") : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-[#25D366] hover:bg-[#25D366]/10"
                            onClick={(e) => handleWhatsApp(e, m)}
                            title="WhatsApp"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            title="Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-primary/5">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="p-4 space-y-3">
                  <div className="flex justify-between items-center"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-16" /></div>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-8 w-1/2" />
                </div>
              ))
            ) : filteredData.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <p className="font-bold">Nenhuma matrícula encontrada.</p>
              </div>
            ) : (
              filteredData.map((m: any) => (
                <div 
                  key={m.id} 
                  className="p-4 space-y-4 hover:bg-primary/[0.02] active:bg-primary/[0.05] transition-colors"
                  onClick={() => setSelectedMatricula(m)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-primary/10">
                        <AvatarImage src={m.aluno?.foto_url} />
                        <AvatarFallback className="bg-primary/5 text-primary text-base font-bold">
                          {m.aluno?.nome_completo?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground leading-tight">{m.aluno?.nome_completo}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide mt-0.5">
                          Início: {m.data_inicio ? format(new Date(m.data_inicio), "dd/MM/yyyy") : "-"}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn("text-[9px] uppercase font-semibold border-none h-5 px-1.5", getStatusColor(m.status))}>
                      {m.status}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/20 border border-primary/5 flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium uppercase tracking-tighter">Atividade</span>
                      <span className="font-bold text-primary">{m.turma?.atividade?.nome}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-primary/5 pt-1 mt-1">
                      <span className="text-muted-foreground font-medium uppercase tracking-tighter">Turma</span>
                      <span className="font-bold text-foreground">{m.turma?.nome}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button 
                      variant="secondary" 
                      className="flex-1 h-10 gap-2 font-bold bg-primary/10 hover:bg-primary/20 text-primary border-none"
                    >
                      <Eye className="h-4 w-4" />
                      Visualizar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/10"
                      onClick={(e) => handleWhatsApp(e, m)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <DetalhesMatriculaSheet 
        matricula={selectedMatricula} 
        open={!!selectedMatricula} 
        onOpenChange={(open: boolean) => !open && setSelectedMatricula(null)} 
      />
    </DashboardLayout>
  );
};

export default Matriculas;
