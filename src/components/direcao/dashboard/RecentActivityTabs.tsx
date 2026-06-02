import { Activity, ArrowUpRight } from "lucide-react";
import { PanelCard } from "@/components/ui/panel-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface RecentActivityTabsProps {
  leadsRecentes: any[] | undefined;
  matriculasPendentes: any[] | undefined;
  loadingLeadsRecentes: boolean;
  loadingPendentes: boolean;
  activeTabSub: string;
  setActiveTabSub: (val: string) => void;
  colors: { conhecimento: string };
}

export const RecentActivityTabs = ({
  leadsRecentes,
  matriculasPendentes,
  loadingLeadsRecentes,
  loadingPendentes,
  activeTabSub,
  setActiveTabSub,
}: RecentActivityTabsProps) => {
  const navigate = useNavigate();

  return (
    <PanelCard
      title="Novas Entradas"
      icon={<Activity className="h-4 w-4" />}
      accent="violet"
    >
      <Tabs defaultValue="leads" value={activeTabSub} onValueChange={setActiveTabSub} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="h-8 p-1">
            <TabsTrigger value="leads" className="text-xs font-semibold h-6 px-3">Interessados</TabsTrigger>
            <TabsTrigger value="matriculas" className="text-xs font-semibold h-6 px-3">Matrículas</TabsTrigger>
          </TabsList>
          <Button
            variant="link"
            className="text-xs font-semibold h-auto p-0 text-primary"
            onClick={() => navigate(activeTabSub === "leads" ? "/direcao/interessados" : "/direcao/matriculas-pendentes")}
          >
            Ver tudo
          </Button>
        </div>

        <TabsContent value="leads" className="mt-0">
          <ScrollArea className="h-[220px] pr-3">
            {loadingLeadsRecentes ? (
              <div className="flex items-center justify-center h-full opacity-40 py-8">
                <Activity className="h-5 w-5 animate-spin" />
              </div>
            ) : leadsRecentes && leadsRecentes.length > 0 ? (
              <div className="space-y-2">
                {leadsRecentes.map((lead: any) => (
                  <div
                    key={lead.id}
                    onClick={() => navigate("/direcao/interessados")}
                    className="p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold text-xs">
                        {lead.nome_completo?.[0] || "?"}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{lead.nome_completo} {lead.sobrenome}</div>
                        <div className="text-[10px] text-muted-foreground">{lead.atividade_desejada || "Interesse Geral"}</div>
                      </div>
                    </div>
                    <Badge className={`text-[10px] font-semibold h-5 ${lead.status === "pendente" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"}`}>
                      {lead.status === "pendente" ? "FICHA" : "LEAD"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full opacity-30 py-8">
                <span className="text-xs font-medium">Sem novos interessados</span>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="matriculas" className="mt-0">
          <ScrollArea className="h-[220px] pr-3">
            {loadingPendentes ? (
              <div className="flex items-center justify-center h-full opacity-40 py-8">
                <Activity className="h-5 w-5 animate-spin" />
              </div>
            ) : matriculasPendentes && matriculasPendentes.length > 0 ? (
              <div className="space-y-2">
                {matriculasPendentes.map((m: any) => (
                  <div
                    key={m.id}
                    onClick={() => navigate("/direcao/matriculas-pendentes")}
                    className="group p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                        {m.aluno?.nome_completo?.[0] || "?"}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{m.aluno?.nome_completo}</div>
                        <div className="text-[10px] text-muted-foreground">{m.turma?.atividade?.nome || "Sem Atividade"}</div>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full opacity-30 py-8">
                <span className="text-xs font-medium">Sem matrículas pendentes</span>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </PanelCard>
  );
};
