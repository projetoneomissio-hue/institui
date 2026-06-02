import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUltimosPagamentos } from "@/hooks/useFinanceiro";
import { generateWhatsAppLink, WhatsAppTemplates } from "@/utils/whatsapp";

export const RecentPaymentsTable = () => {
    const { data: ultimosPagamentos, isLoading } = useUltimosPagamentos(10);

    if (isLoading) {
        return (
            <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!ultimosPagamentos?.length) {
        return <p className="text-sm text-muted-foreground text-center py-4">Nenhum pagamento recente encontrado.</p>;
    }

    return (
        <div className="relative w-full overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Aluno</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Atividade</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Data</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Valor</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-center">Status</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {ultimosPagamentos.map((pagamento: any) => (
                            <tr key={pagamento.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <td className="p-4 align-middle font-medium">{pagamento.matricula?.aluno?.nome_completo || "Desconhecido"}</td>
                                <td className="p-4 align-middle">{pagamento.matricula?.turma?.atividade?.nome || "-"}</td>
                                <td className="p-4 align-middle text-muted-foreground text-xs">
                                    {pagamento.data_pagamento
                                        ? new Date(pagamento.data_pagamento).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: '2-digit' })
                                        : "-"}
                                </td>
                                <td className="p-4 align-middle text-right font-bold text-emerald-500">
                                    R$ {parseFloat(pagamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 align-middle text-center">
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                        Pago
                                    </span>
                                </td>
                                <td className="p-4 align-middle text-right">
                                    {pagamento.matricula?.aluno?.responsavel?.telefone && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                            title="Enviar Comprovante"
                                            onClick={() => {
                                                const nomeResp = pagamento.matricula?.aluno?.responsavel?.nome_completo || "Responsável";
                                                const nomeAluno = pagamento.matricula?.aluno?.nome_completo || "Aluno";
                                                const atividade = pagamento.matricula?.turma?.atividade?.nome || "Atividade";
                                                const valor = parseFloat(pagamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

                                                const link = generateWhatsAppLink(
                                                    pagamento.matricula.aluno.responsavel.telefone,
                                                    WhatsAppTemplates.recibo(nomeResp, nomeAluno, atividade, valor)
                                                );
                                                window.open(link, "_blank");
                                            }}
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {ultimosPagamentos.map((pagamento: any) => (
                    <div key={pagamento.id} className="p-4 rounded-xl border border-border bg-card space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-foreground text-sm leading-tight">
                                    {pagamento.matricula?.aluno?.nome_completo || "Desconhecido"}
                                </h4>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    {pagamento.matricula?.turma?.atividade?.nome || "-"}
                                </p>
                            </div>
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-medium uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                Pago
                            </span>
                        </div>

                        <div className="flex justify-between items-end pt-2 border-t border-primary/5">
                            <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground font-medium italic">
                                    {pagamento.data_pagamento
                                        ? new Date(pagamento.data_pagamento).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                                        : "-"}
                                </p>
                                <p className="text-base font-bold text-emerald-500">
                                    R$ {parseFloat(pagamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </p>
                            </div>

                            {pagamento.matricula?.aluno?.responsavel?.telefone && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-9 px-3 gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-none font-bold text-xs"
                                    onClick={() => {
                                        const nomeResp = pagamento.matricula?.aluno?.responsavel?.nome_completo || "Responsável";
                                        const nomeAluno = pagamento.matricula?.aluno?.nome_completo || "Aluno";
                                        const atividade = pagamento.matricula?.turma?.atividade?.nome || "Atividade";
                                        const valor = parseFloat(pagamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

                                        const link = generateWhatsAppLink(
                                            pagamento.matricula.aluno.responsavel.telefone,
                                            WhatsAppTemplates.recibo(nomeResp, nomeAluno, atividade, valor)
                                        );
                                        window.open(link, "_blank");
                                    }}
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    Recibo
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
