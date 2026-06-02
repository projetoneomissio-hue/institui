
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Clock, Calendar as CalendarIcon, NotebookPen, Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useSearchParams } from "react-router-dom";

const Turmas = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode"); // "chamada" | "grade" | null

  const modeConfig = {
    chamada: {
      label: "Chamada / Frequência",
      subtitle: "Selecione uma turma para registrar a chamada.",
      icon: NotebookPen,
      color: "text-primary",
      destination: (id: string) => `/professor/chamada?turma=${id}`,
    },
    grade: {
      label: "Grade de Notas",
      subtitle: "Selecione uma turma para lançar as avaliações.",
      icon: Trophy,
      color: "text-yellow-500",
      destination: (id: string) => `/professor/avaliacoes?turma=${id}`,
    },
  } as const;

  const activeModeConfig = mode === "chamada" || mode === "grade" ? modeConfig[mode] : null;
  const defaultDestination = (id: string) => `/professor/chamada?turma=${id}`;

  const { data: turmas, isLoading } = useQuery({
    queryKey: ["professor-turmas", user?.id],
    queryFn: async () => {
      // Get professor record
      const { data: professor, error: profError } = await supabase
        .from("professores")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (profError) {
        return [];
      }

      if (!professor) {
        return [];
      }

      // Get turmas with activity info and enrollment count
      const { data, error } = await supabase
        .from("turmas")
        .select(`
          id,
          nome,
          horario,
          dias_semana,
          capacidade_maxima,
          ativa,
          atividades (nome)
        `)
        .eq("professor_id", professor.id)
        .eq("ativa", true);

      if (error) throw error;

      // Count matriculas for each turma
      const turmasWithCounts = await Promise.all(
        (data || []).map(async (turma) => {
          const { count } = await supabase
            .from("matriculas")
            .select("*", { count: "exact", head: true })
            .eq("turma_id", turma.id)
            .eq("status", "ativa");

          return {
            ...turma,
            alunosMatriculados: count || 0,
          };
        })
      );

      return turmasWithCounts;
    },
    enabled: !!user?.id,
  });

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Premium */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${activeModeConfig ? "bg-primary/20" : "bg-primary/20"}`}>
                {activeModeConfig ? (
                  <activeModeConfig.icon className={`h-4 w-4 ${activeModeConfig.color}`} />
                ) : (
                  <BookOpen className="h-4 w-4 text-primary" />
                )}
              </div>
              <span className="text-sm font-semibold text-primary">Portal do Professor</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {activeModeConfig ? activeModeConfig.label : "Minhas Turmas"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeModeConfig ? activeModeConfig.subtitle : "Gestão de turmas e acesso rápido ao diário de classe."}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border border-border">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !turmas || turmas.length === 0 ? (
          <Card className="overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6 shadow-inner">
                <Users className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Nenhuma turma atribuída</h3>
              <p className="text-muted-foreground max-w-md">
                Você ainda não foi alocado(a) como professor(a) responsável em nenhuma turma ativa no momento. Procure a coordenação.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {turmas.map((turma) => {
              const isCheia = turma.alunosMatriculados >= turma.capacidade_maxima;
              const taxaOcupacao = Math.round((turma.alunosMatriculados / turma.capacidade_maxima) * 100);

              return (
                <Card
                  key={turma.id}
                  className="group relative overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                  onClick={() => navigate(activeModeConfig ? activeModeConfig.destination(turma.id) : defaultDestination(turma.id))}
                >
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {turma.atividades?.nome}
                      </Badge>
                      <div className="flex -space-x-2">
                        <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shadow-sm">
                          {turma.alunosMatriculados}
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                      {turma.nome}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        <span className="truncate" title={turma.dias_semana.join(", ")}>
                          {turma.dias_semana.join(", ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                        <Clock className="h-4 w-4 text-primary" />
                        <span>{turma.horario}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Ocupação da Turma</span>
                        <span className={isCheia ? "text-red-500" : "text-primary"}>
                          {turma.alunosMatriculados} / {turma.capacidade_maxima}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${isCheia ? "bg-red-500" : "bg-primary"
                            }`}
                          style={{ width: `${Math.min(taxaOcupacao, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 grid grid-cols-2 gap-3">
                      <Button
                        className={`w-full gap-2 transition-colors h-10 ${mode === "chamada" ? "bg-primary text-primary-foreground" : "group-hover:bg-primary group-hover:text-primary-foreground"}`}
                        variant={mode === "chamada" ? "default" : "secondary"}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/professor/chamada?turma=${turma.id}`);
                        }}
                      >
                        <NotebookPen className="h-4 w-4" />
                        Chamada
                      </Button>
                      <Button
                        className={`w-full gap-2 transition-colors h-10 ${mode === "grade" ? "bg-yellow-500 text-white" : "hover:bg-yellow-500 hover:text-white"}`}
                        variant={mode === "grade" ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/professor/avaliacoes?turma=${turma.id}`);
                        }}
                      >
                        <Trophy className="h-4 w-4" />
                        Notas
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Turmas;
