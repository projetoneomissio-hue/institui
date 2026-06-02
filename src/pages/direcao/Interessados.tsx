import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { solicitacoesService } from "@/services/solicitacoes.service";
import { alunosService } from "@/services/alunos.service";
import { infinitePayService } from "@/services/infinitepay.service";
import { Link, Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
    Phone,
    UserPlus,
    Search,
    Filter,
    MoreHorizontal,
    Calendar,
    GraduationCap,
    School,
    HeartPulse,
    Trash2,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { useUnidade } from "@/contexts/UnidadeContext";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Interessados() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { currentUnidade } = useUnidade();
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("todos");
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
    const [checkoutLinkDialog, setCheckoutLinkDialog] = useState<{open: boolean, link: string | null, loading: boolean, leadDetails: any}>({
        open: false,
        link: null,
        loading: false,
        leadDetails: null
    });

    const [responsavelNome, setResponsavelNome] = useState("");
    const [responsavelEmail, setResponsavelEmail] = useState("");
    const [isExistingResp, setIsExistingResp] = useState(true);
    const [isCheckingResp, setIsCheckingResp] = useState(false);
    const [isentarTaxa, setIsentarTaxa] = useState(false);

    const [completarFichaOpen, setCompletarFichaOpen] = useState(false);
    const [fichaLead, setFichaLead] = useState<any>(null);
    const [fichaData, setFichaData] = useState({ escola: "", serie_ano: "", cpf_responsavel: "" });

    const { data: leads, isLoading } = useQuery({
        queryKey: ["direcao-interessados"],
        queryFn: () => solicitacoesService.fetchAll(),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: any }) =>
            solicitacoesService.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["direcao-interessados"] });
            queryClient.invalidateQueries({ queryKey: ["management-leads-counts"] });
            queryClient.invalidateQueries({ queryKey: ["management-leads-recentes"] });
            toast({ title: "Status atualizado com sucesso!" });
        },
        onError: () => {
            toast({ title: "Erro ao atualizar status", variant: "destructive" });
        }
    });

    const convertMutation = useMutation({
        mutationFn: async ({ lead, manualIsento }: { lead: any, manualIsento: boolean }) => {
            if (!currentUnidade?.id) throw new Error("Unidade não selecionada.");

            const { data: { session } } = await supabase.auth.getSession();
            const adminId = session?.user?.id;

            const cleanCpfResp = lead.cpf_responsavel ? lead.cpf_responsavel.replace(/\D/g, "") : null;
            let finalRespId = null;
            let needsInvitation = false;

            const { data: existingProfile } = await supabase
                .from("profiles")
                .select("id")
                .or(`email.eq.${lead.email_responsavel || lead.whatsapp},cpf.eq.${cleanCpfResp}`)
                .maybeSingle();

            if (existingProfile) {
                finalRespId = existingProfile.id;
            } else {
                if (!responsavelNome || !responsavelEmail) {
                    throw new Error("Responsável não encontrado. Preencha o Nome e E-mail para prosseguir.");
                }
                needsInvitation = true;
                finalRespId = adminId;
            }

            const { aluno: existingAluno } = await alunosService.checkGlobalDuplicate({
                nome: lead.nome_completo,
                dataNascimento: lead.data_nascimento
            });

            let alunoId = existingAluno?.id;

            if (!alunoId) {
                const nomeFinal = lead.sobrenome
                    ? `${lead.nome_completo} ${lead.sobrenome}`.trim()
                    : lead.nome_completo;

                const { data: newAluno, error: alunoError } = await supabase.from("alunos").insert({
                    nome_completo: nomeFinal,
                    data_nascimento: lead.data_nascimento,
                    responsavel_id: finalRespId,
                    unidade_id: currentUnidade.id,
                    observacoes: lead.necessidades_especiais ? `Saúde/Neuro: ${lead.necessidades_especiais}` : ""
                } as any).select().single();

                if (alunoError) throw new Error("Erro ao criar aluno: " + alunoError.message);
                alunoId = newAluno.id;
            }

            if (needsInvitation) {
                const inviteToken = crypto.randomUUID();
                await supabase.from("invitations").insert({
                    email: responsavelEmail,
                    role: "responsavel",
                    status: "pending",
                    token: inviteToken,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                } as any);

                await supabase.functions.invoke('send-invitation-email', {
                  body: {
                    to: responsavelEmail,
                    inviteToken: inviteToken,
                    role: "responsavel",
                    origin: window.location.origin,
                    nomeResponsavel: responsavelNome
                  },
                });
            }

            let isFirstTime = false;

            if (!manualIsento) {
                const { data: matriculasAnteriores } = await supabase
                    .from("matriculas")
                    .select("id")
                    .eq("aluno_id", alunoId);

                isFirstTime = !matriculasAnteriores || matriculasAnteriores.length === 0;
            }

            let targetTurmaId = null;
            if (lead.atividade_desejada) {
                const buscaAmpla = lead.atividade_desejada.replace(/-/g, " ");
                const { data: atividade } = await supabase
                    .from("atividades")
                    .select("id")
                    .ilike("nome", `%${buscaAmpla}%`)
                    .eq("ativa", true)
                    .maybeSingle();

                if (atividade) {
                    const { data: turma } = await supabase
                        .from("turmas")
                        .select("id")
                        .eq("atividade_id", atividade.id)
                        .eq("ativa", true)
                        .limit(1)
                        .maybeSingle();

                    if (turma) targetTurmaId = turma.id;
                }
            }

            if (!targetTurmaId) {
                 const { data: fallbackTurma } = await supabase
                        .from("turmas")
                        .select("id")
                        .eq("ativa", true)
                        .limit(1)
                        .maybeSingle();
                 if (fallbackTurma) targetTurmaId = fallbackTurma.id;
            }

            let matriculaId = null;
            if (targetTurmaId) {
                const { data: newMatricula, error: matError } = await supabase.from("matriculas").insert({
                    aluno_id: alunoId,
                    turma_id: targetTurmaId,
                    status: "pendente",
                    data_inicio: new Date().toISOString().split("T")[0]
                }).select().single();

                if (!matError) matriculaId = newMatricula.id;
            }

            let pagamentoId = null;
            if (isFirstTime && matriculaId) {
                const { data: pagamentoData, error: pagError } = await supabase.from("pagamentos").insert({
                    matricula_id: matriculaId,
                    valor: 25.00,
                    data_vencimento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    status: "pendente",
                    referencia: "TAXA-MATRICULA",
                    unidade_id: currentUnidade.id
                }).select().single();

                if (!pagError) pagamentoId = pagamentoData.id;
            }

            await solicitacoesService.updateStatus(lead.id, "aprovada");

            return { alunoId, isFirstTime, matriculaCriada: !!matriculaId, pagamentoId, lead };

        },
        onSuccess: async (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["direcao-interessados"] });
            queryClient.invalidateQueries({ queryKey: ["solicitacoes"] });
            queryClient.invalidateQueries({ queryKey: ["alunos"] });
            setIsConvertDialogOpen(false);

            if (data.pagamentoId) {
                setCheckoutLinkDialog({ open: true, link: null, loading: true, leadDetails: data.lead });
                try {
                    const result = await infinitePayService.createCheckoutLink(data.pagamentoId);
                    setCheckoutLinkDialog({ open: true, link: result.gateway_url, loading: false, leadDetails: data.lead });
                } catch (e: any) {
                    toast({ title: "Lead convertido, mas erro no Pix", description: e.message, variant: "destructive" });
                    setCheckoutLinkDialog({ open: false, link: null, loading: false, leadDetails: null });
                }
            } else {
                if (data.isFirstTime === false) {
                     toast({
                        title: "Conversão Concluída (Isento)",
                        description: "O aluno já possuía uma matrícula. A taxa de matrícula de R$25 não será cobrada novamente.",
                        duration: 8000
                    });
                } else {
                     toast({
                        title: "Lead convertido!",
                        description: "Aluno convertido, mas não foi possível gerar a fatura. Você pode emiti-la futuramente na tela de Matrículas."
                    });
                }
            }
        },
        onError: (error: any) => {
            toast({ title: "Erro na conversão", description: error.message, variant: "destructive" });
        }
    });

    const completarFichaMutation = useMutation({
        mutationFn: async ({ id, escola, serie_ano, cpf_responsavel }: { id: string; escola: string; serie_ano: string; cpf_responsavel: string }) => {
            const { error } = await supabase
                .from("solicitacoes_matricula")
                .update({ escola: escola || null, serie_ano: serie_ano || null, cpf_responsavel: cpf_responsavel || null, status: "pendente" })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["direcao-interessados"] });
            queryClient.invalidateQueries({ queryKey: ["management-leads-counts"] });
            toast({ title: "Ficha avançada!", description: "Lead movido para Ficha Completa." });
            setCompletarFichaOpen(false);
            setFichaLead(null);
            setFichaData({ escola: "", serie_ano: "", cpf_responsavel: "" });
        },
        onError: () => toast({ title: "Erro ao atualizar ficha", variant: "destructive" }),
    });

    const filteredLeads = leads?.filter(lead => {
        const matchesSearch = lead.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
                             lead.sobrenome?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === "todos" || lead.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleWhatsApp = (lead: any) => {
        const cleanPhone = lead.whatsapp.replace(/\D/g, "");
        const message = `Olá ${lead.nome_completo}! Recebemos seu interesse em nosso projeto (${lead.atividade_desejada || "Geral"}). Podemos conversar?`;
        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "interessado": return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-none font-semibold text-[10px]">PASSO 1</Badge>;
            case "pendente": return <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-none font-semibold text-[10px]">FICHA COMPLETA</Badge>;
            case "aprovada": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-none font-semibold text-[10px]">CONVERTIDO</Badge>;
            case "rejeitada": return <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-none font-semibold text-[10px]">REJEITADO</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-background p-6 lg:p-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Gestão de <span className="text-primary">Interessados</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Acompanhamento de Leads e Solicitações de Matrícula
                        </p>
                    </div>
                </div>

                {/* Pipeline Visual */}
                {!isLoading && leads && leads.length > 0 && (() => {
                    const qtdInteressado = leads.filter(l => l.status === "interessado").length;
                    const qtdPendente = leads.filter(l => l.status === "pendente").length;
                    const qtdAprovada = leads.filter(l => l.status === "aprovada").length;
                    const total = leads.length;
                    return (
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: "Passo 1 · Lead", value: qtdInteressado, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", bar: "bg-blue-500", pct: total > 0 ? (qtdInteressado / total) * 100 : 0 },
                                { label: "Ficha Completa", value: qtdPendente, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", bar: "bg-amber-400", pct: total > 0 ? (qtdPendente / total) * 100 : 0 },
                                { label: "Convertidos", value: qtdAprovada, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", bar: "bg-emerald-500", pct: total > 0 ? (qtdAprovada / total) * 100 : 0 },
                            ].map((stage) => (
                                <div key={stage.label} className={`rounded-xl p-4 ${stage.bg} border border-border space-y-2`}>
                                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${stage.color}`}>{stage.label}</p>
                                    <p className={`text-3xl font-bold ${stage.color}`}>{stage.value}</p>
                                    <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${stage.bar} transition-all duration-700`} style={{ width: `${stage.pct}%` }} />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">{Math.round(stage.pct)}% do total</p>
                                </div>
                            ))}
                        </div>
                    );
                })()}

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome..."
                            className="pl-10 h-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={filterStatus === "todos" ? "default" : "outline"}
                            className="flex-1 h-10 font-semibold text-xs"
                            onClick={() => setFilterStatus("todos")}
                        >
                            Todos
                        </Button>
                        <Button
                            variant={filterStatus === "interessado" ? "default" : "outline"}
                            className={`flex-1 h-10 font-semibold text-xs ${filterStatus === "interessado" ? "bg-blue-600 hover:bg-blue-700 border-0" : ""}`}
                            onClick={() => setFilterStatus("interessado")}
                        >
                            Leads
                        </Button>
                        <Button
                            variant={filterStatus === "pendente" ? "default" : "outline"}
                            className={`flex-1 h-10 font-semibold text-xs ${filterStatus === "pendente" ? "bg-amber-500 hover:bg-amber-600 text-white border-0" : ""}`}
                            onClick={() => setFilterStatus("pendente")}
                        >
                            Fichas
                        </Button>
                    </div>
                </div>

                {/* Leads Table */}
                <Card className="p-0 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-border">
                                <TableHead className="w-[300px] font-semibold uppercase text-[10px] tracking-wide text-muted-foreground py-4 pl-6">Aluno / Inscrição</TableHead>
                                <TableHead className="font-semibold uppercase text-[10px] tracking-wide text-muted-foreground">Atividade</TableHead>
                                <TableHead className="font-semibold uppercase text-[10px] tracking-wide text-muted-foreground">Status</TableHead>
                                <TableHead className="font-semibold uppercase text-[10px] tracking-wide text-muted-foreground text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array(6).fill(0).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={4} className="p-4">
                                            <div className="h-12 w-full bg-muted animate-pulse rounded-lg" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : filteredLeads && filteredLeads.length > 0 ? (
                                filteredLeads.map((lead) => (
                                    <TableRow key={lead.id} className="group hover:bg-muted/30 border-border transition-colors">
                                        <TableCell className="py-4 pl-6">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-9 w-9 rounded-xl border border-border">
                                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm rounded-xl">
                                                        {lead.nome_completo[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <p className="font-semibold text-foreground text-sm leading-tight">
                                                        {lead.nome_completo} {lead.sobrenome && <span className="text-muted-foreground font-normal">{lead.sobrenome}</span>}
                                                    </p>
                                                    <span className="text-[10px] text-muted-foreground mt-0.5">
                                                        {format(new Date(lead.created_at), "dd 'de' MMMM", { locale: ptBR })}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] font-medium py-0 px-2 h-5">
                                                        {lead.atividade_desejada || "Geral"}
                                                    </Badge>
                                                    {lead.necessidades_especiais && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <HeartPulse className="h-3.5 w-3.5 text-amber-500" />
                                                                </TooltipTrigger>
                                                                <TooltipContent side="right" className="bg-amber-50 border-amber-200 text-amber-700 text-[10px] font-medium p-2">
                                                                    {lead.necessidades_especiais}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Calendar className="h-2.5 w-2.5" />
                                                    {format(new Date(lead.data_nascimento), "dd/MM/yyyy")}
                                                </p>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex flex-col gap-1.5 min-w-[120px]">
                                                {getStatusBadge(lead.status)}
                                                {lead.escola && (
                                                    <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                                        {lead.escola}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                className="h-8 w-8 bg-[#25D366]/5 border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all"
                                                                onClick={() => handleWhatsApp(lead)}
                                                            >
                                                                <Phone className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>WhatsApp</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 p-1 rounded-xl">
                                                        {lead.status === "interessado" && (
                                                            <DropdownMenuItem
                                                                className="gap-2 font-medium text-xs p-2 rounded-lg text-blue-600 focus:text-blue-600 focus:bg-blue-50"
                                                                onClick={() => {
                                                                    setFichaLead(lead);
                                                                    setFichaData({
                                                                        escola: lead.escola || "",
                                                                        serie_ano: lead.serie_ano || "",
                                                                        cpf_responsavel: lead.cpf_responsavel || "",
                                                                    });
                                                                    setCompletarFichaOpen(true);
                                                                }}
                                                            >
                                                                <School className="h-4 w-4" /> Completar Ficha
                                                            </DropdownMenuItem>
                                                        )}
                                                        {lead.status !== "aprovada" && (
                                                            <DropdownMenuItem
                                                                className="gap-2 font-medium text-xs p-2 rounded-lg text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"
                                                                onClick={async () => {
                                                                    setSelectedLead(lead);
                                                                    setIsConvertDialogOpen(true);

                                                                    setIsCheckingResp(true);
                                                                    const cleanCpf = lead.cpf_responsavel?.replace(/\D/g, "");
                                                                    const { data: profile } = await supabase
                                                                        .from("profiles")
                                                                        .select("id, nome_completo, email")
                                                                        .or(`email.eq.${lead.email_responsavel || ""},cpf.eq.${cleanCpf || "NONE"}`)
                                                                        .maybeSingle();

                                                                    if (profile) {
                                                                        setIsExistingResp(true);
                                                                    } else {
                                                                        setIsExistingResp(false);
                                                                        setResponsavelNome(lead.nome_responsavel || "");
                                                                        setResponsavelEmail(lead.email_responsavel || "");
                                                                    }
                                                                    setIsCheckingResp(false);
                                                                }}
                                                            >
                                                                <UserPlus className="h-4 w-4" /> Converter Aluno
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            className="gap-2 font-medium text-xs p-2 rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50"
                                                            onClick={async () => {
                                                                if (confirm("Deseja realmente rejeitar esta solicitação?")) {
                                                                    await solicitacoesService.updateStatus(lead.id, "rejeitada");
                                                                    queryClient.invalidateQueries({ queryKey: ["direcao-interessados"] });
                                                                    toast({ title: "Solicitação rejeitada" });
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" /> Rejeitar Lead
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <Filter className="h-10 w-10" />
                                            <p className="text-xs text-muted-foreground">Nenhum registro encontrado</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* Convert Dialog */}
            <Dialog open={isConvertDialogOpen} onOpenChange={(open) => {
                setIsConvertDialogOpen(open);
                if (!open) {
                    setResponsavelNome("");
                    setResponsavelEmail("");
                    setIsExistingResp(true);
                    setIsentarTaxa(false);
                }
            }}>
                <DialogContent className="max-w-md rounded-2xl overflow-hidden p-0">
                    <div className="h-1.5 w-full bg-emerald-500" />
                    <div className="p-6">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-3">
                                <GraduationCap className="h-5 w-5 text-emerald-500" />
                                Converter em <span className="text-emerald-500">Aluno</span>
                            </DialogTitle>
                            <DialogDescription className="mt-2">
                                Você está prestes a converter <strong>{selectedLead?.nome_completo}</strong> em um aluno registrado no sistema.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="my-5 p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span className="font-medium">Aluno</span>
                                <span className="text-foreground font-semibold">{selectedLead?.nome_completo} {selectedLead?.sobrenome}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span className="font-medium">Atividade</span>
                                <Badge variant="secondary" className="bg-primary/10 text-primary h-4 text-[9px] font-semibold">{selectedLead?.atividade_desejada || "Geral"}</Badge>
                            </div>
                        </div>

                        {!isExistingResp && (
                            <div className="mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 space-y-4 animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 text-amber-600 font-semibold text-xs">
                                    <UserPlus className="h-4 w-4" />
                                    Novo Responsável Detectado
                                </div>
                                {isCheckingResp ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground font-medium px-1">Nome Completo do Pai/Mãe</label>
                                            <Input
                                                placeholder="Nome Completo"
                                                value={responsavelNome}
                                                onChange={(e) => setResponsavelNome(e.target.value)}
                                                className="h-10"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground font-medium px-1">E-mail para Convite</label>
                                            <Input
                                                placeholder="email@exemplo.com"
                                                value={responsavelEmail}
                                                onChange={(e) => setResponsavelEmail(e.target.value)}
                                                className="h-10"
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground px-1">
                                            * Criaremos um convite automático para que o responsável acesse o sistema.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <label className="flex items-start gap-3 mt-4 text-sm font-medium text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border cursor-pointer hover:bg-muted/50 transition-colors">
                            <input
                                type="checkbox"
                                className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                                checked={isentarTaxa}
                                onChange={(e) => setIsentarTaxa(e.target.checked)}
                            />
                            <div>
                                <span className="text-foreground block mb-0.5 font-semibold">Isentar Taxa de Matrícula</span>
                                <span className="font-normal opacity-70 text-[11px] leading-tight block">
                                    Marque se o aluno já for matriculado em outro projeto ou se possuir bolsa integral.
                                </span>
                            </div>
                        </label>

                        <DialogFooter className="flex gap-2 mt-5">
                            <Button variant="outline" onClick={() => setIsConvertDialogOpen(false)} className="flex-1 h-11 rounded-xl">
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-semibold h-11 rounded-xl"
                                onClick={() => {
                                    if (!isExistingResp && (!responsavelNome || !responsavelEmail)) {
                                        toast({
                                            variant: "destructive",
                                            title: "Atenção",
                                            description: "Preencha o nome e e-mail do responsável."
                                        });
                                        return;
                                    }
                                    convertMutation.mutate({ lead: selectedLead, manualIsento: isentarTaxa });
                                }}
                                disabled={convertMutation.isPending || isCheckingResp}
                            >
                                {convertMutation.isPending ? "Processando..." : "Confirmar Conversão"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Checkout Link Dialog */}
            <Dialog
                open={checkoutLinkDialog.open}
                onOpenChange={(open) => !open && setCheckoutLinkDialog(prev => ({ ...prev, open: false }))}
            >
                <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
                    <div className="h-1.5 w-full bg-primary" />
                    <div className="p-6 text-center space-y-5">
                        <div className="mx-auto w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                        </div>

                        <div>
                            <DialogTitle className="text-xl font-bold text-foreground">
                                Matrícula Aceita!
                            </DialogTitle>
                            <DialogDescription className="text-sm mt-1.5">
                                O aluno foi registrado com sucesso. A taxa de matrícula no valor de <strong>R$ 25,00</strong> foi gerada.
                            </DialogDescription>
                        </div>

                        <div className="p-4 bg-muted/30 rounded-xl border border-border">
                            {checkoutLinkDialog.loading ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-8 w-full rounded-xl" />
                                    <p className="text-xs text-muted-foreground animate-pulse">Gerando link de pagamento...</p>
                                </div>
                            ) : checkoutLinkDialog.link ? (
                                <div className="space-y-3">
                                    <div className="flex bg-background border border-border rounded-lg p-2 items-center gap-2">
                                        <Link className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
                                        <input
                                            readOnly
                                            value={checkoutLinkDialog.link}
                                            className="bg-transparent border-none flex-1 text-xs outline-none truncate font-mono text-muted-foreground"
                                        />
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-8 w-8 shrink-0"
                                            onClick={() => {
                                                navigator.clipboard.writeText(checkoutLinkDialog.link || "");
                                                toast({ title: "Link Copiado!" });
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Button
                                        className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white font-semibold text-xs h-11 rounded-xl gap-2"
                                        onClick={() => {
                                            const lead = checkoutLinkDialog.leadDetails;
                                            const cleanPhone = lead?.whatsapp?.replace(/\D/g, "");
                                            if (!cleanPhone) return;
                                            const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                                            const msg = encodeURIComponent(`Olá ${lead.nome_responsavel || lead.nome_completo}! Parabéns, a matrícula de ${lead.nome_completo} foi aprovada em ${currentUnidade?.nome || 'nossa Unidade'} 🎉\n\nPara concluir o ingresso na modalidade de ${lead.atividade_desejada || 'Geral'}, você precisa realizar o pagamento da *Taxa de Matrícula (R$ 25,00)*.\n\nAcesse o link seguro a seguir para pagar via Pix ou Cartão:\n${checkoutLinkDialog.link}\n\nApós o pagamento o acesso ao sistema será liberado automaticamente!`);
                                            window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
                                            setCheckoutLinkDialog(prev => ({ ...prev, open: false }));
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                                        Enviar Cobrança via WhatsApp
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-sm font-medium text-destructive">Não foi possível gerar o link de pagamento. Acesse o menu Financeiro.</p>
                            )}
                        </div>

                        <Button variant="ghost" className="w-full text-xs font-medium" onClick={() => setCheckoutLinkDialog(prev => ({ ...prev, open: false }))}>
                            Fechar e Continuar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Completar Ficha Dialog */}
            <Dialog open={completarFichaOpen} onOpenChange={(open) => {
                setCompletarFichaOpen(open);
                if (!open) { setFichaLead(null); setFichaData({ escola: "", serie_ano: "", cpf_responsavel: "" }); }
            }}>
                <DialogContent className="max-w-md rounded-2xl overflow-hidden p-0">
                    <div className="h-1.5 w-full bg-blue-500" />
                    <div className="p-6 space-y-5">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold flex items-center gap-3">
                                <School className="h-5 w-5 text-blue-500" />
                                Completar <span className="text-blue-500">Ficha</span>
                            </DialogTitle>
                            <DialogDescription>
                                Preencha os dados complementares de <strong>{fichaLead?.nome_completo}</strong> para avançar para "Ficha Completa".
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground font-medium px-1">Escola de Origem</label>
                                <Input
                                    placeholder="Ex: E.E. João da Silva"
                                    value={fichaData.escola}
                                    onChange={(e) => setFichaData(prev => ({ ...prev, escola: e.target.value }))}
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground font-medium px-1">Série / Ano</label>
                                <Input
                                    placeholder="Ex: 5º ano, 2º EM"
                                    value={fichaData.serie_ano}
                                    onChange={(e) => setFichaData(prev => ({ ...prev, serie_ano: e.target.value }))}
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground font-medium px-1">CPF do Responsável</label>
                                <Input
                                    placeholder="000.000.000-00"
                                    value={fichaData.cpf_responsavel}
                                    onChange={(e) => setFichaData(prev => ({ ...prev, cpf_responsavel: e.target.value }))}
                                    className="h-10"
                                />
                            </div>
                        </div>

                        <DialogFooter className="flex gap-2">
                            <Button variant="outline" onClick={() => setCompletarFichaOpen(false)} className="flex-1 font-semibold h-11 rounded-xl">
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-700 font-semibold h-11 rounded-xl"
                                disabled={completarFichaMutation.isPending}
                                onClick={() => completarFichaMutation.mutate({ id: fichaLead.id, ...fichaData })}
                            >
                                {completarFichaMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Avançar para Ficha Completa
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
