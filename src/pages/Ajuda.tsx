import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUnidade } from "@/contexts/UnidadeContext";
import { useUserRole } from "@/hooks/useUserRole";
import { ManualResponsavel } from "@/components/ajuda/ManualResponsavel";
import { ManualDirecao } from "@/components/ajuda/ManualDirecao";
import { ManualSecretaria } from "@/components/ajuda/ManualSecretaria";
import { ManualProfessor } from "@/components/ajuda/ManualProfessor";
import { ManualCoordenacao } from "@/components/ajuda/ManualCoordenacao";
import { BookOpen, HelpCircle } from "lucide-react";

const Ajuda = () => {
  const { activeRole } = useUserRole();
  const { currentUnidade } = useUnidade();
  const unitName = currentUnidade?.nome || "Zafen";

  // Definição da hierarquia e visibilidade
  const tabsConfig = [
    { 
      id: "direcao", 
      label: "Direção Estratégica", 
      component: <ManualDirecao />, 
      roles: ["admin", "direcao"],
      color: "bg-success"
    },
    { 
      id: "coordenacao", 
      label: "Coordenação", 
      component: <ManualCoordenacao />, 
      roles: ["admin", "direcao", "coordenacao"],
      color: "bg-primary"
    },
    { 
      id: "secretaria", 
      label: "Secretaria Administrativa", 
      component: <ManualSecretaria />, 
      roles: ["admin", "direcao", "secretaria"],
      color: "bg-orange-600"
    },
    { 
      id: "professor", 
      label: "Professores", 
      component: <ManualProfessor />, 
      roles: ["admin", "direcao", "coordenacao", "professor"],
      color: "bg-blue-500"
    },
    { 
      id: "responsavel", 
      label: "Pais e Alunos (Responsável)", 
      component: <ManualResponsavel />, 
      roles: ["admin", "direcao", "coordenacao", "secretaria", "professor", "responsavel"],
      color: "bg-primary"
    },
  ];

  // Filtra as abas permitidas para o papel atual (com normalização para case-insensitive)
  const normalizedRole = activeRole?.toLowerCase();
  const visibleTabs = tabsConfig.filter(tab => tab.roles.includes(normalizedRole || ""));

  // Define a aba inicial padrão
  const defaultTab = visibleTabs.length > 0 ? visibleTabs[0].id : "responsavel";

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background p-6 lg:p-8 text-foreground space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold uppercase flex items-center gap-3">
              <HelpCircle className="h-8 w-8 text-primary" />
              Central de <span className="text-primary">Ajuda</span>
            </h1>
            <p className="text-muted-foreground/60 text-sm font-medium uppercase tracking-[0.2em] mt-1">
              Manuais e Guias Rápidos · {unitName}
            </p>
          </div>
        </div>

        {visibleTabs.length > 0 ? (
          <Tabs defaultValue={defaultTab} className="space-y-8 w-full">
            <TabsList className="bg-card border shadow-sm p-1 rounded-xl h-auto flex flex-wrap gap-2">
              {visibleTabs.map(tab => (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id} 
                  className={`rounded-lg py-2.5 px-4 data-[state=active]:${tab.color} data-[state=active]:text-white data-[state=active]:shadow-md transition-all font-bold text-sm`}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {visibleTabs.map(tab => (
              <TabsContent key={tab.id} value={tab.id} className="mt-6">
                {tab.component}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="p-12 text-center border-2 border-dashed rounded-3xl opacity-50">
            <p className="text-lg font-bold">Nenhum manual disponível para seu perfil.</p>
          </div>
        )}

        {/* Footer info */}
        <div className="flex justify-between items-center pt-8 border-t border-border/50 opacity-50">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.2em]">
            <BookOpen className="h-3 w-3 text-primary" />
            Base de Conhecimento Oficial
          </div>
          <div className="text-[10px] font-medium tracking-widest grayscale opacity-50 uppercase">
            {unitName} · GESTÃO
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Ajuda;
