import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUnidade } from "@/contexts/UnidadeContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Info, CheckCircle, Clock, AlertTriangle, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { differenceInYears } from "date-fns";
import { useFeature } from "@/contexts/FeatureContext";

const matriculaSchema = z.object({
  aluno_id: z.string().uuid("Selecione um aluno"),
  turma_id: z.string().uuid("Selecione uma turma"),
});

type ResultadoSubmit = { tipo: "matricula" | "lista_espera" | "aprovada"; alunoNome: string; atividadeNome: string };

const NovaMatricula = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentUnidade } = useUnidade();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedAlunoId, setSelectedAlunoId] = useState(searchParams.get("aluno_id") ?? "");
  const [selectedAtividadeId, setSelectedAtividadeId] = useState("");
  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<ResultadoSubmit | null>(null);
  const aprovacaoAutomatica = useFeature("matricula_aprovacao_automatica");

  // Fetch alunos do responsável
  const { data: alunos, isLoading: loadingAlunos } = useQuery({
    queryKey: ["alunos-responsavel", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("alunos")
        .select("id, nome_completo, data_nascimento")
        .eq("responsavel_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch atividades ativas
  const { data: atividades } = useQuery({
    queryKey: ["atividades-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atividades")
        .select("id, nome, descricao, valor_mensal")
        .eq("ativa", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Fetch turmas da atividade selecionada
  const { data: turmas, isLoading: loadingTurmas } = useQuery({
    queryKey: ["turmas-atividade", selectedAtividadeId],
    queryFn: async () => {
      if (!selectedAtividadeId) return [];
      const { data, error } = await supabase
        .from("turmas")
        .select(`id, nome, horario, dias_semana, capacidade_maxima, matriculas(count)`)
        .eq("atividade_id", selectedAtividadeId)
        .eq("ativa", true);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAtividadeId,
  });

  // Garante pré-seleção quando query de alunos finaliza após montagem
  useEffect(() => {
    const prefilled = searchParams.get("aluno_id");
    if (prefilled && alunos?.some(a => a.id === prefilled)) {
      setSelectedAlunoId(prefilled);
    }
  }, [alunos]);

  // Detecta mismatch entre faixa etária do aluno e nome da atividade
  const avisoDeMismatchIdade = (): string | null => {
    if (!selectedAlunoId || !selectedAtividadeId) return null;
    const aluno = alunos?.find(a => a.id === selectedAlunoId);
    const atividade = atividades?.find(a => a.id === selectedAtividadeId);
    if (!aluno?.data_nascimento || !atividade) return null;
    const idade = differenceInYears(new Date(), new Date(aluno.data_nascimento));
    const nome = atividade.nome.toLowerCase();
    if ((nome.includes("adulto") || nome.includes("adultos") || nome.includes("senior") || nome.includes("sênior")) && idade < 18) {
      return `${aluno.nome_completo} tem ${idade} anos — esta atividade parece ser para adultos. Confirme com a coordenação se há restrição de idade.`;
    }
    if ((nome.includes("infantil") || nome.includes("kids") || nome.includes("criança") || nome.includes("junior") || nome.includes("júnior")) && idade >= 18) {
      return `${aluno.nome_completo} tem ${idade} anos — esta atividade parece ser destinada a crianças. Confirme com a coordenação se há restrição de idade.`;
    }
    return null;
  };

  // Calcula se todas as turmas estão lotadas
  // ATENÇÃO: capacidade_maxima pode ser null (turma sem limite definido) → JS coerce null→0
  // o que faz 0 >= 0 = true = falso positivo de "lotada". Tratamos null como capacidade ilimitada.
  const isTurmaLotada = (t: { capacidade_maxima: number | null; matriculas?: { count: number }[] }) => {
    if (t.capacidade_maxima == null) return false;
    return Number(t.matriculas?.[0]?.count ?? 0) >= t.capacidade_maxima;
  };

  const todasLotadas =
    !!turmas &&
    turmas.length > 0 &&
    turmas.every(isTurmaLotada);

  // Mutation para criar matrícula normal
  const criarMatriculaMutation = useMutation({
    mutationFn: async (data: { aluno_id: string; turma_id: string; listaEspera?: boolean }) => {
      if (!data.listaEspera) {
        const { data: turmaData, error: turmaError } = await supabase
          .from("turmas")
          .select("capacidade_maxima, matriculas(count)")
          .eq("id", data.turma_id)
          .single();
        if (turmaError) throw turmaError;
        const matriculasAtuais = Number(turmaData.matriculas?.[0]?.count ?? 0);
        if (turmaData.capacidade_maxima != null && matriculasAtuais >= turmaData.capacidade_maxima) {
          throw new Error("Esta turma não tem mais vagas disponíveis. Por favor, escolha outra turma.");
        }
      }

      const statusFinal = data.listaEspera
        ? "lista_espera"
        : aprovacaoAutomatica
          ? "ativa"
          : "pendente";

      const { error } = await supabase.from("matriculas").insert([{
        aluno_id: data.aluno_id,
        turma_id: data.turma_id,
        data_inicio: new Date().toISOString().split("T")[0],
        status: statusFinal,
      }]);

      if (error) {
        if (error.message?.includes("Turma lotada")) {
          throw new Error("Esta turma atingiu a capacidade máxima. Por favor, escolha outra turma.");
        }
        throw error;
      }
    },
    onSuccess: async (_, variables) => {
      const alunoNome = alunos?.find(a => a.id === variables.aluno_id)?.nome_completo || "Aluno";
      const atividadeNome = atividades?.find(a => a.id === selectedAtividadeId)?.nome || "Atividade";

      try {
        if (user?.email) {
          await supabase.functions.invoke("send-email", {
            body: {
              to: user.email,
              type: variables.listaEspera ? "lista_espera_confirmada" : "matricula_solicitada",
              data: {
                nomeResponsavel: user.user_metadata?.full_name || "Responsável",
                nomeAluno: alunoNome,
                atividade: atividadeNome,
              },
            },
          });
        }

        if (!variables.listaEspera && currentUnidade?.id) {
          const { data: adminUsers } = await supabase
            .from("user_unidades")
            .select("user_id")
            .eq("unidade_id", currentUnidade.id)
            .in("role", ["direcao", "secretaria"])
            .limit(1);
          if (adminUsers?.[0]?.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", adminUsers[0].user_id)
              .single();
            if (profile?.email) {
              await supabase.functions.invoke("send-email", {
                body: {
                  to: profile.email,
                  type: "nova_matricula_admin",
                  data: { nomeAluno: alunoNome, atividade: atividadeNome, unidade: currentUnidade?.nome ?? "Unidade" },
                },
              });
            }
          }
        }
      } catch (e) {
        console.error("Erro silencioso enviando emails:", e);
      }

      queryClient.invalidateQueries({ queryKey: ["matriculas-aluno"] });
      const tipo = variables.listaEspera ? "lista_espera" : aprovacaoAutomatica ? "aprovada" : "matricula";
      setResultado({ tipo: tipo as ResultadoSubmit["tipo"], alunoNome, atividadeNome });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao solicitar matrícula",
        description: error.message || "Não foi possível solicitar a matrícula.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = matriculaSchema.parse({ aluno_id: selectedAlunoId, turma_id: selectedTurmaId });
      setFormErrors({});
      criarMatriculaMutation.mutate({ aluno_id: validated.aluno_id, turma_id: validated.turma_id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => { if (err.path[0]) errors[err.path[0].toString()] = err.message; });
        setFormErrors(errors);
      }
    }
  };

  const handleListaEspera = () => {
    if (!selectedAlunoId || !selectedTurmaId) {
      toast({ title: "Selecione o aluno e a turma", description: "Escolha a turma que deseja para entrar na lista de espera.", variant: "destructive" });
      return;
    }
    criarMatriculaMutation.mutate({ aluno_id: selectedAlunoId, turma_id: selectedTurmaId, listaEspera: true });
  };

  const atividadeSelecionada = atividades?.find((a) => a.id === selectedAtividadeId);

  // ── TELA DE SUCESSO ────────────────────────────────────────────────────────
  if (resultado) {
    const isListaEspera = resultado.tipo === "lista_espera";
    const isAprovada = resultado.tipo === "aprovada";

    const icon = isListaEspera
      ? <Clock className="h-16 w-16 text-amber-500" />
      : isAprovada
        ? <Zap className="h-16 w-16 text-yellow-500" />
        : <CheckCircle className="h-16 w-16 text-green-500" />;

    const titulo = isListaEspera
      ? "Você entrou na lista de espera!"
      : isAprovada
        ? "Matrícula Confirmada!"
        : "Matrícula Solicitada!";

    const mensagem = isListaEspera
      ? <p>A turma de <strong>{resultado.atividadeNome}</strong> está cheia, mas <strong>{resultado.alunoNome}</strong> está na lista de espera.</p>
      : isAprovada
        ? <p><strong>{resultado.alunoNome}</strong> está matriculado(a) em <strong>{resultado.atividadeNome}</strong>. Bem-vindo(a)!</p>
        : <p>A solicitação de <strong>{resultado.alunoNome}</strong> em <strong>{resultado.atividadeNome}</strong> foi enviada para aprovação.</p>;

    const detalhe = isListaEspera
      ? "Você será notificado pelo WhatsApp ou e-mail quando uma vaga abrir."
      : isAprovada
        ? "A matrícula foi aprovada automaticamente. Você já pode acompanhar as atividades."
        : "Aguarde a aprovação da coordenação. Você será notificado em breve pelo WhatsApp.";

    return (
      <DashboardLayout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
          <Card className="w-full max-w-md text-center p-6 shadow-lg">
            <div className="flex justify-center mb-4">{icon}</div>
            <CardTitle className="text-2xl mb-3">{titulo}</CardTitle>
            <div className="text-gray-600 leading-relaxed mb-2">{mensagem}</div>
            <p className="text-sm text-gray-500 mb-6">{detalhe}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/responsavel/dashboard")}>
                Ir para o Dashboard
              </Button>
              <Button onClick={() => { setResultado(null); setSelectedAlunoId(""); setSelectedAtividadeId(""); setSelectedTurmaId(""); }}>
                Nova Solicitação
              </Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ── FORMULÁRIO ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nova Matrícula</h1>
          <p className="text-muted-foreground mt-1">Inscreva seu aluno em uma atividade</p>
        </div>

        {loadingAlunos ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : alunos && alunos.length === 0 ? (
          <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Info className="h-12 w-12 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">Cadastre um aluno primeiro</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Para solicitar uma matrícula, você precisa primeiro cadastrar um aluno (filho/dependente).
                  </p>
                </div>
                <Button asChild><Link to="/responsavel/cadastrar-aluno">Cadastrar Aluno</Link></Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Dados da Matrícula</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Aluno */}
                <div className="space-y-2">
                  <Label htmlFor="aluno">Selecione o Aluno *</Label>
                  <Select value={selectedAlunoId} onValueChange={setSelectedAlunoId}>
                    <SelectTrigger id="aluno">
                      <SelectValue placeholder="Selecione o aluno" />
                    </SelectTrigger>
                    <SelectContent>
                      {alunos?.map((aluno) => (
                        <SelectItem key={aluno.id} value={aluno.id}>{aluno.nome_completo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.aluno_id && <p className="text-sm text-destructive">{formErrors.aluno_id}</p>}
                </div>

                {/* Atividade */}
                <div className="space-y-2">
                  <Label htmlFor="atividade">Selecione a Atividade *</Label>
                  <Select
                    value={selectedAtividadeId}
                    onValueChange={(value) => { setSelectedAtividadeId(value); setSelectedTurmaId(""); }}
                  >
                    <SelectTrigger id="atividade">
                      <SelectValue placeholder="Selecione uma atividade" />
                    </SelectTrigger>
                    <SelectContent>
                      {atividades?.map((atividade) => (
                        <SelectItem key={atividade.id} value={atividade.id}>
                          {atividade.nome} — R$ {parseFloat(atividade.valor_mensal.toString()).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {atividadeSelecionada && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{atividadeSelecionada.nome}</strong>
                      {atividadeSelecionada.descricao && <p className="mt-1">{atividadeSelecionada.descricao}</p>}
                      <p className="mt-2 font-semibold">
                        Valor Mensal: R$ {parseFloat(atividadeSelecionada.valor_mensal.toString()).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {(() => {
                  const aviso = avisoDeMismatchIdade();
                  return aviso ? (
                    <Alert className="border-amber-300 bg-amber-50">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">{aviso}</AlertDescription>
                    </Alert>
                  ) : null;
                })()}

                {/* Turma */}
                {selectedAtividadeId && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="turma">Selecione a Turma/Horário *</Label>
                      {todasLotadas && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 gap-1">
                          <AlertTriangle className="h-3 w-3" /> Turmas cheias
                        </Badge>
                      )}
                    </div>

                    {loadingTurmas ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : turmas && turmas.length > 0 ? (
                      <>
                        <Select value={selectedTurmaId} onValueChange={setSelectedTurmaId}>
                          <SelectTrigger id="turma">
                            <SelectValue placeholder={todasLotadas ? "Selecione uma turma para a lista de espera" : "Selecione o horário"} />
                          </SelectTrigger>
                          <SelectContent>
                            {turmas.map((turma) => {
                              const matriculasCount = Number(turma.matriculas?.[0]?.count ?? 0);
                              const semLimite = turma.capacidade_maxima == null;
                              const vagasDisponiveis = semLimite ? null : turma.capacidade_maxima! - matriculasCount;
                              const turmaLotada = !semLimite && vagasDisponiveis! <= 0;
                              return (
                                <SelectItem key={turma.id} value={turma.id}>
                                  {turma.nome} — {turma.dias_semana.join(", ")} {turma.horario}
                                  {turmaLotada
                                    ? " (Lista de espera)"
                                    : semLimite
                                      ? " (Vagas disponíveis)"
                                      : ` (${vagasDisponiveis} vagas)`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>

                        {/* Banner lista de espera */}
                        {todasLotadas && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                            <div className="flex gap-2">
                              <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold text-amber-800 text-sm">Todas as turmas estão com vagas esgotadas</p>
                                <p className="text-xs text-amber-700 mt-1">
                                  Selecione uma turma acima e clique em <strong>"Entrar na Lista de Espera"</strong>. Você será avisado pelo WhatsApp quando uma vaga abrir.
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full border-amber-400 text-amber-800 hover:bg-amber-100 gap-2"
                              disabled={!selectedAlunoId || !selectedTurmaId || criarMatriculaMutation.isPending}
                              onClick={handleListaEspera}
                            >
                              {criarMatriculaMutation.isPending
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Clock className="h-4 w-4" />}
                              Entrar na Lista de Espera
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma turma disponível para esta atividade.</p>
                    )}
                    {formErrors.turma_id && <p className="text-sm text-destructive">{formErrors.turma_id}</p>}
                  </div>
                )}

                {selectedTurmaId && !todasLotadas && (
                  <Alert>
                    <AlertDescription>
                      <strong>Atenção:</strong> Após solicitar a matrícula, aguarde a aprovação da coordenação. Você será notificado sobre o status.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Botão submeter — só aparece quando há vagas */}
                {!todasLotadas && (
                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={criarMatriculaMutation.isPending || !selectedAlunoId || !selectedTurmaId}
                    >
                      {criarMatriculaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Solicitar Matrícula
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NovaMatricula;
