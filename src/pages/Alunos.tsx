import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Loader2, Search, UserPlus, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ContactTimeline } from "@/components/alunos/ContactTimeline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Eye,
  Calendar,
  IdCard,
  Phone,
  MapPin,
  Users,
  Check,
  ChevronsUpDown,
  CalendarClock,
  AlertCircle,
  CheckCircle,
  Save,
  X,
  Briefcase,
  Heart,
  Activity,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/utils/error-handler";
import { useAuth } from "@/contexts/AuthContext";
import { formatCPF, unmaskCPF, validateCPF } from "@/utils/cpf";
import { AlunoFormModal } from "@/components/alunos/AlunoFormModal";

const Alunos = () => {
  // Helper para renderizar valores pendentes com estilo
  const renderVal = (val: any, label: string = "Não informado") => {
    if (!val || val === "" || val === "---") {
      return <span className="text-muted-foreground/40 italic font-normal">{label}</span>;
    }
    return val;
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAluno, setEditingAluno] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    bairro: "all",
    escola: "all",
    statusSaude: "all", // all, pne, cronica
    governanca: "all", // all, img_pendente, dec_pendente
  });

  // State Contact Timeline
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [selectedAlunoForTimeline, setSelectedAlunoForTimeline] = useState<any>(null);
  const [fichaOpen, setFichaOpen] = useState(false);
  const [selectedAlunoForFicha, setSelectedAlunoForFicha] = useState<any>(null);

  // State Vincular Responsável
  const [vincularOpen, setVincularOpen] = useState(false);
  const [selectedAlunoForVincular, setSelectedAlunoForVincular] = useState<any>(null);
  const [parentSearch, setParentSearch] = useState("");
  const [showSemResponsavel, setShowSemResponsavel] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const location = useLocation();

  // Auto-fill search filter from navigation state
  useEffect(() => {
    if (location.state?.search) {
      setSearchTerm(location.state.search);
      // Limpa o state para não reaplicar o filtro se o usuário navegar de volta
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch alunos
  const { data: alunos, isLoading } = useQuery({
    queryKey: ["alunos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alunos")
        .select(`
          *,
          responsavel:profiles!alunos_responsavel_id_fkey(nome_completo, email),
          anamneses(*)
        `)
        .order("nome_completo");

      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles (for responsable selection)
  const { data: profiles } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome_completo, email")
        .order("nome_completo");

      if (error) throw error;
      return data;
    },
    enabled: user?.role === "direcao" || user?.role === "coordenacao" || user?.role === "secretaria",
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alunos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      toast({
        title: "Aluno excluído",
        description: "O aluno foi excluído com sucesso.",
      });
      setDeleteDialogOpen(false);
      setDeletingId(null);
    },
    onError: (error: any) => {
      handleError(error, "Erro ao excluir aluno");
    },
  });

  // Query busca de responsáveis reais para vinculação
  const { data: realParents } = useQuery({
    queryKey: ["real-parents-search", parentSearch],
    enabled: parentSearch.length >= 2,
    queryFn: async () => {
      const GHOST_NAMES = ["Responsável Legado", "LEGADO - Pendente de Responsável"];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome_completo, email")
        .not("nome_completo", "in", `(${GHOST_NAMES.map(n => `"${n}"`).join(",")})`)
        .or(`nome_completo.ilike.%${parentSearch}%,email.ilike.%${parentSearch}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation para vincular aluno a responsável real
  const vincularMutation = useMutation({
    mutationFn: async ({ alunoId, parentId }: { alunoId: string; parentId: string }) => {
      const { error } = await supabase
        .from("alunos")
        .update({ responsavel_id: parentId })
        .eq("id", alunoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      setVincularOpen(false);
      setSelectedAlunoForVincular(null);
      setParentSearch("");
      toast({ title: "Responsável vinculado", description: "O aluno foi vinculado com sucesso." });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenDialog = (aluno?: any) => {
    if (aluno) {
      setEditingAluno(aluno);
    } else {
      setEditingAluno(null);
    }
    setDialogOpen(true);
  };

  // Mantém o aluno sendo editado atualizado com os dados mais recentes da query
  useEffect(() => {
    if (dialogOpen && editingAluno && alunos) {
      const updatedAluno = alunos.find((a: any) => a.id === editingAluno.id);
      if (updatedAluno && JSON.stringify(updatedAluno) !== JSON.stringify(editingAluno)) {
        setEditingAluno(updatedAluno);
      }
    }
  }, [alunos, dialogOpen, editingAluno]);

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAluno(null);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleOpenTimeline = (aluno: any) => {
    setSelectedAlunoForTimeline(aluno);
    setTimelineOpen(true);
  };

  const handleOpenFicha = (aluno: any) => {
    setSelectedAlunoForFicha(aluno);
    setFichaOpen(true);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate(deletingId);
    }
  };

  const GHOST_NAMES = ["Responsável Legado", "LEGADO - Pendente de Responsável"];
  const isSemResponsavel = (aluno: any) =>
    !aluno.responsavel || GHOST_NAMES.includes(aluno.responsavel?.nome_completo);

  const semResponsavelCount = alunos?.filter(isSemResponsavel).length ?? 0;

  const filteredAlunos = alunos?.filter((aluno) => {
    if (showSemResponsavel) return isSemResponsavel(aluno);

    const matchesSearch = aluno.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aluno.cpf?.includes(searchTerm) ||
      aluno.bairro?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBairro = activeFilters.bairro === "all" || aluno.bairro === activeFilters.bairro;
    const matchesEscola = activeFilters.escola === "all" || aluno.escola === activeFilters.escola;

    const anamnese = aluno.anamneses?.[0];
    const matchesSaude = activeFilters.statusSaude === "all" ||
      (activeFilters.statusSaude === "pne" && anamnese?.is_pne) ||
      (activeFilters.statusSaude === "cronica" && anamnese?.doenca_cronica);

    const matchesGov = activeFilters.governanca === "all" ||
      (activeFilters.governanca === "img_pendente" && !aluno.autoriza_imagem) ||
      (activeFilters.governanca === "dec_pendente" && !aluno.declaracao_assinada);

    return matchesSearch && matchesBairro && matchesEscola && matchesSaude && matchesGov;
  });

  const uniqueBairros = Array.from(new Set(alunos?.map(a => a.bairro).filter(Boolean)));
  const uniqueEscolas = Array.from(new Set(alunos?.map(a => a.escola).filter(Boolean)));

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alunos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie todos os alunos cadastrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            {semResponsavelCount > 0 && (
              <Button
                variant={showSemResponsavel ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSemResponsavel(!showSemResponsavel)}
                className={`gap-2 ${showSemResponsavel ? "" : "border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"}`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Sem Responsável
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${showSemResponsavel ? "bg-primary-foreground/20 text-primary-foreground" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`}>
                  {semResponsavelCount}
                </span>
              </Button>
            )}
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Aluno
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar aluno por nome, CPF ou bairro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={activeFilters.bairro} onValueChange={(v) => setActiveFilters({ ...activeFilters, bairro: v })}>
              <SelectTrigger className="w-fit min-w-[140px] h-9 bg-background/50">
                <SelectValue placeholder="Bairro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Bairros</SelectItem>
                {uniqueBairros.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={activeFilters.escola} onValueChange={(v) => setActiveFilters({ ...activeFilters, escola: v })}>
              <SelectTrigger className="w-fit min-w-[140px] h-9 bg-background/50">
                <SelectValue placeholder="Escola" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Escolas</SelectItem>
                {uniqueEscolas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={activeFilters.statusSaude} onValueChange={(v) => setActiveFilters({ ...activeFilters, statusSaude: v })}>
              <SelectTrigger className="w-fit min-w-[140px] h-9 bg-background/50 transition-colors data-[state=open]:border-primary/50">
                <SelectValue placeholder="Saúde" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status de Saúde</SelectItem>
                <SelectItem value="pne" className="text-red-600 font-medium">Somente PNE</SelectItem>
                <SelectItem value="cronica" className="text-orange-600 font-medium">Doença Crônica</SelectItem>
              </SelectContent>
            </Select>

            <Select value={activeFilters.governanca} onValueChange={(v) => setActiveFilters({ ...activeFilters, governanca: v })}>
              <SelectTrigger className="w-fit min-w-[140px] h-9 bg-background/50">
                <SelectValue placeholder="Governança" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Governança</SelectItem>
                <SelectItem value="img_pendente">Sem Autoriza. Imagem</SelectItem>
                <SelectItem value="dec_pendente">Sem Declaração Assinada</SelectItem>
              </SelectContent>
            </Select>

            {(activeFilters.bairro !== "all" || activeFilters.escola !== "all" || activeFilters.statusSaude !== "all" || activeFilters.governanca !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveFilters({ bairro: "all", escola: "all", statusSaude: "all", governanca: "all" })}
                className="h-9 text-xs text-muted-foreground hover:text-primary"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[100px] w-full rounded-lg" />
            <Skeleton className="h-[100px] w-full rounded-lg" />
            <Skeleton className="h-[100px] w-full rounded-lg" />
          </div>
        ) : filteredAlunos && filteredAlunos.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Lista de Alunos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead className="hidden md:table-cell">CPF/RG</TableHead>
                        <TableHead className="hidden md:table-cell">Bairro</TableHead>
                        <TableHead className="hidden lg:table-cell text-center">Saúde</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAlunos.map((aluno) => (
                        <TableRow key={aluno.id} className="group hover:bg-primary/[0.02] transition-colors">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border-2 border-primary/20 overflow-hidden">
                                  {aluno.foto_url ? (
                                    <img src={aluno.foto_url} alt={aluno.nome_completo} className="w-full h-full object-cover" />
                                  ) : (
                                    aluno.nome_completo.charAt(0)
                                  )}
                                </div>
                                {aluno.anamneses?.[0]?.is_pne && (
                                  <div className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold border-2 border-background animate-pulse" title="PNE">
                                    !
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <button
                                  onClick={() => handleOpenDialog(aluno)}
                                  className="font-bold text-foreground hover:text-primary transition-colors text-left focus:outline-none"
                                >
                                  {aluno.nome_completo}
                                </button>
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                  {aluno.serie_ano || "Série não inf."}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {renderVal(aluno.cpf ? formatCPF(aluno.cpf) : aluno.rg, "Sem doc.")}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-50" />
                              <span className="truncate max-w-[150px]">{renderVal(aluno.bairro, "Não inf.")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-center">
                            {aluno.anamneses?.[0]?.is_pne ? (
                               <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-none">Alerta</Badge>
                            ) : (
                               <Badge variant="outline" className="border-green-500/20 bg-green-500/10 text-green-500 shadow-none">Estável</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isSemResponsavel(aluno) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setSelectedAlunoForVincular(aluno); setVincularOpen(true); }}
                                  className="h-8 px-2.5 gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                  <span className="hidden lg:inline">Vincular</span>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenTimeline(aluno)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                title="Histórico"
                              >
                                <CalendarClock className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenFicha(aluno)}
                                className="h-8 px-2.5 gap-1.5 font-medium bg-secondary/50 hover:bg-secondary"
                              >
                                <IdCard className="h-3.5 w-3.5" />
                                <span className="hidden lg:inline">Ficha</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(aluno)}
                                className="h-9 w-9 p-0 text-muted-foreground hover:text-primary transition-colors"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(aluno.id)}
                                className="h-8 w-8 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-primary/5">
                  {filteredAlunos.map((aluno) => (
                    <div key={aluno.id} className="p-4 space-y-4 hover:bg-primary/[0.02] active:bg-primary/[0.05] transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base border-2 border-primary/20 overflow-hidden">
                              {aluno.foto_url ? (
                                <img src={aluno.foto_url} alt={aluno.nome_completo} className="w-full h-full object-cover" />
                              ) : (
                                aluno.nome_completo.charAt(0)
                              )}
                            </div>
                            {aluno.anamneses?.[0]?.is_pne && (
                              <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold border-2 border-background animate-pulse">
                                !
                              </div>
                            )}
                          </div>
                          <div>
                            <button
                              onClick={() => handleOpenFicha(aluno)}
                              className="font-semibold text-foreground text-left leading-tight"
                            >
                              {aluno.nome_completo}
                            </button>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {aluno.serie_ano || "Série não informada"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {aluno.anamneses?.[0]?.is_pne ? (
                            <Badge className="bg-red-500/10 text-red-500 border-none text-[9px] h-5 uppercase px-1.5 font-semibold">Saúde !</Badge>
                          ) : (
                            <Badge className="bg-green-500/10 text-green-500 border-none text-[9px] h-5 uppercase px-1.5 font-semibold">OK</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground p-2 rounded-lg bg-muted/20">
                          <IdCard className="h-3.5 w-3.5 shrink-0 opacity-50" />
                          <span className="truncate">{renderVal(aluno.cpf ? formatCPF(aluno.cpf) : aluno.rg, "-")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground p-2 rounded-lg bg-muted/20">
                          <MapPin className="h-3.5 w-3.5 shrink-0 opacity-50" />
                          <span className="truncate">{renderVal(aluno.bairro, "-")}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenFicha(aluno)}
                          className="flex-1 h-11 gap-2 font-bold bg-primary/10 hover:bg-primary/20 text-primary border-none active:scale-[0.98] transition-all"
                        >
                          <Eye className="h-5 w-5" />
                          Ficha
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(aluno)}
                          className="h-11 w-11 border border-primary/10 text-muted-foreground hover:text-primary active:scale-95 transition-transform"
                        >
                          <Pencil className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenTimeline(aluno)}
                          className="h-11 w-11 border border-primary/10 text-muted-foreground hover:text-primary active:scale-95 transition-transform"
                        >
                          <CalendarClock className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(aluno.id)}
                          className="h-11 w-11 border border-destructive/10 text-destructive/70 hover:text-destructive hover:bg-destructive/10 ml-auto active:scale-95 transition-transform"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <PremiumEmptyState
            title={searchTerm ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado"}
            description={searchTerm
              ? `Não encontramos resultados para "${searchTerm}". Tente buscar por outro nome.`
              : "Comece cadastrando seu primeiro aluno para gerenciar matrículas e presenças."}
            icon={UserPlus}
            actionLabel={!searchTerm ? "Cadastrar Primeiro Aluno" : undefined}
            onAction={!searchTerm ? () => handleOpenDialog() : undefined}
          />
        )}
        {/* Modal de Cadastro/Edição de Aluno */}
        <AlunoFormModal
          open={dialogOpen}
          onOpenChange={(open) => { if (!open) handleCloseDialog(); }}
          alunoToEdit={editingAluno}
        />

        {/* Dialog de confirmação para deletar */}
        < AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este aluno? Esta ação não pode ser
                desfeita e irá remover todas as matrículas associadas.
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
        </AlertDialog >

        {/* Dialog Vincular Responsável */}
        <Dialog
          open={vincularOpen}
          onOpenChange={(open) => {
            if (!open) { setVincularOpen(false); setSelectedAlunoForVincular(null); setParentSearch(""); }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-amber-500" />
                Vincular Responsável
              </DialogTitle>
              <DialogDescription>
                Escolha o responsável real para <strong>{selectedAlunoForVincular?.nome_completo}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  value={parentSearch}
                  onChange={(e) => setParentSearch(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              {parentSearch.length >= 2 ? (
                <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-2">
                  {realParents && realParents.length > 0 ? (
                    realParents.map((parent: any) => (
                      <button
                        key={parent.id}
                        className="w-full text-left px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
                        onClick={() => vincularMutation.mutate({ alunoId: selectedAlunoForVincular.id, parentId: parent.id })}
                        disabled={vincularMutation.isPending}
                      >
                        <p className="font-semibold text-sm text-foreground">{parent.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">{parent.email}</p>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum responsável encontrado</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Digite pelo menos 2 caracteres para buscar
                </p>
              )}
              {vincularMutation.isPending && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Vinculando...</span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Sheet do Histórico de Contatos */}
        < Sheet open={timelineOpen} onOpenChange={setTimelineOpen} >
          <SheetContent className="sm:max-w-[400px] w-full">
            <SheetHeader className="mb-4">
              <SheetTitle>Histórico de Contatos</SheetTitle>
              <SheetDescription>
                Registros de interações com {selectedAlunoForTimeline?.nome_completo}
              </SheetDescription>
            </SheetHeader>
            {selectedAlunoForTimeline && (
              <ContactTimeline alunoId={selectedAlunoForTimeline.id} />
            )}
          </SheetContent>
        </Sheet >

        {/* Dialog da Ficha Digital do Aluno (Audit 3.0+) - Premium Redesign */}
        < Dialog open={fichaOpen} onOpenChange={setFichaOpen} >
          <DialogContent className="w-[95vw] sm:max-w-[650px] max-h-[90vh] p-0 flex flex-col bg-background/95 backdrop-blur-xl border-primary/10 overflow-hidden shadow-2xl">
            {/* Header com Gradiente e Foto */}
            <div className="relative shrink-0 h-40 sm:h-48 bg-gradient-to-br from-neomissio-primary/30 via-background to-background border-b border-primary/10">
              <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
              <div className="absolute -bottom-6 sm:bottom-[-40px] left-4 sm:left-8 flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-6 z-10 w-full sm:w-auto px-4 sm:px-0 text-center sm:text-left">
                <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-neomissio-primary/40 to-primary/10 p-1 shadow-2xl backdrop-blur-md shrink-0">
                  <div className="h-full w-full rounded-[14px] sm:rounded-[22px] bg-background flex items-center justify-center border border-white/10">
                    {selectedAlunoForFicha?.foto_url ? (
                      <img src={selectedAlunoForFicha.foto_url} alt={selectedAlunoForFicha?.nome_completo} className="h-full w-full object-cover rounded-[14px] sm:rounded-[22px]" />
                    ) : (
                      <span className="text-3xl sm:text-4xl font-bold text-primary">{selectedAlunoForFicha?.nome_completo?.charAt(0)}</span>
                    )}
                  </div>
                </div>
                <div className="pb-0 sm:pb-4 overflow-hidden w-full">
                  <DialogTitle className="text-xl sm:text-3xl font-bold text-foreground sm:text-white tracking-tight truncate px-2">{selectedAlunoForFicha?.nome_completo}</DialogTitle>
                  <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 mt-1 sm:mt-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border border-primary/20">
                      {selectedAlunoForFicha?.serie_ano || "Série pendente"}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> ID: {selectedAlunoForFicha?.id?.slice(0, 8)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-24 sm:pt-16 pb-12 space-y-10">
              {/* Grid de Dados Rápidos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-muted/20 border border-white/5 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Idade</p>
                  <p className="text-lg font-bold text-foreground">{calculateAge(selectedAlunoForFicha?.data_nascimento)} anos</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/20 border border-white/5 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Bairro</p>
                  <p className="text-lg font-bold text-foreground truncate">{renderVal(selectedAlunoForFicha?.bairro, "Pendente")}</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/20 border border-white/5 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Saúde</p>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("h-3 w-3 rounded-full", selectedAlunoForFicha?.anamneses?.[0]?.is_pne ? "bg-red-500 animate-pulse" : "bg-green-500")} />
                    <p className="text-xs font-bold">{selectedAlunoForFicha?.anamneses?.[0]?.is_pne ? "Alerta" : "Estável"}</p>
                  </div>
                </div>
              </div>

              {/* Seções de Detalhes */}
              <div className="space-y-8">
                {/* 1. Documentação e Contato */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                      <div className="p-1.5 rounded-lg bg-primary/10"><IdCard className="h-4 w-4" /></div>
                      Identificação & Contato
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 sm:gap-y-6 p-4 sm:p-6 rounded-3xl bg-muted/10 border border-white/5">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">CPF do Aluno</p>
                      <p className="font-semibold text-foreground text-sm">{renderVal(selectedAlunoForFicha?.cpf)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">RG do Aluno</p>
                      <p className="font-semibold text-foreground text-sm">{renderVal(selectedAlunoForFicha?.rg)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Telefone de Contato</p>
                      <p className="font-semibold text-foreground text-sm">{renderVal(selectedAlunoForFicha?.telefone)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Escola de Origem</p>
                      <p className="font-semibold text-foreground text-sm">{renderVal(selectedAlunoForFicha?.escola)}</p>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <p className="text-xs text-muted-foreground">Endereço Residencial</p>
                      <p className="font-semibold text-foreground text-sm">{renderVal(selectedAlunoForFicha?.endereco)}</p>
                    </div>
                  </div>
                </section>

                {/* 2. Responsável Legal (New Section) */}
                <section>
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-4">
                    <div className="p-1.5 rounded-lg bg-primary/10"><Users className="h-4 w-4" /></div>
                    Responsável Legal
                  </div>
                  <div className="p-6 rounded-3xl bg-muted/10 border border-white/5 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {renderVal(selectedAlunoForFicha?.responsavel?.nome_completo?.charAt(0), "?")}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-foreground">{renderVal(selectedAlunoForFicha?.responsavel?.nome_completo, "Não vinculado")}</p>
                        <p className="text-xs text-muted-foreground">{renderVal(selectedAlunoForFicha?.responsavel?.email, "Sem e-mail")}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3" /> Profissão
                        </p>
                        <p className="text-sm font-medium">{renderVal(selectedAlunoForFicha?.profissao, "Não informada")}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Activity className="h-3 w-3" /> Grau de Parentesco
                        </p>
                        <p className="text-sm font-medium">{renderVal(selectedAlunoForFicha?.grau_parentesco, "Não informado")}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Saúde e Alertas Críticos */}
                <section>
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-4">
                    <div className="p-1.5 rounded-lg bg-red-500/10"><Heart className="h-4 w-4 text-red-500" /></div>
                    Saúde & Alertas Críticos
                  </div>
                  <div className="space-y-4">
                    {selectedAlunoForFicha?.anamneses?.[0]?.is_pne && (
                      <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-100 flex gap-4">
                        <AlertCircle className="h-6 w-6 text-red-500 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase tracking-wider opacity-70">Necessidades Especiais (PNE)</p>
                          <p className="text-sm leading-relaxed">{selectedAlunoForFicha.anamneses?.[0]?.pne_descricao}</p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="p-4 rounded-2xl bg-muted/10 border border-white/5 space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1.5">
                          <Activity className="h-3 w-3" /> Alergias
                        </p>
                        <p className="text-sm font-medium">{renderVal(selectedAlunoForFicha?.anamneses?.[0]?.alergias, "Nenhuma")}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/10 border border-white/5 space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1.5">
                          <Activity className="h-3 w-3" /> Doença Crônica
                        </p>
                        <p className="text-sm font-medium">{renderVal(selectedAlunoForFicha?.anamneses?.[0]?.doenca_cronica, "Nenhuma")}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/10 border border-white/5 space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1.5">
                          <Activity className="h-3 w-3" /> Medicamentos
                        </p>
                        <p className="text-sm font-medium">{renderVal(selectedAlunoForFicha?.anamneses?.[0]?.medicamentos, "Nenhum")}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-muted/10 border border-white/5 space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1.5">
                          <Activity className="h-3 w-3" /> Tipo Sanguíneo
                        </p>
                        <p className="text-sm font-medium font-mono uppercase text-primary">{renderVal(selectedAlunoForFicha?.anamneses?.[0]?.tipo_sanguineo, "---")}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 4. Governança e Compliance */}
                <section>
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest mb-4">
                    <div className="p-1.5 rounded-lg bg-green-500/10"><CheckCircle className="h-4 w-4 text-green-500" /></div>
                    Governança & Compliance
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between transition-colors",
                      selectedAlunoForFicha?.autoriza_imagem ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
                    )}>
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase font-bold opacity-60">Uso de Imagem</p>
                        <p className="text-sm font-semibold">{selectedAlunoForFicha?.autoriza_imagem ? "Autorizado" : "Negado"}</p>
                      </div>
                      {selectedAlunoForFicha?.autoriza_imagem ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-red-500" />}
                    </div>

                    <div className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between transition-colors",
                      selectedAlunoForFicha?.declaracao_assinada ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
                    )}>
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase font-bold opacity-60">Declaração</p>
                        <p className="text-sm font-semibold">{selectedAlunoForFicha?.declaracao_assinada ? "Processada" : "Pendente"}</p>
                      </div>
                      {selectedAlunoForFicha?.declaracao_assinada ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-red-500" />}
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="shrink-0 flex gap-3 sm:gap-4 px-4 sm:px-8 py-4 border-t shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.5)] border-primary/10 bg-background z-20">
              <Button variant="outline" className="flex-1 h-11 rounded-xl border-primary/20 hover:bg-primary/5 text-primary font-bold gap-2" disabled>
                <Save className="h-4 w-4" /> Exportar PDF
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl bg-neomissio-primary hover:bg-neomissio-primary/90 font-bold text-white gap-2 shadow-lg shadow-neomissio-primary/20"
                onClick={() => {
                  setFichaOpen(false);
                  handleOpenDialog(selectedAlunoForFicha);
                }}
              >
                <Pencil className="h-4 w-4" /> Editar Registro
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Alunos;
