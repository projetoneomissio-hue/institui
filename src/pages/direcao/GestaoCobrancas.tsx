import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Link as LinkIcon, CheckCircle2, MessageCircle, AlertCircle, DollarSign, Filter, X, Copy, Mail, Phone, Clock, Pencil, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnidade } from "@/contexts/UnidadeContext";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { infinitePayService } from "@/services/infinitepay.service";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { handleError } from "@/utils/error-handler";
import { AlunoFormModal } from "@/components/alunos/AlunoFormModal";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const GestaoCobrancas = () => {
    const { currentUnidade } = useUnidade();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // States
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("todos");
    const [atividadeFilter, setAtividadeFilter] = useState("todas");
    const [turmaFilter, setTurmaFilter] = useState("todas");
    const [baixaManualOpen, setBaixaManualOpen] = useState(false);
    const [selectedPagamento, setSelectedPagamento] = useState<any>(null);
    const [formaPagamentoBaixa, setFormaPagamentoBaixa] = useState("");
    const [sendingEmail, setSendingEmail] = useState<string | null>(null);

    // Estado do modal de edição de alunos
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [alunoToEdit, setAlunoToEdit] = useState<any>(null);

    // Buscar pagamentos com dados completos
    const { data: pagamentos, isLoading } = useQuery({
        queryKey: ["gestao-cobrancas", currentUnidade?.id],
        queryFn: async () => {
            if (!currentUnidade?.id) return [];

            const { data, error } = await supabase
                .from("pagamentos")
                .select(`
                    *,
                    matricula:matriculas(
                        aluno:alunos(
                            id,
                            nome_completo,
                            responsavel:profiles!responsavel_id(nome_completo, telefone, email)
                        ),
                        turma:turmas(
                            id,
                            nome,
                            atividade:atividades(id, nome)
                        )
                    )
                `)
                .eq("unidade_id", currentUnidade.id)
                .order("status", { ascending: true }) // pendente antes de pago
                .order("data_vencimento", { ascending: true })
                .limit(500);

            if (error) throw error;
            return data || [];
        },
        enabled: !!currentUnidade?.id
    });

    // Gerar Link InfinitePay
    const gerarLinkMutation = useMutation({
        mutationFn: async (pagamentoId: string) => {
            return await infinitePayService.createCheckoutLink(pagamentoId);
        },
        onSuccess: (data, pagamentoId) => {
            toast({ title: "✅ Link gerado com sucesso!", description: "Agora clique no botão verde do WhatsApp para enviar." });

            // Atualizar o cache otimisticamente para o botão mudar na hora
            queryClient.setQueryData(["gestao-cobrancas", currentUnidade?.id], (old: any[]) => {
                if (!old) return old;
                return old.map(p =>
                    p.id === pagamentoId
                        ? { ...p, gateway_url: data?.gateway_url || "link-gerado" }
                        : p
                );
            });

            // Também invalidar para que um futuro refetch traga o gateway_url do banco
            queryClient.invalidateQueries({ queryKey: ["gestao-cobrancas"] });
        },
        onError: (error: any) => {
            toast({ title: "Erro ao gerar link", description: error.message, variant: "destructive" });
        }
    });

    // Baixa Manual
    const baixaManualMutation = useMutation({
        mutationFn: async () => {
            if (!selectedPagamento) return;
            const isConfirmando = selectedPagamento.status === "aguardando_confirmacao";
            const formaFinal = isConfirmando
                ? selectedPagamento.forma_pagamento
                : (formaPagamentoBaixa || "Dinheiro");
            const { error } = await supabase
                .from("pagamentos")
                .update({
                    status: "pago",
                    forma_pagamento: formaFinal,
                    data_pagamento: new Date().toISOString().split("T")[0],
                    observacoes: isConfirmando
                        ? `Pagamento confirmado pela diretoria. Forma informada pelo responsável: ${selectedPagamento.forma_pagamento || "não informada"}.`
                        : `Baixa manual. Forma: ${formaFinal}.`
                })
                .eq("id", selectedPagamento.id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast({ title: "✅ Pagamento confirmado!" });
            queryClient.invalidateQueries({ queryKey: ["gestao-cobrancas"] });
            queryClient.invalidateQueries({ queryKey: ["pagamentos-responsavel"] });
            queryClient.invalidateQueries({ queryKey: ["pagamentos-pendentes"] });
            queryClient.invalidateQueries({ queryKey: ["management-kpis"] });
            queryClient.invalidateQueries({ queryKey: ["management-fluxo-caixa"] });
            queryClient.invalidateQueries({ queryKey: ["management-receita-atividade"] });
            queryClient.invalidateQueries({ queryKey: ["management-inadimplentes"] });
            setBaixaManualOpen(false);
            setSelectedPagamento(null);
            setFormaPagamentoBaixa("");
        },
        onError: (error: any) => {
            toast({ title: "Erro na baixa", description: error.message, variant: "destructive" });
        }
    });

    const handleMandarWhatsApp = (pag: any) => {
        const telefone = pag.matricula?.aluno?.responsavel?.telefone?.replace(/\D/g, '') || "";
        const nomeResp = pag.matricula?.aluno?.responsavel?.nome_completo?.split(" ")[0] || "Responsável";
        const nomeAluno = pag.matricula?.aluno?.nome_completo || "Aluno";
        const linkToUse = pag.gateway_url || window.location.origin;
        const textMsg = `Olá ${nomeResp}! Aqui é de ${currentUnidade?.nome || 'nossa Unidade'}. Segue o link para pagamento (${pag.descricao || "Mensalidade"}) de ${nomeAluno}: ${linkToUse}`;
        window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(textMsg)}`, '_blank');
    };

    const handleSendEmail = async (pag: any) => {
        try {
            setSendingEmail(pag.id);
            const dataPag = new Date(pag.data_vencimento);
            const diasAtraso = Math.floor((new Date().getTime() - dataPag.getTime()) / (1000 * 3600 * 24));

            const { error } = await supabase.functions.invoke("send-payment-reminder", {
                body: {
                    to: pag.matricula?.aluno?.responsavel?.email,
                    responsavelNome: pag.matricula?.aluno?.responsavel?.nome_completo,
                    alunoNome: pag.matricula?.aluno?.nome_completo,
                    atividadeNome: pag.matricula?.turma?.atividade?.nome,
                    turmaNome: pag.matricula?.turma?.nome,
                    valorDevido: pag.valor,
                    diasAtraso: diasAtraso > 0 ? diasAtraso : 0,
                    dataVencimento: format(dataPag, "dd/MM/yyyy", { locale: ptBR }),
                },
            });

            if (error) throw error;
            toast({ title: "Sucesso", description: "Email de cobrança enviado com sucesso" });
        } catch (error: any) {
            toast({ title: "Erro na entrega", description: "Não foi possível enviar o email de cobrança", variant: "destructive" });
        } finally {
            setSendingEmail(null);
        }
    };

    // Extrair listas para os filtros
    const atividades = useMemo(() => {
        const map = new Map<string, string>();
        pagamentos?.forEach(p => {
            const atv = p.matricula?.turma?.atividade;
            if (atv?.id && atv?.nome) map.set(atv.id, atv.nome);
        });
        return Array.from(map, ([id, nome]) => ({ id, nome }));
    }, [pagamentos]);

    const turmas = useMemo(() => {
        const map = new Map<string, string>();
        pagamentos?.forEach(p => {
            const t = p.matricula?.turma;
            if (t?.id && t?.nome) {
                if (atividadeFilter === "todas" || t.atividade?.id === atividadeFilter) {
                    map.set(t.id, t.nome);
                }
            }
        });
        return Array.from(map, ([id, nome]) => ({ id, nome }));
    }, [pagamentos, atividadeFilter]);

    // Filtragem
    const filteredPagamentos = useMemo(() => {
        return pagamentos?.filter(p => {
            const st = searchTerm.toLowerCase();
            const matchSearch = !st ||
                p.matricula?.aluno?.nome_completo?.toLowerCase().includes(st) ||
                p.matricula?.aluno?.responsavel?.nome_completo?.toLowerCase().includes(st) ||
                p.referencia?.toLowerCase().includes(st);

            const hoje = new Date();
            const vencido = p.status === "pendente" && new Date(p.data_vencimento) < hoje;
            const matchStatus = statusFilter === "todos" ||
                (statusFilter === "pendente" && p.status === "pendente" && !vencido) ||
                (statusFilter === "vencido" && vencido) ||
                (statusFilter === "pago" && p.status === "pago") ||
                (statusFilter === "aguardando" && p.status === "aguardando_confirmacao");

            const matchAtividade = atividadeFilter === "todas" || p.matricula?.turma?.atividade?.id === atividadeFilter;
            const matchTurma = turmaFilter === "todas" || p.matricula?.turma?.id === turmaFilter;

            return matchSearch && matchStatus && matchAtividade && matchTurma;
        }) || [];
    }, [pagamentos, searchTerm, statusFilter, atividadeFilter, turmaFilter]);

    // Métricas
    const totais = useMemo(() => {
        return filteredPagamentos.reduce((acc, curr) => {
            const vencido = curr.status === "pendente" && new Date(curr.data_vencimento) < new Date();
            if (curr.status === "pago") acc.recebido += Number(curr.valor);
            else if (curr.status === "aguardando_confirmacao") acc.pendente += Number(curr.valor);
            else if (vencido) {
                acc.vencido += Number(curr.valor);

                // Track unique defaulters correctly
                const alunoId = curr.matricula?.aluno?.id;
                if (alunoId && !acc.inadimplentesSet.has(alunoId)) {
                    acc.inadimplentesSet.add(alunoId);
                    acc.inadimplentesCount++;
                }

                const delay = Math.floor((new Date().getTime() - new Date(curr.data_vencimento).getTime()) / (1000 * 3600 * 24));
                if (delay > acc.maiorAtraso) acc.maiorAtraso = delay;
            }
            else if (curr.status === "pendente") acc.pendente += Number(curr.valor);
            return acc;
        }, { pendente: 0, vencido: 0, recebido: 0, inadimplentesCount: 0, maiorAtraso: 0, inadimplentesSet: new Set<string>() });
    }, [filteredPagamentos]);

    const pagamentosAguardando = useMemo(() => {
        return pagamentos?.filter(p => p.status === "aguardando_confirmacao") || [];
    }, [pagamentos]);

    const limparFiltros = () => {
        setSearchTerm("");
        setStatusFilter("todos");
        setAtividadeFilter("todas");
        setTurmaFilter("todas");
    };

    const hasActiveFilters = searchTerm || statusFilter !== "todos" || atividadeFilter !== "todas" || turmaFilter !== "todas";

    const handleExportCSV = () => {
        if (!filteredPagamentos || filteredPagamentos.length === 0) {
            toast({ title: "Aviso", description: "Nenhum dado para exportar com os filtros atuais." });
            return;
        }

        // Bom character to ensure Excel reads UTF-8 correctly
        const BOM = '\uFEFF';

        // CSV Headers
        const headers = [
            'ID/Referência', 'Aluno', 'CPF', 'Responsável',
            'Telefone Responsável', 'Atividade', 'Turma',
            'Vencimento', 'Data de Pagamento', 'Valor (R$)', 'Status', 'Gateway'
        ];

        // Mapear dados
        const rows = filteredPagamentos.map(pag => [
            pag.referencia || pag.id.slice(0, 8),
            pag.matricula?.aluno?.nome_completo || 'N/A',
            pag.matricula?.aluno?.cpf || 'N/A',
            pag.matricula?.aluno?.responsavel?.nome_completo || 'N/A',
            pag.matricula?.aluno?.responsavel?.telefone || 'N/A',
            pag.matricula?.turma?.atividade?.nome || 'N/A',
            pag.matricula?.turma?.nome || 'N/A',
            format(new Date(pag.data_vencimento), "dd/MM/yyyy"),
            pag.data_pagamento ? format(new Date(pag.data_pagamento), "dd/MM/yyyy") : 'N/A',
            Number(pag.valor).toFixed(2).replace('.', ','),
            pag.status,
            pag.gateway_url ? 'Link Gerado' : 'Sem Link'
        ]);

        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
        ].join('\n');

        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Cobrancas_${format(new Date(), "dd-MM-yyyy")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <DashboardLayout>
            <div className="p-4 lg:p-6 space-y-5">
                {/* Título */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Gestão de Cobranças</h1>
                        <p className="text-base text-muted-foreground mt-1">
                            Controle de Faturas, Links da InfinitePay e Recebimentos
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleExportCSV} className="border-primary/20 hover:bg-primary/5 transition-colors font-medium">
                        <Download className="mr-2 h-4 w-4 text-primary" />
                        Exportar Relatório (CSV)
                    </Button>
                </div>

                {/* Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Card className="border-indigo-200 dark:border-indigo-800">
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">A Receber</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                            <div className="text-2xl lg:text-3xl font-bold text-indigo-700 dark:text-indigo-300">
                                {totais.pendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-red-200 dark:border-red-800 border-2">
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
                                Dívida Total
                                {totais.vencido > 0 && <AlertCircle className="h-4 w-4 animate-pulse" />}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                            <div className="text-2xl lg:text-3xl font-bold text-red-700 dark:text-red-300">
                                {totais.vencido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50">
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
                                Inadimplentes
                                <Clock className="h-4 w-4" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 flex justify-between items-end">
                            <div>
                                <div className="text-2xl lg:text-3xl font-bold text-red-700 dark:text-red-300">
                                    {totais.inadimplentesCount}
                                </div>
                                <p className="text-xs text-red-600/70 font-semibold dark:text-red-400/70">alunos atrasados</p>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-red-700/80 dark:text-red-300/80">
                                    {totais.maiorAtraso} dias
                                </div>
                                <p className="text-[10px] text-red-600/70 uppercase font-semibold">Maior Atraso</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-green-200 dark:border-green-800">
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Recebido</CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                            <div className="text-2xl lg:text-3xl font-bold text-green-700 dark:text-green-300">
                                {totais.recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Banner Aguardando Confirmação */}
                {pagamentosAguardando.length > 0 && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border-2 border-blue-500/30">
                        <div className="h-9 w-9 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-foreground text-sm">
                                {pagamentosAguardando.length === 1
                                    ? "1 pagamento aguardando confirmação"
                                    : `${pagamentosAguardando.length} pagamentos aguardando confirmação`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Responsáveis avisaram que pagaram — confirme o recebimento para atualizar o status.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs font-bold"
                            onClick={() => setStatusFilter("aguardando")}
                        >
                            Ver Todos
                        </Button>
                    </div>
                )}

                {/* Filtros */}
                <div className="bg-card border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-base font-bold text-foreground">
                        <Filter className="h-5 w-5" />
                        Filtros
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-xs text-muted-foreground ml-auto h-8">
                                <X className="h-3 w-3 mr-1" /> Limpar
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Busca */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Nome do aluno ou responsável..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10 h-11 text-base"
                            />
                        </div>

                        {/* Status */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-11 text-base">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos" className="text-base">Todos os Status</SelectItem>
                                <SelectItem value="pendente" className="text-base">🟡 Pendente</SelectItem>
                                <SelectItem value="vencido" className="text-base">🔴 Vencido</SelectItem>
                                <SelectItem value="pago" className="text-base">🟢 Pago</SelectItem>
                                <SelectItem value="aguardando" className="text-base">🔵 Aguardando Confirmação</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Atividade */}
                        <Select value={atividadeFilter} onValueChange={(v) => { setAtividadeFilter(v); setTurmaFilter("todas"); }}>
                            <SelectTrigger className="h-11 text-base">
                                <SelectValue placeholder="Atividade" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todas" className="text-base">Todas as Atividades</SelectItem>
                                {atividades.map(a => (
                                    <SelectItem key={a.id} value={a.id} className="text-base">{a.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Turma */}
                        <Select value={turmaFilter} onValueChange={setTurmaFilter}>
                            <SelectTrigger className="h-11 text-base">
                                <SelectValue placeholder="Turma" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todas" className="text-base">Todas as Turmas</SelectItem>
                                {turmas.map(t => (
                                    <SelectItem key={t.id} value={t.id} className="text-base">{t.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Modal de Edição de Alunos */}
                <AlunoFormModal
                    open={editModalOpen}
                    onOpenChange={setEditModalOpen}
                    alunoToEdit={alunoToEdit}
                />

                {/* Tabela */}
                <div className="border rounded-xl overflow-hidden bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-base">
                            <thead>
                                <tr className="bg-muted/60 border-b text-left">
                                    <th className="px-4 py-3 font-bold text-muted-foreground text-sm uppercase tracking-wider">Aluno</th>
                                    <th className="px-4 py-3 font-bold text-muted-foreground text-sm uppercase tracking-wider hidden lg:table-cell">Atividade</th>
                                    <th className="px-4 py-3 font-bold text-muted-foreground text-sm uppercase tracking-wider hidden md:table-cell">Turma</th>
                                    <th className="px-4 py-3 font-bold text-muted-foreground text-sm uppercase tracking-wider hidden xl:table-cell">Responsável</th>
                                    <th className="px-4 py-3 font-bold text-muted-foreground text-sm uppercase tracking-wider">Vencimento</th>
                                    <th className="px-4 py-3 font-bold text-muted-foreground text-sm uppercase tracking-wider text-right">Valor</th>
                                    <th className="px-4 py-3 font-bold text-muted-foreground text-sm uppercase tracking-wider text-center">Status</th>
                                    <th className="px-4 py-3 font-bold text-muted-foreground text-sm uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-16">
                                            <Loader2 className="animate-spin h-8 w-8 text-primary mx-auto" />
                                            <p className="mt-3 text-muted-foreground text-base">Carregando faturas...</p>
                                        </td>
                                    </tr>
                                ) : filteredPagamentos.length > 0 ? (
                                    filteredPagamentos.map((pag, idx) => {
                                        const vencido = pag.status === "pendente" && new Date(pag.data_vencimento) < new Date();
                                        const nomeAluno = pag.matricula?.aluno?.nome_completo || "—";
                                        const nomeAtividade = pag.matricula?.turma?.atividade?.nome || "—";
                                        const nomeTurma = pag.matricula?.turma?.nome || "—";
                                        const nomeResp = pag.matricula?.aluno?.responsavel?.nome_completo || "—";

                                        return (
                                            <tr
                                                key={pag.id}
                                                className={cn(
                                                    "border-b last:border-b-0 transition-colors",
                                                    idx % 2 === 0 ? "bg-transparent" : "bg-muted/20",
                                                    pag.status === "pago" && "opacity-60",
                                                    vencido && "bg-red-50/50 dark:bg-red-950/10",
                                                    pag.status === "aguardando_confirmacao" && "bg-blue-50/30 dark:bg-blue-950/10"
                                                )}
                                            >
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => {
                                                            if (pag.matricula?.aluno) {
                                                                setAlunoToEdit(pag.matricula.aluno);
                                                                setEditModalOpen(true);
                                                            }
                                                        }}
                                                        className="font-semibold text-foreground hover:text-primary transition-colors text-left flex items-center gap-1.5 focus:outline-none"
                                                        title="Editar Cadastro do Aluno"
                                                    >
                                                        {nomeAluno}
                                                        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-primary" />
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{nomeAtividade}</td>
                                                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{nomeTurma}</td>
                                                <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground">{nomeResp}</td>
                                                <td className="px-4 py-3">
                                                    <span className={cn(
                                                        "font-medium",
                                                        vencido ? "text-red-600 dark:text-red-400 font-bold" : "text-foreground"
                                                    )}>
                                                        {format(new Date(pag.data_vencimento), "dd/MM/yyyy")}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="font-bold text-foreground text-lg">
                                                        {Number(pag.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        {pag.status === "pago" ? (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 text-sm font-bold">
                                                                <CheckCircle2 className="h-4 w-4" /> Pago
                                                            </span>
                                                        ) : pag.status === "aguardando_confirmacao" ? (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-sm font-bold">
                                                                <Clock className="h-4 w-4" /> Aguard. Confirmação
                                                            </span>
                                                        ) : vencido ? (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-sm font-bold animate-pulse">
                                                                <AlertCircle className="h-4 w-4" /> Vencido
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 text-sm font-bold">
                                                                Pendente
                                                            </span>
                                                        )}
                                                        {pag.ultimo_lembrete && (
                                                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400" title={`Último lembrete: ${format(new Date(pag.ultimo_lembrete), "dd/MM/yyyy HH:mm")}`}>
                                                                <Mail className="h-3 w-3" />
                                                                {formatDistanceToNow(new Date(pag.ultimo_lembrete), { addSuffix: true, locale: ptBR })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {pag.status === "aguardando_confirmacao" && (
                                                        <div className="flex items-center justify-end gap-1.5 flex-nowrap whitespace-nowrap">
                                                            {pag.matricula?.aluno?.responsavel?.telefone && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                                                                    onClick={() => window.open(`tel:${pag.matricula.aluno.responsavel.telefone}`)}
                                                                >
                                                                    <Phone className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                className="h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                                                                onClick={() => { setSelectedPagamento(pag); setBaixaManualOpen(true); }}
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirmar
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {pag.status === "pendente" && (
                                                        <div className="flex items-center justify-end gap-1.5 flex-nowrap whitespace-nowrap">
                                                            {/* Phone Button */}
                                                            {pag.matricula?.aluno?.responsavel?.telefone && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                                                                    onClick={() => window.open(`tel:${pag.matricula.aluno.responsavel.telefone}`)}
                                                                >
                                                                    <Phone className="h-4 w-4" />
                                                                </Button>
                                                            )}

                                                            {/* Email Button */}
                                                            {vencido && pag.matricula?.aluno?.responsavel?.email && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 shrink-0"
                                                                    onClick={() => handleSendEmail(pag)}
                                                                    disabled={sendingEmail === pag.id}
                                                                >
                                                                    {sendingEmail === pag.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                                                </Button>
                                                            )}

                                                            {!pag.gateway_url ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 px-2.5 text-xs font-bold shrink-0"
                                                                    disabled={gerarLinkMutation.isPending && gerarLinkMutation.variables === pag.id}
                                                                    onClick={() => gerarLinkMutation.mutate(pag.id)}
                                                                >
                                                                    {gerarLinkMutation.isPending && gerarLinkMutation.variables === pag.id
                                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        : <><LinkIcon className="h-3.5 w-3.5 mr-1.5" /> Gerar Link</>}
                                                                </Button>
                                                            ) : (
                                                                <>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-8 px-2.5 text-xs font-bold shrink-0"
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(pag.gateway_url);
                                                                            toast({ title: "📋 Link copiado!", description: "Cole onde quiser enviar." });
                                                                        }}
                                                                    >
                                                                        <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-8 px-2.5 text-xs font-bold bg-[#25D366] hover:bg-[#25D366]/90 text-white shrink-0"
                                                                        onClick={() => handleMandarWhatsApp(pag)}
                                                                    >
                                                                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
                                                                    </Button>
                                                                </>
                                                            )}
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                className="h-8 px-2.5 text-xs font-bold shrink-0 border border-secondary"
                                                                onClick={() => { setSelectedPagamento(pag); setBaixaManualOpen(true); }}
                                                            >
                                                                Baixar
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="text-center py-16">
                                            <DollarSign className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                                            <h3 className="text-lg font-bold text-foreground mt-3">Nenhuma fatura encontrada</h3>
                                            <p className="text-base text-muted-foreground mt-1">Tente ajustar os filtros acima.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Rodapé da tabela */}
                    {filteredPagamentos.length > 0 && (
                        <div className="border-t px-4 py-3 bg-muted/30 text-sm text-muted-foreground flex justify-between items-center">
                            <span>Mostrando <strong className="text-foreground">{filteredPagamentos.length}</strong> fatura(s)</span>
                            <span>
                                Total exibido: <strong className="text-foreground">
                                    {filteredPagamentos.reduce((s, p) => s + Number(p.valor), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </strong>
                            </span>
                        </div>
                    )}
                </div>

                {/* Dialog Baixa Manual */}
                <Dialog open={baixaManualOpen} onOpenChange={setBaixaManualOpen}>
                    <DialogContent className="sm:max-w-[450px]">
                        <DialogHeader>
                            <DialogTitle className="text-xl">
                                {selectedPagamento?.status === "aguardando_confirmacao"
                                    ? "Confirmar Recebimento"
                                    : "Confirmar Baixa Manual"}
                            </DialogTitle>
                            <DialogDescription className="text-base">
                                {selectedPagamento?.status === "aguardando_confirmacao"
                                    ? <>O responsável informou que pagou via <strong>{selectedPagamento?.forma_pagamento || "não informado"}</strong>.</>
                                    : <>Marcar pagamento de <strong>{selectedPagamento?.matricula?.aluno?.nome_completo}</strong> como pago.</>}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-3 space-y-3">
                            <div className="bg-muted p-4 rounded-lg flex justify-between font-bold text-xl">
                                <span>Valor:</span>
                                <span>{selectedPagamento ? Number(selectedPagamento.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00"}</span>
                            </div>
                            {selectedPagamento?.status !== "aguardando_confirmacao" && (
                                <div className="space-y-2">
                                    <label className="text-sm font-bold">Como foi pago?</label>
                                    <select
                                        value={formaPagamentoBaixa}
                                        onChange={(e) => setFormaPagamentoBaixa(e.target.value)}
                                        className="w-full h-11 px-3 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    >
                                        <option value="">Selecione a forma</option>
                                        <option value="Dinheiro">Dinheiro</option>
                                        <option value="Pix">Pix</option>
                                        <option value="Cartão de Débito">Cartão de Débito</option>
                                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                                        <option value="Transferência">Transferência</option>
                                        <option value="Boleto">Boleto</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => { setBaixaManualOpen(false); setFormaPagamentoBaixa(""); }} className="h-11 text-base">Cancelar</Button>
                            <Button
                                onClick={() => baixaManualMutation.mutate()}
                                disabled={baixaManualMutation.isPending}
                                className="h-11 text-base bg-green-600 hover:bg-green-700 text-white font-bold"
                            >
                                {baixaManualMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                ✅ Confirmar Pagamento
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
};

export default GestaoCobrancas;
