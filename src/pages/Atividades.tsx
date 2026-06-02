import React, { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Loader2, Sparkles, LayoutGrid, List, Search, Users, Activity, Music, Swords, BookOpen, Heart, Palette, Trophy, ShieldCheck, ChevronDown, User } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/utils/error-handler";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserCheck, UserMinus, GraduationCap } from "lucide-react";

const generateWhatsAppLink = (phone: string, message: string) => {
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=${encodeURIComponent(message)}`;
};

const atividadeSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  descricao: z.string().trim().max(500, "Descrição muito longa").optional().nullable(),
  valor_mensal: z.number().positive("Valor deve ser positivo").max(99999, "Valor muito alto"),
  capacidade_maxima: z.number().int().positive("Capacidade deve ser positiva").max(9999, "Capacidade muito alta").optional().nullable(),
  ativa: z.boolean(),
});

type AtividadeFormData = z.infer<typeof atividadeSchema>;

const Atividades = () => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AtividadeFormData>({
    nome: "",
    descricao: "",
    valor_mensal: 0,
    capacidade_maxima: null,
    ativa: true,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedActivityIds, setExpandedActivityIds] = useState<Set<string>>(new Set());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const toggleExpand = (id: string) => {
    setExpandedActivityIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch atividades
  const { data: atividades, isLoading } = useQuery({
    queryKey: ["atividades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atividades")
        .select(`
          *,
          turmas (
            id,
            nome,
            matriculas (
              id,
              status,
              aluno:alunos (
                id,
                nome_completo,
                foto_url,
                cpf,
                rg,
                telefone,
                anamneses (
                  is_pne,
                  pne_cid,
                  alergias,
                  laudo_url
                )
              )
            )
          )
        `)
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: AtividadeFormData) => {
      const payload = {
        nome: data.nome,
        descricao: data.descricao || null,
        valor_mensal: data.valor_mensal,
        capacidade_maxima: data.capacidade_maxima || null,
        ativa: data.ativa,
      };

      if (editingAtividade) {
        const { error } = await supabase
          .from("atividades")
          .update(payload)
          .eq("id", editingAtividade.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("atividades")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      toast({
        title: editingAtividade ? "Atividade atualizada" : "Atividade criada",
        description: editingAtividade
          ? "A atividade foi atualizada com sucesso."
          : "A atividade foi criada com sucesso.",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar a atividade.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("atividades")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      toast({
        title: "Atividade excluída",
        description: "A atividade foi excluída com sucesso.",
      });
      setDeleteDialogOpen(false);
      setDeletingId(null);
    },
    onError: (error) => {
      handleError(error, "Erro ao salvar atividade");
    },
  });

  const handleOpenDialog = (atividade?: any) => {
    if (atividade) {
      setEditingAtividade(atividade);
      setFormData({
        nome: atividade.nome,
        descricao: atividade.descricao || "",
        valor_mensal: parseFloat(atividade.valor_mensal),
        capacidade_maxima: atividade.capacidade_maxima,
        ativa: atividade.ativa,
      });
    } else {
      setEditingAtividade(null);
      setFormData({
        nome: "",
        descricao: "",
        valor_mensal: 0,
        capacidade_maxima: null,
        ativa: true,
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAtividade(null);
    setFormErrors({});
  };

  const handleSubmit = () => {
    try {
      const validated = atividadeSchema.parse(formData);
      setFormErrors({});
      saveMutation.mutate(validated);
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

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate(deletingId);
    }
  };

  const getActivityIcon = (nome: string) => {
    const n = nome.toLowerCase();
    if (n.includes("jiu") || n.includes("jitsu") || n.includes("luta") || n.includes("jud")) return <Swords className="h-5 w-5" />;
    if (n.includes("ballet") || n.includes("dança") || n.includes("musica")) return <Music className="h-5 w-5" />;
    if (n.includes("futebol") || n.includes("esporte")) return <Trophy className="h-5 w-5" />;
    if (n.includes("inglês") || n.includes("aula") || n.includes("estudo")) return <BookOpen className="h-5 w-5" />;
    if (n.includes("terapia") || n.includes("psico") || n.includes("saude")) return <Heart className="h-5 w-5" />;
    if (n.includes("desenho") || n.includes("arte") || n.includes("pintura")) return <Palette className="h-5 w-5" />;
    return <Activity className="h-5 w-5" />;
  };

  const filteredAtividades = atividades?.filter(a => 
    a.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.descricao && a.descricao.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getOccupancyInfo = (atividade: any) => {
    let totalMatriculasAtivas = 0;
    atividade.turmas?.forEach((t: any) => {
      totalMatriculasAtivas += t.matriculas?.filter((m: any) => m.status === 'ativa').length || 0;
    });

    const capacidade = atividade.capacidade_maxima || 0;
    const porcentagem = capacidade > 0 ? (totalMatriculasAtivas / capacidade) * 100 : 0;
    
    return {
      total: totalMatriculasAtivas,
      capacidade,
      porcentagem: Math.min(porcentagem, 100)
    };
  };

  const getOccupancyColor = (porcentagem: number) => {
    if (porcentagem >= 90) return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]";
    if (porcentagem >= 75) return "bg-orange-500";
    if (porcentagem >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  const renderStudentDetails = (atividade: any) => {
    if (!atividade.turmas || atividade.turmas.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/5 rounded-xl border-2 border-dashed border-muted/20">
          <GraduationCap className="h-8 w-8 text-muted-foreground mb-2 opacity-20" />
          <p className="text-xs text-muted-foreground font-medium">Nenhuma turma cadastrada</p>
          <Button variant="link" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/turmas'); }} className="text-primary text-[10px] font-bold uppercase">
             Criar Turma Agora
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6 mt-4">
        {atividade.turmas.map((turma: any) => {
          const matriculasAtivas = turma.matriculas?.filter((m: any) => m.status === 'ativa') || [];
          
          return (
            <div key={turma.id} className="space-y-3">
              <div className="flex items-center justify-between border-b pb-1 border-primary/10">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-bold text-foreground">{turma.nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] font-bold tracking-tighter">
                    {matriculasAtivas.length} ATIVOS
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10"
                    onClick={(e) => { e.stopPropagation(); navigate('/direcao/matriculas'); }}
                  >
                    + MATRICULAR
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {turma.matriculas?.length > 0 ? (
                  turma.matriculas.sort((a: any, b: any) => a.aluno.nome_completo.localeCompare(b.aluno.nome_completo)).map((m: any) => {
                    const health = m.aluno.anamneses?.[0];
                    const missingDocs = !m.aluno.cpf || !m.aluno.rg || (health?.is_pne && !health?.laudo_url);

                    return (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-primary/5 hover:border-primary/20 transition-all group/student">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-7 w-7 border border-primary/10">
                            <AvatarImage src={m.aluno.foto_url} />
                            <AvatarFallback className="text-[10px] bg-primary/5 text-primary font-bold">
                              {m.aluno.nome_completo.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="truncate cursor-pointer hover:underline decoration-primary/30" onClick={() => navigate('/alunos', { state: { search: m.aluno.nome_completo } })}>
                            <p className="text-xs font-bold text-foreground truncate">
                              {m.aluno.nome_completo}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {m.status === 'ativa' ? (
                                <Badge className="h-3 px-1 text-[8px] bg-green-500/20 text-green-600 hover:bg-green-500/20 border-0">ATIVO</Badge>
                              ) : (
                                <Badge variant="outline" className="h-3 px-1 text-[8px] border-muted text-muted-foreground uppercase">{m.status}</Badge>
                              )}
                              
                              {health?.alergias && <span title={`Alergia: ${health.alergias}`} className="text-xs">🧪</span>}
                              {health?.is_pne && <span title={`PNE: ${health.pne_cid || 'Não inf.'}`} className="text-xs">🏷️</span>}
                              {missingDocs && <span title="Documentação Pendente" className="text-xs">📄</span>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-1 opacity-0 group-hover/student:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-600 hover:bg-green-100"
                            onClick={() => {
                               const link = generateWhatsAppLink(m.aluno.telefone || '', `Olá, gostaria de falar sobre o aluno ${m.aluno.nome_completo}`);
                               window.open(link, "_blank");
                            }}
                          >
                             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-primary hover:bg-primary/10"
                            onClick={() => navigate('/alunos', { state: { search: m.aluno.nome_completo } })}
                          >
                            <User className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-2 text-center">
                    <p className="text-[10px] text-muted-foreground italic">Sem matriculas nesta turma</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Atividades</h1>
            <p className="text-muted-foreground mt-1 text-base">
              Painel de controle e ocupação das modalidades
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2 h-11 px-6 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
            <Plus className="h-5 w-5" />
            Nova Atividade
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input 
              placeholder="Buscar atividade por nome ou descrição..."
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-10" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
                ) : filteredAtividades && filteredAtividades.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredAtividades.map((atividade) => {
                const occupancy = getOccupancyInfo(atividade);
                return (
                  <Card 
                    key={atividade.id} 
                    className="group relative overflow-hidden border-border hover:border-primary/40 transition-all hover:shadow-lg cursor-pointer"
                    onClick={() => toggleExpand(atividade.id)}
                  >
                    <div className={cn(
                      "absolute top-0 left-0 w-full h-1 opacity-60 transition-all duration-300",
                      expandedActivityIds.has(atividade.id) ? "h-2 bg-primary" : getOccupancyColor(occupancy.porcentagem)
                    )} />
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                            {getActivityIcon(atividade.nome)}
                          </div>
                          <div>
                            <CardTitle className="text-xl font-bold">{atividade.nome}</CardTitle>
                            <Badge variant={atividade.ativa ? "outline" : "secondary"} className={cn(
                                "text-[10px] uppercase font-bold px-2 py-0 border-none",
                                atividade.ativa ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"
                            )}>
                              {atividade.ativa ? "● Ativa" : "● Inativa"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {atividade.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-3 leading-relaxed">
                          {atividade.descricao}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-6 pt-2">
                      <div className="space-y-2">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">Ocupação</span>
                          <span className="text-xs font-bold text-foreground">{occupancy.total}/{occupancy.capacidade} alunos</span>
                        </div>
                        <Progress value={occupancy.porcentagem} className="h-2 bg-muted-foreground/10 overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-500", getOccupancyColor(occupancy.porcentagem))}
                            style={{ width: `${occupancy.porcentagem}%` }}
                          />
                        </Progress>
                        <p className="text-[9px] text-right text-muted-foreground/60 italic">Taxa de ocupação: {occupancy.porcentagem.toFixed(0)}%</p>
                      </div>

                      <div className="pt-4 border-t border-primary/5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Mensalidade</p>
                          <p className="text-xl font-bold text-primary">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(parseFloat(atividade.valor_mensal.toString()))}
                          </p>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                             variant="ghost"
                             size="icon"
                             className={cn(
                               "h-8 w-8 transition-transform duration-300",
                               expandedActivityIds.has(atividade.id) ? "rotate-180 bg-primary/10" : ""
                             )}
                             onClick={() => toggleExpand(atividade.id)}
                          >
                             <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => handleOpenDialog(atividade)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(atividade.id)}
                            className="h-9 w-9 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-destructive/60"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                    {expandedActivityIds.has(atividade.id) && (
                      <div 
                        className="px-5 pb-5 pt-2 border-t border-primary/5 animate-in fade-in slide-in-from-top-2 duration-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {renderStudentDetails(atividade)}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-primary/10 overflow-hidden bg-card/30">
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Modalidade</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Ocupação</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Mensalidade</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wide text-muted-foreground text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {filteredAtividades.map((atividade) => {
                    const occupancy = getOccupancyInfo(atividade);
                    return (
                      <React.Fragment key={atividade.id}>
                        <tr 
                          className={cn(
                            "hover:bg-primary/5 transition-colors group cursor-pointer border-l-4",
                            expandedActivityIds.has(atividade.id) ? "bg-primary/5 border-l-primary" : "border-l-transparent"
                          )}
                          onClick={() => toggleExpand(atividade.id)}
                        >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                              {getActivityIcon(atividade.nome)}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-foreground">{atividade.nome}</p>
                                <p className="text-[10px] text-muted-foreground">{atividade.ativa ? "Ativa" : "Inativa"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-48 space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span>{occupancy.total}/{occupancy.capacidade}</span>
                              <span className={cn(
                                occupancy.porcentagem >= 90 ? "text-red-500" : "text-muted-foreground"
                              )}>{occupancy.porcentagem.toFixed(0)}%</span>
                            </div>
                            <Progress value={occupancy.porcentagem} className="h-1.5 bg-muted-foreground/10" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-sm text-primary">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(parseFloat(atividade.valor_mensal.toString()))}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8 text-primary transition-transform duration-300",
                                expandedActivityIds.has(atividade.id) ? "rotate-180 bg-primary/10" : ""
                              )}
                              onClick={(e) => { e.stopPropagation(); toggleExpand(atividade.id); }}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-md"
                              onClick={() => handleOpenDialog(atividade)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(atividade.id)}
                              className="h-8 w-8 rounded-md text-destructive/60 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedActivityIds.has(atividade.id) && (
                        <tr className="bg-primary/[0.02] border-l-4 border-l-primary animate-in fade-in duration-300">
                          <td colSpan={viewMode === "list" ? 4 : 5} className="px-6 py-4">
                            <div onClick={(e) => e.stopPropagation()}>
                              {renderStudentDetails(atividade)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <PremiumEmptyState
            title="Nenhuma atividade ainda"
            description="Comece criando a primeira atividade do seu centro. Isso permitirá gerenciar turmas e matrículas de forma eficiente."
            icon={Sparkles}
            actionLabel="Criar Primeira Atividade"
            onAction={() => handleOpenDialog()}
          />
        )}

        {/* Dialog para criar/editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingAtividade ? "Editar Atividade" : "Nova Atividade"}
              </DialogTitle>
              <DialogDescription>
                {editingAtividade
                  ? "Atualize as informações da atividade."
                  : "Preencha os dados para criar uma nova atividade."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Jiu-Jitsu"
                />
                {formErrors.nome && (
                  <p className="text-sm text-destructive">{formErrors.nome}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Breve descrição da atividade"
                  rows={3}
                />
                {formErrors.descricao && (
                  <p className="text-sm text-destructive">{formErrors.descricao}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_mensal">Valor Mensal (R$) *</Label>
                  <Input
                    id="valor_mensal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_mensal || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        valor_mensal: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                  />
                  {formErrors.valor_mensal && (
                    <p className="text-sm text-destructive">
                      {formErrors.valor_mensal}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacidade_maxima">Capacidade Máxima</Label>
                  <Input
                    id="capacidade_maxima"
                    type="number"
                    min="1"
                    value={formData.capacidade_maxima || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacidade_maxima: e.target.value
                          ? parseInt(e.target.value, 10)
                          : null,
                      })
                    }
                    placeholder="Ex: 30"
                  />
                  {formErrors.capacidade_maxima && (
                    <p className="text-sm text-destructive">
                      {formErrors.capacidade_maxima}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="ativa">Atividade Ativa</Label>
                <Switch
                  id="ativa"
                  checked={formData.ativa}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, ativa: checked })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                disabled={saveMutation.isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingAtividade ? "Atualizar" : "Criar"}
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
                Tem certeza que deseja excluir esta atividade? Esta ação não pode
                ser desfeita e pode afetar turmas e matrículas associadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Detalhes da Atividade - Movidos para In-line (Accordion) */}
      </div>
    </DashboardLayout>
  );
};

export default Atividades;
