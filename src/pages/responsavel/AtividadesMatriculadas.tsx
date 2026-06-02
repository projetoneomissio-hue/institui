import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, User, Clock, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

const AtividadesMatriculadas = () => {
  const { user } = useAuth();

  const { data: atividades, isLoading } = useQuery({
    queryKey: ["responsavel-atividades", user?.id],
    queryFn: async () => {
      // Obter alunos do responsável
      const { data: alunos } = await supabase
        .from("alunos")
        .select("id, nome_completo")
        .eq("responsavel_id", user?.id);

      if (!alunos || alunos.length === 0) return [];

      const alunoIds = alunos.map((a) => a.id);

      // Obter matrículas com detalhes
      const { data: matriculas, error } = await supabase
        .from("matriculas")
        .select(`
          id,
          status,
          aluno_id,
          alunos!inner (nome_completo),
          turmas!inner (
            nome,
            horario,
            dias_semana,
            atividades!inner (nome),
            professores!inner (
              user_id,
              profiles:user_id (nome_completo)
            )
          )
        `)
        .in("aluno_id", alunoIds)
        .eq("status", "ativa");

      if (error) throw error;

      return (matriculas || []).map((m: any) => ({
        id: m.id,
        aluno: m.alunos?.nome_completo,
        nome: m.turmas?.atividades?.nome,
        turma: m.turmas?.nome,
        professor: m.turmas?.professores?.profiles?.nome_completo,
        horario: `${m.turmas?.dias_semana?.join(", ")} - ${m.turmas?.horario}`,
        status: m.status,
        // Mocking images based on activity name for better UI
        image: getActivityImage(m.turmas?.atividades?.nome),
      }));
    },
    enabled: !!user?.id,
  });

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Minhas Atividades
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe as aulas e turmas dos seus dependentes
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-48 bg-muted animate-pulse" />
                <CardHeader>
                  <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-1/2 bg-muted animate-pulse rounded mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !atividades || atividades.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <Eye className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Nenhuma atividade encontrada</h3>
                <p className="text-muted-foreground max-w-sm mt-1">
                  Seus dependentes ainda não estão matriculados em nenhuma turma ativa.
                </p>
              </div>
              <Button asChild>
                <Link to="/responsavel/nova-matricula">Matricular Agora</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {atividades.map((atividade) => (
              <Card key={atividade.id} className="group overflow-hidden hover:shadow-lg transition-all border-primary/10">
                <div className="relative h-48 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                  <img
                    src={atividade.image}
                    alt={atividade.nome}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-4 left-4 z-20">
                    <Badge variant="secondary" className="mb-2 bg-black/40 text-white border-white/20">
                      {atividade.turma}
                    </Badge>
                    <h3 className="text-xl font-bold text-white leading-tight">{atividade.nome}</h3>
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-primary/10 p-2 rounded-full text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Aluno</p>
                      <p className="font-medium text-foreground">{atividade.aluno}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-primary/10 p-2 rounded-full text-primary">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Horário</p>
                      <p className="font-medium text-foreground">{atividade.horario}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="bg-primary/10 p-2 rounded-full text-primary">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Professor</p>
                      <p className="font-medium text-foreground">{atividade.professor || "A definir"}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button variant="outline" className="w-full group-hover:border-primary/50 group-hover:text-primary transition-colors">
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// Helper para imagens (mock)
const getActivityImage = (name: string) => {
  const normalized = name?.toLowerCase() || "";
  if (normalized.includes("futebol") || normalized.includes("futsal")) return "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop";
  if (normalized.includes("ballet") || normalized.includes("dança")) return "https://images.unsplash.com/photo-1518834107812-32b005f778a4?q=80&w=800&auto=format&fit=crop";
  if (normalized.includes("judo") || normalized.includes("karate") || normalized.includes("luta")) return "https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=800&auto=format&fit=crop";
  if (normalized.includes("natacao") || normalized.includes("natação")) return "https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=800&auto=format&fit=crop";
  if (normalized.includes("volei")) return "https://images.unsplash.com/photo-1612872087720-48ca45b0d6f3?q=80&w=800&auto=format&fit=crop";
  return "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?q=80&w=800&auto=format&fit=crop"; // Default school/kids
};

export default AtividadesMatriculadas;
