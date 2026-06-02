import { Loader2 } from "lucide-react";
import { useCustosRecentes } from "@/hooks/useFinanceiro";
import { format } from "date-fns";

export const RecentExpensesTable = () => {
    const { data: ultimasDespesas, isLoading } = useCustosRecentes(10);

    if (isLoading) {
        return (
            <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!ultimasDespesas?.length) {
        return <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa registrada.</p>;
    }

    return (
        <div className="relative w-full overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Descrição</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Categoria</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Data</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {ultimasDespesas.map((despesa: any) => (
                            <tr key={despesa.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <td className="p-4 align-middle font-medium">{despesa.item}</td>
                                <td className="p-4 align-middle">{despesa.tipo}</td>
                                <td className="p-4 align-middle text-muted-foreground text-xs">
                                    {format(new Date(despesa.data_competencia), "dd/MM/yyyy")}
                                </td>
                                <td className="p-4 align-middle text-right font-bold text-destructive">
                                    - R$ {parseFloat(despesa.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {ultimasDespesas.map((despesa: any) => (
                    <div key={despesa.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                        <div className="flex justify-between items-start gap-4">
                            <h4 className="font-bold text-foreground text-sm leading-tight flex-1">
                                {despesa.item}
                            </h4>
                            <span className="shrink-0 text-[10px] font-medium uppercase text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                                {despesa.tipo}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-end pt-1">
                            <p className="text-[11px] text-muted-foreground italic font-medium">
                                {format(new Date(despesa.data_competencia), "dd/MM/yyyy")}
                            </p>
                            <p className="text-base font-bold text-destructive">
                                - R$ {parseFloat(despesa.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
