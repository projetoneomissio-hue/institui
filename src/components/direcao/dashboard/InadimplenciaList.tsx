import { AlertCircle } from "lucide-react";
import { PanelCard } from "@/components/ui/panel-card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InadimplenciaListProps {
  inadimplentes: any[] | undefined;
  colors: { conversa: string };
}

export const InadimplenciaList = ({ inadimplentes }: InadimplenciaListProps) => {
  return (
    <PanelCard
      title="Inadimplência"
      description="Casos críticos"
      icon={<AlertCircle className="h-4 w-4" />}
      accent="amber"
      action={
        <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-semibold px-2">
          TOP 5
        </Badge>
      }
    >
      <ScrollArea className="h-[260px] pr-3">
        <div className="space-y-2">
          {(inadimplentes || []).slice(0, 5).map((p: any) => (
            <div
              key={p.id}
              className="p-3 rounded-lg bg-background border border-border hover:border-destructive/30 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {p.matricula?.aluno?.nome_completo?.[0] || "?"}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate max-w-[100px]">
                    {p.matricula?.aluno?.nome_completo}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                    {p.matricula?.turma?.atividade?.nome}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-destructive">R$ {p.valor}</div>
                <div className="text-[10px] text-destructive/60 font-medium mt-0.5">23d atraso</div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </PanelCard>
  );
};
