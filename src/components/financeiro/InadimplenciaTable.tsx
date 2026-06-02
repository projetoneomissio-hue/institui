import { useState } from "react";
import { Loader2, Send, QrCode, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useInadimplentes } from "@/hooks/useFinanceiro";
import { supabase } from "@/integrations/supabase/client";
import { generateWhatsAppLink, WhatsAppTemplates } from "@/utils/whatsapp";
import { infinitePayService } from "@/services/infinitepay.service";
import { contactsService } from "@/services/contacts.service";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const InadimplenciaTable = () => {
    const { toast } = useToast();
    const [sendingEmail, setSendingEmail] = useState<string | null>(null);
    const [generatingCharge, setGeneratingCharge] = useState<string | null>(null);
    const { data: inadimplentes, isLoading } = useInadimplentes();

    const handleGenerateCharge = async (pagamento: any) => {
        try {
            setGeneratingCharge(pagamento.id);

            // InfinitePay: busca tudo no servidor, só precisa do pagamentoId
            const result = await infinitePayService.createCheckoutLink(pagamento.id);

            if (result.success) {
                // Registrar log de contato AUTOMÁTICO
                await contactsService.create({
                    aluno_id: pagamento.matricula?.aluno?.id,
                    tipo: "cobranca",
                    descricao: `Cobrança InfinitePay (PIX/Cartão) gerada automaticamente. Valor: R$ ${parseFloat(pagamento.valor).toFixed(2)}`
                });

                toast({
                    title: "Cobrança Gerada!",
                    description: "O link de pagamento InfinitePay foi criado com sucesso.",
                });
                // Recarregar para mostrar o link novo
                window.location.reload();
            }

        } catch (error: any) {
            console.error("Erro ao gerar cobrança:", error);
            toast({
                title: "Erro ao gerar",
                description: error.message || "Falha na comunicação com InfinitePay.",
                variant: "destructive",
            });
        } finally {
            setGeneratingCharge(null);
        }
    };

    const handleSendReminder = async (pagamento: any) => {
        try {
            setSendingEmail(pagamento.id);

            const emailResponsavel = pagamento.matricula?.aluno?.responsavel?.email;

            if (!emailResponsavel) {
                toast({
                    title: "Email não encontrado",
                    description: "O responsável não possui email cadastrado.",
                    variant: "destructive",
                });
                return;
            }

            const hoje = new Date();
            const vencimento = new Date(pagamento.data_vencimento);
            const diffTime = Math.abs(hoje.getTime() - vencimento.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const { error } = await supabase.functions.invoke("send-payment-reminder", {
                body: {
                    to: emailResponsavel,
                    responsavelNome: pagamento.matricula?.aluno?.responsavel?.nome_completo || "Responsável",
                    alunoNome: pagamento.matricula?.aluno?.nome_completo || "Aluno",
                    atividadeNome: pagamento.matricula?.turma?.atividade?.nome || "Atividade",
                    turmaNome: pagamento.matricula?.turma?.nome || "Turma",
                    valorDevido: parseFloat(pagamento.valor),
                    diasAtraso: diffDays,
                    dataVencimento: new Date(pagamento.data_vencimento).toLocaleDateString("pt-BR"),
                },
            });

            if (error) throw error;

            // Registrar log de contato AUTOMÁTICO
            await contactsService.create({
                aluno_id: pagamento.matricula?.aluno?.id,
                tipo: "cobranca",
                descricao: `Lembrete de pagamento enviado por e-mail para ${emailResponsavel}.`
            });

            toast({
                title: "Lembrete enviado!",
                description: `Email enviado e log de contato registrado.`,
            });

        } catch (error: any) {
            console.error("Erro ao enviar lembrete:", error);
            toast({
                title: "Erro ao enviar",
                description: "Não foi possível enviar o lembrete. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setSendingEmail(null);
        }
    };

    const handleManualContact = async (alunoId: string, tipo: any, desc: string) => {
        try {
            await contactsService.create({
                aluno_id: alunoId,
                tipo: tipo,
                descricao: desc
            });
            toast({
                title: "Contato registrado",
                description: "O log foi salvo no histórico do aluno.",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro ao registrar",
                description: "Não foi possível salvar o log.",
                variant: "destructive"
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!inadimplentes?.length) {
        return <p className="text-sm text-muted-foreground text-center py-4">Nenhum pagamento em atraso.</p>;
    }

    return (
        <div className="relative w-full overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Responsável / Aluno</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-center">Vencimento</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Valor</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {inadimplentes.map((pagamento: any) => (
                            <tr key={pagamento.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <td className="p-4 align-middle">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-foreground">{pagamento.matricula?.aluno?.responsavel?.nome_completo || "Sem Responsável"}</span>
                                        <span className="text-[10px] text-muted-foreground">Aluno: {pagamento.matricula?.aluno?.nome_completo}</span>
                                        {pagamento.gateway_url && (
                                            <a href={pagamento.gateway_url} target="_blank" className="text-[10px] text-blue-500 underline mt-1 font-bold">
                                                Ver Link de Pagamento
                                            </a>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 align-middle text-center text-destructive font-bold text-xs">
                                    {new Date(pagamento.data_vencimento).toLocaleDateString("pt-BR")}
                                </td>
                                <td className="p-4 align-middle text-right font-bold text-foreground">
                                    R$ {parseFloat(pagamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 align-middle text-right flex justify-end gap-2">
                                    {/* Botão Gerar Cobrança (InfinitePay) */}
                                    {!pagamento.gateway_url && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 px-2 gap-2 text-purple-600 border-purple-200 bg-purple-50/50 hover:bg-purple-100"
                                                    disabled={generatingCharge === pagamento.id}
                                                >
                                                    {generatingCharge === pagamento.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <QrCode className="h-3 w-3" />}
                                                    <span className="hidden xl:inline">Gerar Link</span>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Gerar Link de Pagamento?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Isso criará um link de pagamento InfinitePay (PIX + Cartão) para o aluno.
                                                        O valor será de <strong>R$ {parseFloat(pagamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleGenerateCharge(pagamento)}>
                                                        Confirmar e Gerar
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-2 gap-2 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                                        onClick={() => handleSendReminder(pagamento)}
                                        disabled={sendingEmail === pagamento.id}
                                        title="Lembrete de Email"
                                    >
                                        {sendingEmail === pagamento.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Send className="h-3 w-3" />
                                        )}
                                        <span className="hidden xl:inline">Email</span>
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 w-8 p-0"
                                                title="Registrar Contato Manual"
                                            >
                                                <ClipboardList className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Registrar Contato</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Escolha o tipo de contato realizado com o responsável.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <div className="grid grid-cols-2 gap-2 py-4">
                                                <Button variant="outline" onClick={() => handleManualContact(pagamento.matricula.aluno.id, "ligacao", "Cobrança via ligação telefônica.")} className="font-bold">Ligação</Button>
                                                <Button variant="outline" onClick={() => handleManualContact(pagamento.matricula.aluno.id, "whatsapp", "Cobrança via mensagem WhatsApp.")} className="font-bold">WhatsApp</Button>
                                                <Button variant="outline" onClick={() => handleManualContact(pagamento.matricula.aluno.id, "reuniao", "Reunião presencial para tratar débitos.")} className="font-bold">Reunião</Button>
                                                <Button variant="outline" onClick={() => handleManualContact(pagamento.matricula.aluno.id, "cobranca", "Prometeu pagamento para os próximos dias.")} className="font-bold">Prometeu Pagar</Button>
                                            </div>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Fechar</AlertDialogCancel>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    {pagamento.matricula?.aluno?.responsavel?.telefone && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 text-emerald-600 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100"
                                            title="Cobrar no WhatsApp"
                                            onClick={async () => {
                                                const nomeResp = pagamento.matricula?.aluno?.responsavel?.nome_completo || "Responsável";
                                                const nomeAluno = pagamento.matricula?.aluno?.nome_completo || "Aluno";
                                                const dataVencimento = new Date(pagamento.data_vencimento);
                                                const mesRef = dataVencimento.toLocaleDateString("pt-BR", { month: 'long' });
                                                const valor = parseFloat(pagamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
                                                const linkBoleto = pagamento.gateway_url ? `\n\nLink para pagamento: ${pagamento.gateway_url}` : "";

                                                const link = generateWhatsAppLink(
                                                    pagamento.matricula.aluno.responsavel.telefone,
                                                    WhatsAppTemplates.cobranca(nomeResp, nomeAluno, mesRef, valor) + linkBoleto
                                                );

                                                // Registrar log automático ao abrir WhatsApp
                                                await handleManualContact(pagamento.matricula.aluno.id, "whatsapp", `Abriu link de cobrança WhatsApp para o mês de ${mesRef}.`);

                                                window.open(link, "_blank");
                                            }}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="lucide lucide-message-circle"
                                            >
                                                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                                            </svg>
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {inadimplentes.map((pagamento: any) => (
                    <div key={pagamento.id} className="p-4 rounded-xl border border-border bg-card space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-foreground text-sm leading-tight">
                                    {pagamento.matricula?.aluno?.responsavel?.nome_completo || "Sem Responsável"}
                                </h4>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    Aluno: {pagamento.matricula?.aluno?.nome_completo}
                                </p>
                            </div>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-medium uppercase bg-destructive/10 text-destructive border border-destructive/20">
                                Atrasado
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 py-2 border-y border-primary/5">
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Vencimento</p>
                                <p className="text-xs font-bold text-destructive">
                                    {new Date(pagamento.data_vencimento).toLocaleDateString("pt-BR")}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Valor Devido</p>
                                <p className="text-lg font-bold text-foreground">
                                    R$ {parseFloat(pagamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1 justify-center">
                            {pagamento.matricula?.aluno?.responsavel?.telefone && (
                                <Button
                                    size="sm"
                                    className="flex-1 min-w-[120px] h-9 gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-none font-bold text-xs"
                                    onClick={async () => {
                                        const nomeResp = pagamento.matricula?.aluno?.responsavel?.nome_completo || "Responsável";
                                        const nomeAluno = pagamento.matricula?.aluno?.nome_completo || "Aluno";
                                        const dataVencimento = new Date(pagamento.data_vencimento);
                                        const mesRef = dataVencimento.toLocaleDateString("pt-BR", { month: 'long' });
                                        const valor = parseFloat(pagamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
                                        const linkBoleto = pagamento.gateway_url ? `\n\nLink para pagamento: ${pagamento.gateway_url}` : "";

                                        const link = generateWhatsAppLink(
                                            pagamento.matricula.aluno.responsavel.telefone,
                                            WhatsAppTemplates.cobranca(nomeResp, nomeAluno, mesRef, valor) + linkBoleto
                                        );
                                        await handleManualContact(pagamento.matricula.aluno.id, "whatsapp", `Cobrança via WhatsApp iniciada.`);
                                        window.open(link, "_blank");
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                                    WhatsApp
                                </Button>
                            )}

                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 min-w-[120px] h-9 gap-2 text-blue-600 border-blue-200 bg-blue-50/50"
                                onClick={() => handleSendReminder(pagamento)}
                                disabled={sendingEmail === pagamento.id}
                            >
                                {sendingEmail === pagamento.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                E-mail
                            </Button>

                            {!pagamento.gateway_url && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            size="sm"
                                            className="w-full h-9 gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 border-none font-bold text-xs"
                                            disabled={generatingCharge === pagamento.id}
                                        >
                                            {generatingCharge === pagamento.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
                                            Gerar Link de Pagamento
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Gerar Link InfinitePay?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Cria um checkout para PIX e Cartão.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Sair</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleGenerateCharge(pagamento)}>Gerar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full h-9 gap-2 border border-primary/5 font-bold text-xs"
                                    >
                                        <ClipboardList className="h-3.5 w-3.5" />
                                        Registrar Contato Manual
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Registrar Logs</AlertDialogTitle>
                                    </AlertDialogHeader>
                                    <div className="grid grid-cols-2 gap-2 py-4">
                                        <Button variant="outline" onClick={() => handleManualContact(pagamento.matricula.aluno.id, "ligacao", "Ligação telefônica.")}>Ligação</Button>
                                        <Button variant="outline" onClick={() => handleManualContact(pagamento.matricula.aluno.id, "whatsapp", "Mensagem WhatsApp.")}>WhatsApp</Button>
                                        <Button variant="outline" onClick={() => handleManualContact(pagamento.matricula.aluno.id, "reuniao", "Reunião presencial.")}>Reunião</Button>
                                        <Button variant="outline" onClick={() => handleManualContact(pagamento.matricula.aluno.id, "cobranca", "Promessa de pagamento.")}>Prometeu</Button>
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Fechar</AlertDialogCancel>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

