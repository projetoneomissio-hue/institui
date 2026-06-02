import React, { useState, Fragment } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, Calendar, Plus, Pencil, Trash2, Loader2, Award, FileText, Search, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { pdf } from "@react-pdf/renderer";
import { ListaAlunosPDF } from "@/components/reports/ListaAlunosPDF";
import { GerarCertificadosDialog } from "@/components/certificates/GerarCertificadosDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useTurmas, useAtividades, useProfessores, useTurmaMutations, useTurmaAlunos } from "@/hooks/useTurmas";
import { turmasService } from "@/services/turmas.service";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/utils/error-handler";
import { z } from "zod";

const DIAS_SEMANA = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

const turmaSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(200, "Nome muito longo"),
  atividade_id: z.string().uuid("Selecione uma atividade"),
  professor_id: z.string().uuid("Selecione um professor").optional().nullable(),
  horario: z.string().trim().min(1, "Horário é obrigatório"),
  dias_semana: z.array(z.string()).min(1, "Selecione pelo menos um dia"),
  capacidade_maxima: z.number().int().positive("Capacidade deve ser positiva").max(9999, "Capacidade muito alta"),
  ativa: z.boolean(),
});

type TurmaFormData = z.infer<typeof turmaSchema>;

const TurmaStudentGrid = ({ turmaId }: { turmaId: string }) => {
  const { data: matriculas, isLoading: loadingAlunos } = useTurmaAlunos(turmaId);
  const matriculasAtivas = matriculas?.filter(m => m.status === 'ativa') || [];

  if (loadingAlunos) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!matriculas || matriculas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/5 rounded-xl border border-dashed border-primary/10 m-4">
         <Users className="h-8 w-8 text-muted-foreground mb-2 opacity-20" />
         <p className="text-xs text-muted-foreground">Nenhuma matrícula nesta turma</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between border-b pb-1 border-primary/5">
         <span className="text-[10px] font-medium uppercase text-muted-foreground">Alunos Matriculados ({matriculasAtivas.length} Ativos)</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...matriculas].sort((a, b) => (a.aluno?.nome_completo || "").localeCompare(b.aluno?.nome_completo || "")).map((m: any) => {
          if (!m.aluno) return null;
          const health = m.aluno.anamneses?.[0];
          const missingDocs = !m.aluno.cpf || !m.aluno.rg || (health?.is_pne && !health?.laudo_url);

          return (
            <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-background/40 border border-primary/5 hover:border-primary/20 transition-all group/student shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-[10px] border border-primary/10">
                  {m.aluno.nome_completo.substring(0, 2).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-[11px] font-bold text-foreground truncate">{m.aluno.nome_completo}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {m.status === 'ativa' ? (
                      <span className="text-[8px] font-medium uppercase text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full">Ativo</span>
                    ) : (
                      <span className="text-[8px] font-medium uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{m.status}</span>
                    )}
                    {health?.alergias && <span title={`Alergia: ${health.alergias}`} className="text-xs">🧪</span>}
                    {health?.is_pne && <span title={`PNE: ${health.pne_cid || 'Não inf.'}`} className="text-xs">🏷️</span>}
                    {missingDocs && <span title="Documentação Pendente" className="text-xs">📄</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover/student:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-green-600 hover:bg-green-100/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    const phone = m.aluno.telefone?.replace(/\D/g, "");
                    if (phone) {
                      const cleanPhone = phone.startsWith('55') ? phone : '55' + phone;
                      const message = encodeURIComponent(`Olá, gostaria de falar sobre o aluno ${m.aluno.nome_completo}`);
                      window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Turmas = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTurmaCertificados, setSelectedTurmaCertificados] = useState<any>(null);
  const [editingTurma, setEditingTurma] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TurmaFormData>({
    nome: "",
    atividade_id: "",
    professor_id: null,
    horario: "",
    dias_semana: [],
    capacidade_maxima: 20,
    ativa: true,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedTurmaIds, setExpandedTurmaIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedTurmaIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const { data: turmas, isLoading } = useTurmas();
  const { data: atividades } = useAtividades();
  const { data: professores } = useProfessores();
  const { saveMutation: turmaSaveMutation, deleteMutation: turmaDeleteMutation } = useTurmaMutations();

  const handleSaveTurma = (data: TurmaFormData) => {
    const payload = {
      nome: data.nome,
      atividade_id: data.atividade_id,
      professor_id: data.professor_id || null,
      horario: data.horario,
      dias_semana: data.dias_semana,
      capacidade_maxima: data.capacidade_maxima,
      ativa: data.ativa,
    };

    turmaSaveMutation.mutate(
      { id: editingTurma?.id, data: payload },
      { onSuccess: () => handleCloseDialog() }
    );
  };

  const confirmDelete = () => {
    if (deletingId) {
      turmaDeleteMutation.mutate(deletingId, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setDeletingId(null);
        },
      });
    }
  };

  const handleOpenDialog = (turma?: any) => {
    if (turma) {
      setEditingTurma(turma);
      setFormData({
        nome: turma.nome,
        atividade_id: turma.atividade_id,
        professor_id: turma.professor_id,
        horario: turma.horario,
        dias_semana: turma.dias_semana,
        capacidade_maxima: turma.capacidade_maxima,
        ativa: turma.ativa,
      });
    } else {
      setEditingTurma(null);
      setFormData({
        nome: "",
        atividade_id: "",
        professor_id: null,
        horario: "",
        dias_semana: [],
        capacidade_maxima: 20,
        ativa: true,
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTurma(null);
    setFormErrors({});
  };

  const handleSubmit = () => {
    try {
      const validated = turmaSchema.parse(formData);
      setFormErrors({});
      handleSaveTurma(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setFormErrors(errors);
      }
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const toggleDia = (dia: string) => {
    setFormData((prev) => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(dia)
        ? prev.dias_semana.filter((d) => d !== dia)
        : [...prev.dias_semana, dia],
    }));
  };

  const filteredTurmas = turmas?.filter(t => 
    t.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.atividade?.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.professor?.user?.nome_completo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportAlunos = async (turma: any) => {
    try {
      toast({
        title: "Gerando PDF...",
        description: "Buscando dados dos alunos da turma.",
      });

      const rawData = await turmasService.fetchAlunosDaTurma(turma.id);
      
      // Map raw nested data to the flat structure expected by the PDF component
      const alunosData = rawData.map((m: any) => ({
        nome_completo: m.aluno.nome_completo,
        data_nascimento: m.aluno.data_nascimento,
        responsavel_nome: m.aluno.responsavel?.nome_completo,
        status_matricula: m.status
      }));

      const blob = await pdf(
        <ListaAlunosPDF
          turmaNome={turma.nome}
          atividadeNome={turma.atividade?.nome}
          alunos={alunosData}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lista-alunos-${turma.nome.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Lista exportada!",
        description: `O PDF da turma ${turma.nome} foi baixado.`,
      });
    } catch (error: any) {
      handleError(error, "Erro ao exportar lista de alunos");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Turmas</h1>
            <p className="text-muted-foreground mt-1 text-base">
              Gerencie as turmas e horários das atividades
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2 h-11 px-6 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
            <Plus className="h-5 w-5" />
            Nova Turma
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input 
              placeholder="Buscar por turma, professor ou atividade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 bg-muted/20 border-primary/10 focus-visible:ring-primary/20 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 p-1.5 bg-muted/30 rounded-xl border border-primary/5 self-stretch sm:self-auto">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                viewMode === "grid" 
                  ? "bg-background text-primary shadow-sm" 
                  : "text-muted-foreground hover:bg-background/50"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Grade
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                viewMode === "list" 
                  ? "bg-background text-primary shadow-sm" 
                  : "text-muted-foreground hover:bg-background/50"
              )}
            >
              <List className="h-4 w-4" />
              Lista
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-10" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTurmas && filteredTurmas.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTurmas.map((turma) => {
                const matriculasCount = turma.matriculas?.[0]?.count || 0;
                const occupancyPerc = (matriculasCount / turma.capacidade_maxima) * 100;
                
                return (
                  <Card 
                    key={turma.id} 
                    className={cn(
                      "group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 border-primary/10 flex flex-col cursor-pointer",
                      expandedTurmaIds.has(turma.id) ? "md:col-span-2 lg:col-span-3 border-primary/40 bg-primary/[0.01]" : "hover:border-primary/40"
                    )}
                    onClick={() => toggleExpand(turma.id)}
                  >
                    <div className={cn(
                      "absolute top-0 left-0 w-full h-1.5 opacity-60 transition-all duration-300",
                      expandedTurmaIds.has(turma.id) ? "h-2 bg-primary" : (
                        occupancyPerc >= 90 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]" : 
                        occupancyPerc >= 70 ? "bg-yellow-500" : "bg-primary"
                      )
                    )} />
                    
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5">
                          <CardTitle className="text-xl font-semibold">{turma.nome}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold bg-primary/5 border-none">
                              {turma.atividade?.nome}
                            </Badge>
                            {turma.ativa ? (
                              <Badge className="text-[9px] bg-green-500/10 text-green-500 border-none font-bold">● ATIVA</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] font-bold border-none">INATIVA</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-5 pt-2 flex-grow">
                      <div className="grid grid-cols-2 gap-3 pb-4 border-b border-primary/5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4 text-primary/60" />
                          <span className="text-xs font-medium">{turma.horario}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground justify-end">
                          <Calendar className="h-4 w-4 text-primary/60" />
                          <span className="text-[10px] font-bold uppercase truncate">{turma.dias_semana.join(", ")}</span>
                        </div>
                        {turma.professor?.user && (
                          <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                            <Users className="h-4 w-4 text-primary/60" />
                            <span className="text-xs">Prof: <span className="font-bold text-foreground">{turma.professor.user.nome_completo}</span></span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground">
                          <span>Ocupação</span>
                          <span className={cn(
                            "text-xs transition-colors",
                            occupancyPerc >= 90 ? "text-red-500" : "text-foreground"
                          )}>
                            {matriculasCount}/{turma.capacidade_maxima} alunos
                          </span>
                        </div>
                        <Progress value={occupancyPerc} className="h-2.5 bg-muted-foreground/10 overflow-hidden" />
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          variant={expandedTurmaIds.has(turma.id) ? "default" : "secondary"}
                          size="sm"
                          onClick={(e) => toggleExpand(turma.id, e)}
                          className={cn(
                             "h-9 flex-1 gap-2 font-bold text-xs border-none transition-all",
                             expandedTurmaIds.has(turma.id) ? "bg-muted text-foreground" : "bg-primary/5 hover:bg-primary/10 text-primary"
                          )}
                        >
                          <Users className="h-3.5 w-3.5" />
                          {expandedTurmaIds.has(turma.id) ? "Recolher Alunos" : "Ver Alunos"}
                        </Button>
                        <div className="flex gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExportAlunos(turma)}
                            className="h-9 w-9 text-primary hover:bg-primary/10"
                            title="Lista PDF"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(turma)}
                            className="h-9 w-9 text-blue-500 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(turma.id)}
                            className="h-9 w-9 text-destructive/60 hover:text-destructive hover:bg-destructive/5"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                    
                    {expandedTurmaIds.has(turma.id) && (
                      <div className="border-t border-primary/5 bg-primary/[0.01] animate-in fade-in duration-300">
                        <TurmaStudentGrid turmaId={turma.id} />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Turma / Atividade</th>
                    <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Horários & Dias</th>
                    <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ocupação</th>
                    <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Professor</th>
                    <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {filteredTurmas.map((turma) => {
                    const matriculasCount = turma.matriculas?.[0]?.count || 0;
                    const occupancyPerc = (matriculasCount / turma.capacidade_maxima) * 100;
                    
                    return (
                      <Fragment key={turma.id}>
                        <tr 
                          onClick={() => toggleExpand(turma.id)}
                          className={cn(
                            "hover:bg-primary/[0.02] transition-colors group cursor-pointer border-l-4",
                            expandedTurmaIds.has(turma.id) ? "bg-primary/[0.01] border-l-primary" : "border-l-transparent"
                          )}
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm text-foreground">{turma.nome}</span>
                              <span className="text-[10px] text-primary/60 font-bold uppercase">{turma.atividade?.nome}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-medium">{turma.horario}</span>
                              <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">{turma.dias_semana.join(", ")}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-40 space-y-1.5">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span>{matriculasCount}/{turma.capacidade_maxima}</span>
                                <span className={cn(
                                  occupancyPerc >= 90 ? "text-red-500" : "text-muted-foreground"
                                )}>{occupancyPerc.toFixed(0)}%</span>
                              </div>
                              <Progress value={occupancyPerc} className="h-1.5" />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium">{turma.professor?.user?.nome_completo || "Indefinido"}</span>
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                               <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => toggleExpand(turma.id, e)}
                                  className={cn("h-8 w-8 text-primary", expandedTurmaIds.has(turma.id) && "bg-primary/10")}
                                  title="Ver Alunos"
                                >
                                  <Users className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenDialog(turma)}
                                  className="h-8 w-8 text-blue-500"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(turma.id)}
                                  className="h-8 w-8 text-destructive/60"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                          </td>
                        </tr>
                        {expandedTurmaIds.has(turma.id) && (
                          <tr className="bg-primary/[0.005] hover:bg-primary/[0.005]">
                            <td colSpan={5} className="p-0 border-none">
                               <div className="border-l-4 border-primary">
                                  <TurmaStudentGrid turmaId={turma.id} />
                               </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <PremiumEmptyState
            title="Sua jornada começa aqui"
            description="Crie turmas para organizar horários, professores e alunos. Uma turma bem organizada é a base de um centro eficiente."
            icon={Users}
            actionLabel="Criar Primeira Turma"
            onAction={() => handleOpenDialog()}
          />
        )}

        {/* Dialog para criar/editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 overflow-hidden flex flex-col">
            <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
              <DialogTitle className="text-xl font-bold text-foreground">
                {editingTurma ? "Editar Turma" : "Nova Turma"}
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {editingTurma
                  ? "Atualize as informações da turma."
                  : "Preencha os dados para criar uma nova turma."}
              </DialogDescription>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Turma *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Futebol Iniciante - Manhã"
                />
                {formErrors.nome && (
                  <p className="text-sm text-destructive">{formErrors.nome}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="atividade_id">Atividade *</Label>
                <Select
                  value={formData.atividade_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, atividade_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma atividade" />
                  </SelectTrigger>
                  <SelectContent>
                    {atividades?.map((atividade) => (
                      <SelectItem key={atividade.id} value={atividade.id}>
                        {atividade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.atividade_id && (
                  <p className="text-sm text-destructive">{formErrors.atividade_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="professor_id">Professor</Label>
                <Select
                  value={formData.professor_id || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, professor_id: value || null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um professor (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {professores?.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.user.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horario">Horário *</Label>
                  <Input
                    id="horario"
                    value={formData.horario}
                    onChange={(e) =>
                      setFormData({ ...formData, horario: e.target.value })
                    }
                    placeholder="Ex: 14:00 - 15:30"
                  />
                  {formErrors.horario && (
                    <p className="text-sm text-destructive">{formErrors.horario}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacidade_maxima">Capacidade Máxima *</Label>
                  <Input
                    id="capacidade_maxima"
                    type="number"
                    min="1"
                    value={formData.capacidade_maxima}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacidade_maxima: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                  {formErrors.capacidade_maxima && (
                    <p className="text-sm text-destructive">
                      {formErrors.capacidade_maxima}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dias da Semana *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DIAS_SEMANA.map((dia) => (
                    <div key={dia} className="flex items-center space-x-2">
                      <Checkbox
                        id={dia}
                        checked={formData.dias_semana.includes(dia)}
                        onCheckedChange={() => toggleDia(dia)}
                      />
                      <label
                        htmlFor={dia}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {dia}
                      </label>
                    </div>
                  ))}
                </div>
                {formErrors.dias_semana && (
                  <p className="text-sm text-destructive">{formErrors.dias_semana}</p>
                )}
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-primary/10 bg-muted/20 shrink-0">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                disabled={turmaSaveMutation.isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={turmaSaveMutation.isPending}>
                {turmaSaveMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingTurma ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmação para deletar */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta turma? Esta ação não pode ser
                desfeita e pode afetar matrículas associadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={turmaDeleteMutation.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={turmaDeleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {turmaDeleteMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Dialog de Certificados */}
        {selectedTurmaCertificados && (
          <GerarCertificadosDialog
            open={!!selectedTurmaCertificados}
            onOpenChange={(open) => !open && setSelectedTurmaCertificados(null)}
            turma={selectedTurmaCertificados}
          />
        )}

      </div>
    </DashboardLayout>
  );
};

export default Turmas;
