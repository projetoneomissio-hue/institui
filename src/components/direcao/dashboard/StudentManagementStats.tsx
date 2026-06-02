import { Filter, UserMinus, Activity, Phone } from "lucide-react";
import { PanelCard } from "@/components/ui/panel-card";
import { Badge } from "@/components/ui/badge";
import { useUnidade } from "@/contexts/UnidadeContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface StudentManagementStatsProps {
  totalCadastrados: number;
  totalAlunosAtivos: number;
  alunosOrfaos: any[];
  loadingTodosAlunos: boolean;
  colors: {
    atividade: string;
    conversa: string;
    escuta: string;
    conhecimento: string;
    quietude: string;
  };
}

export const StudentManagementStats = ({
  totalCadastrados,
  totalAlunosAtivos,
  alunosOrfaos,
  loadingTodosAlunos,
  colors,
}: StudentManagementStatsProps) => {
  const { currentUnidade } = useUnidade();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Funil Visual (1/3) */}
      <PanelCard
        title="Funil de Alunos"
        description="Conversão da Base"
        icon={<Filter className="h-4 w-4" />}
        accent="violet"
      >
        <div className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              <span>Cadastrados</span>
              <span className="text-foreground font-bold">{totalCadastrados}</span>
            </div>
            <div className="h-3 w-full bg-border rounded-full overflow-hidden">
              <div className="h-full bg-foreground/25 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              <span>Com Matrícula Solicitada</span>
              <span className="text-foreground font-bold">{totalCadastrados - alunosOrfaos.length}</span>
            </div>
            <div className="h-3 w-full bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${totalCadastrados ? ((totalCadastrados - alunosOrfaos.length) / totalCadastrados) * 100 : 0}%`,
                  backgroundColor: colors.conversa,
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              <span>Alunos Ativos</span>
              <span className="font-bold" style={{ color: colors.escuta }}>{totalAlunosAtivos}</span>
            </div>
            <div className="h-3 w-full bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${totalCadastrados ? (totalAlunosAtivos / totalCadastrados) * 100 : 0}%`,
                  backgroundColor: colors.escuta,
                }}
              />
            </div>
          </div>
        </div>
      </PanelCard>

      {/* Alunos Sem Matrícula (2/3) */}
      <PanelCard
        title="Ações Requeridas: Alunos Órfãos"
        description="Cadastrados sem escolha de turma"
        icon={<UserMinus className="h-4 w-4" />}
        accent="default"
        className="lg:col-span-2"
        action={
          <Badge className="bg-primary/10 text-primary border-0 text-xs font-semibold px-2.5">
            {alunosOrfaos.length} parados
          </Badge>
        }
      >
        <div className="mb-3">
          <span className="text-xs text-muted-foreground font-medium">Aguardando Contato Comercial</span>
        </div>
        <ScrollArea className="h-[180px] pr-3">
          {loadingTodosAlunos ? (
            <div className="h-full flex items-center justify-center opacity-40">
              <Activity className="animate-spin h-5 w-5" />
            </div>
          ) : alunosOrfaos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {alunosOrfaos.map((aluno: any) => (
                <div
                  key={aluno.id}
                  className="p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors flex justify-between items-center"
                >
                  <div className="flex flex-col min-w-0 mr-3">
                    <span className="text-xs font-semibold text-foreground truncate leading-tight">
                      {aluno.nome_completo}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(aluno.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      const cleanPhone = (aluno.telefone || "").replace(/\D/g, "");
                      if (cleanPhone)
                        window.open(
                          `https://wa.me/55${cleanPhone}?text=Olá! Vimos que você iniciou o cadastro de ${aluno.nome_completo.split(" ")[0]} no ${currentUnidade?.nome || "Zafen"}, mas ainda não escolheu as atividades. Podemos ajudar?`,
                          "_blank",
                        );
                    }}
                    className="bg-[#25D366] hover:bg-[#25D366]/90 text-white h-7 rounded-full text-xs font-semibold px-3 shrink-0"
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    WhatsApp
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-30 py-8">
              <UserMinus className="h-7 w-7 mb-2" />
              <span className="text-xs font-medium">Excelente! Adoção 100%.</span>
            </div>
          )}
        </ScrollArea>
      </PanelCard>
    </div>
  );
};
