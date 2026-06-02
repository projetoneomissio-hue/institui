import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, WifiOff, Wifi, AlertCircle, CalendarIcon, ChevronLeft, Check, X, RefreshCw, LayoutGrid, List } from "lucide-react";
import { ObservacaoAluno } from "@/components/professor/ObservacaoAluno";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const Chamada = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [selectedTurmaId, setSelectedTurmaId] = useState<string>(searchParams.get("turma") || "");
    const [rawDate, setDate] = useState<Date | string>(new Date());
    const date = rawDate instanceof Date ? rawDate : parseISO(rawDate as string) || new Date();
    const [attendance, setAttendance] = useState<Record<string, boolean>>({});
    const [observations, setObservations] = useState<Record<string, string>>({});
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [pendingSyncs, setPendingSyncs] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
        return (localStorage.getItem("chamada_view_mode") as "grid" | "list") || "grid";
    });

    useEffect(() => {
        localStorage.setItem("chamada_view_mode", viewMode);
    }, [viewMode]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            syncOfflineData();
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        checkPendingSyncs();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const checkPendingSyncs = () => {
        try {
            const queue = JSON.parse(localStorage.getItem("offline_chamadas") || "[]");
            setPendingSyncs(queue);
        } catch (e) {
            setPendingSyncs([]);
        }
    };

    const syncOfflineData = async () => {
        const queue = JSON.parse(localStorage.getItem("offline_chamadas") || "[]");
        if (queue.length === 0) return;

        toast({
            title: "Sincronizando...",
            description: `Enviando ${queue.length} chamada(s) offline para o servidor.`,
            variant: "default",
        });

        let successCount = 0;
        const remainingQueue = [];

        for (const item of queue) {
            try {
                const matriculaIds = item.data.map((d: any) => d.matricula_id);
                await supabase.from("presencas").delete().in("matricula_id", matriculaIds).eq("data", item.date);

                const { error } = await supabase.from("presencas").insert(item.data);
                if (error) throw error;
                successCount++;
            } catch (error) {
                console.error("Falha ao sincronizar item da fila", error);
                remainingQueue.push(item);
            }
        }

        localStorage.setItem("offline_chamadas", JSON.stringify(remainingQueue));
        checkPendingSyncs();

        if (successCount > 0) {
            toast({
                title: "Sincronização Concluída",
                description: `${successCount} chamada(s) registradas online com sucesso.`,
                className: "bg-green-600 text-white",
            });
            queryClient.invalidateQueries({ queryKey: ["chamada-students"] });
        }
    };

    const { data: turmas, isLoading: loadingTurmas } = useQuery({
        queryKey: ["professor-turmas", user?.id],
        queryFn: async () => {
            const { data: profData } = await supabase
                .from("professores")
                .select("id")
                .eq("user_id", user?.id)
                .single();

            if (!profData) return [];

            const { data: turmasData, error } = await supabase
                .from("turmas")
                .select("id, nome, horario, dias_semana, atividades(nome)")
                .eq("professor_id", profData.id)
                .eq("ativa", true);

            if (error) throw error;
            return turmasData;
        },
        enabled: !!user,
    });

    const { data: studentsData, isLoading: loadingStudents } = useQuery({
        queryKey: ["chamada-students", selectedTurmaId, date],
        queryFn: async () => {
            if (!selectedTurmaId) return { matriculas: [], nomeTurma: "" };

            console.log("Fetching students for turma:", selectedTurmaId, "date:", format(date, "yyyy-MM-dd"));

            const { data: matriculas, error: matError } = await supabase
                .from("matriculas")
                .select(`
                    id,
                    aluno_id,
                    alunos(
                      id, 
                      nome_completo,
                      anamneses(is_pne, pne_descricao, doenca_cronica, alergias)
                    )
                `)
                .eq("turma_id", selectedTurmaId)
                .eq("status", "ativa");

            if (matError) {
                console.error("Error fetching matriculas:", matError);
                throw matError;
            }

            const queryDateStr = format(date, "yyyy-MM-dd");

            let presencas: any[] = [];
            if (navigator.onLine) {
                const { data, error: presError } = await supabase
                    .from("presencas")
                    .select("*")
                    .in("matricula_id", matriculas?.map(m => m.id) || [])
                    .eq("data", queryDateStr);
                if (!presError) presencas = data || [];
            }

            const offlineQueue = JSON.parse(localStorage.getItem("offline_chamadas") || "[]");
            const offlineMatch = offlineQueue.find((q: any) => q.turmaId === selectedTurmaId && q.date === queryDateStr);

            const initialAttendance: Record<string, boolean> = {};
            const initialObs: Record<string, string> = {};

            matriculas?.forEach(m => {
                if (offlineMatch) {
                    const rec = offlineMatch.data.find((d: any) => d.matricula_id === m.id);
                    initialAttendance[m.id] = rec ? rec.presente : true;
                    initialObs[m.id] = rec?.observacao || "";
                } else {
                    const record = presencas?.find(p => p.matricula_id === m.id);
                    initialAttendance[m.id] = record ? record.presente : true;
                    initialObs[m.id] = record?.observacao || "";
                }
            });

            setAttendance(initialAttendance);
            setObservations(initialObs);

            return { matriculas: matriculas || [] };
        },
        enabled: !!selectedTurmaId && !!date,
    });

    const currentTurma = turmas?.find(t => t.id === selectedTurmaId);

    const isClassDay = (day: Date) => {
        if (!currentTurma?.dias_semana) return false;
        const dayMap: Record<number, string> = {
            0: "domingo",
            1: "segunda",
            2: "terça",
            3: "quarta",
            4: "quinta",
            5: "sexta",
            6: "sábado"
        };
        const dayName = dayMap[getDay(day)];
        return currentTurma.dias_semana.includes(dayName);
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!studentsData?.matriculas) return;
            const queryDateStr = format(date, "yyyy-MM-dd");

            const upsertData = studentsData.matriculas.map(m => ({
                matricula_id: m.id,
                data: queryDateStr,
                presente: attendance[m.id] ?? true,
                observacao: observations[m.id] || null
            }));

            const matriculaIds = studentsData.matriculas.map(m => m.id);

            if (!navigator.onLine) {
                throw new Error("offline");
            }

            await supabase.from("presencas").delete().in("matricula_id", matriculaIds).eq("data", queryDateStr);
            const { error } = await supabase.from("presencas").insert(upsertData);
            if (error) throw error;
        },
        onSuccess: () => {
            toast({
                title: "Chamada salva!",
                description: "A presença dos alunos foi registrada.",
            });
            queryClient.invalidateQueries({ queryKey: ["chamada-students"] });
        },
        onError: (err) => {
            const queryDateStr = format(date, "yyyy-MM-dd");
            const upsertData = studentsData?.matriculas.map(m => ({
                matricula_id: m.id,
                data: queryDateStr,
                presente: attendance[m.id] ?? true,
                observacao: observations[m.id] || null
            })) || [];

            const offlineQueue = JSON.parse(localStorage.getItem("offline_chamadas") || "[]");
            const filteredQueue = offlineQueue.filter((q: any) => !(q.turmaId === selectedTurmaId && q.date === queryDateStr));

            filteredQueue.push({
                date: queryDateStr,
                turmaId: selectedTurmaId,
                data: upsertData,
                timestamp: Date.now()
            });
            localStorage.setItem("offline_chamadas", JSON.stringify(filteredQueue));
            checkPendingSyncs();

            toast({
                title: "Salvo Offline",
                description: "Sem internet. Os dados foram salvos no dispositivo e serão enviados automaticamente.",
                className: "bg-orange-600 text-white border-none",
            });
        }
    });

    const setPresence = (matriculaId: string, value: boolean) => {
        setAttendance(prev => ({
            ...prev,
            [matriculaId]: value
        }));
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col min-h-screen">
                {/* Premium Header - Zero Distraction Mode */}
                <div className="bg-primary pt-3 pb-4 px-6 sticky top-0 z-[100] border-b border-primary-foreground/10 shadow-sm">
                    <div className="flex items-center justify-between text-white max-w-5xl mx-auto w-full">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white h-9 w-9 hover:bg-white/20 rounded-full transition-all active:scale-90"
                                onClick={() => navigate("/professor/turmas")}
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-3">
                                <h1 className="text-sm sm:text-base font-semibold text-white/95">Diário de Classe</h1>
                                <span className="hidden sm:block opacity-30">|</span>
                                <span className="text-xs sm:text-sm font-medium opacity-80 truncate max-w-[150px] sm:max-w-none">
                                    {studentsData?.nomeTurma || "Carregando..."}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex flex-col items-end mr-2">
                                <span className="text-[10px] font-medium text-white/60 uppercase leading-none">Presença</span>
                                <span className="text-[11px] font-bold text-white/80 mt-1">
                                    {Object.values(attendance).filter(Boolean).length}/{studentsData?.matriculas?.length || 0}
                                </span>
                            </div>

                            <Button
                                size="sm"
                                className="h-9 rounded-xl bg-white text-primary hover:bg-white/90 font-semibold text-xs transition-all active:scale-95 px-4"
                                onClick={() => saveMutation.mutate()}
                                disabled={saveMutation.isPending}
                            >
                                {saveMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Save className="h-4 w-4" />
                                        <span>Salvar</span>
                                    </div>
                                )}
                            </Button>

                            <div className="sm:hidden flex items-center justify-center bg-white/10 rounded-lg px-2 h-9">
                                <span className="text-[11px] font-semibold text-white">
                                    {Object.values(attendance).filter(Boolean).length}/{studentsData?.matriculas?.length || 0}
                                </span>
                            </div>

                            {isOffline ? (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-100 text-xs font-semibold rounded-full border border-red-500/30">
                                    <WifiOff className="w-3 h-3" /> Offline
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-100 text-xs font-semibold rounded-full border border-green-500/30">
                                    <Wifi className="w-3 h-3" /> Online
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <main className="flex-1 px-3 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full mt-6 space-y-6 pb-12">
                    {/* Control Card */}
                    <Card className="rounded-xl">
                        <CardContent className="p-5 sm:p-7 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground px-1">Turma Selecionada</Label>
                                    <Select value={selectedTurmaId} onValueChange={setSelectedTurmaId}>
                                        <SelectTrigger className="h-11 rounded-xl">
                                            <SelectValue placeholder="Escolha uma turma..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {loadingTurmas && <SelectItem value="loading" disabled>Carregando...</SelectItem>}
                                            {turmas?.map((t: any) => (
                                                <SelectItem key={t.id} value={t.id} className="font-medium">
                                                    {t.nome} <span className="text-muted-foreground ml-1">({t.atividades?.nome})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground px-1">Data da Aula</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full h-11 justify-start text-left font-medium rounded-xl",
                                                    !date && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-3 h-5 w-5 text-muted-foreground" />
                                                {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 rounded-xl" align="end">
                                            <CalendarUI
                                                mode="single"
                                                selected={date}
                                                onSelect={(d) => d && setDate(d)}
                                                locale={ptBR}
                                                initialFocus
                                                modifiers={{ classDay: (day) => isClassDay(day) }}
                                                modifiersClassNames={{
                                                    classDay: "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full after:animate-pulse"
                                                }}
                                                className="p-3"
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {selectedTurmaId && (studentsData?.matriculas?.length || 0) > 0 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/30">
                                    <p className="text-xs text-muted-foreground">
                                        {Object.values(attendance).filter(Boolean).length} presentes de {studentsData?.matriculas?.length}
                                    </p>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        {/* View Mode Toggle */}
                                        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/20">
                                            <Button
                                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                                size="sm"
                                                className={`h-9 w-9 p-0 rounded-lg transition-all ${viewMode === 'grid' ? 'shadow-md bg-background' : ''}`}
                                                onClick={() => setViewMode('grid')}
                                            >
                                                <LayoutGrid className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                                size="sm"
                                                className={`h-9 w-9 p-0 rounded-lg transition-all ${viewMode === 'list' ? 'shadow-md bg-background' : ''}`}
                                                onClick={() => setViewMode('list')}
                                            >
                                                <List className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="flex gap-2 flex-1 sm:flex-initial">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 sm:flex-initial rounded-xl text-xs font-medium border-green-500/20 text-green-600 hover:bg-green-500/5 h-9"
                                                onClick={() => {
                                                    const newState = { ...attendance };
                                                    studentsData?.matriculas?.forEach((m: any) => newState[m.id] = true);
                                                    setAttendance(newState);
                                                }}
                                            >
                                                Todos Presentes
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 sm:flex-initial rounded-xl text-xs font-medium border-red-500/20 text-red-600 hover:bg-red-500/5 h-9"
                                                onClick={() => {
                                                    const newState = { ...attendance };
                                                    studentsData?.matriculas?.forEach((m: any) => newState[m.id] = false);
                                                    setAttendance(newState);
                                                }}
                                            >
                                                Todos Faltaram
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Students List */}
                    {selectedTurmaId && (
                        <div className="space-y-4">
                            {loadingStudents ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary opacity-30" />
                                    <p className="text-muted-foreground font-medium text-xs">Aguarde...</p>
                                </div>
                            ) : studentsData?.matriculas?.length === 0 ? (
                                <Card className="border-dashed rounded-xl">
                                    <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
                                        <AlertCircle className="h-12 w-12 mb-4 opacity-10" />
                                        <p className="font-medium tracking-tight">Nenhum aluno matriculado nesta turma para o dia de hoje.</p>
                                    </CardContent>
                                </Card>
                            ) : studentsData?.matriculas ? (
                                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                                    {studentsData.matriculas.map((m: any) => {
                                        const isPresent = attendance[m.id];
                                        const studentInitials = m.alunos?.nome_completo?.substring(0, 2).toUpperCase() || "AL";

                                        if (viewMode === 'list') {
                                            return (
                                                <div
                                                    key={m.id}
                                                    className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-3 pl-4 rounded-[20px] border transition-all duration-300 ${isPresent
                                                        ? "bg-background border-green-500/20 shadow-sm"
                                                        : "bg-muted/40 border-red-500/20 opacity-80"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4 flex-1 w-full">
                                                        <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-[11px] transition-transform duration-500 ${isPresent ? "bg-green-500" : "bg-red-500 rotate-12"}`}>
                                                            {studentInitials}
                                                        </div>

                                                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                                                            <h3 className={`font-bold text-sm truncate transition-colors ${!isPresent ? "text-muted-foreground line-through decoration-red-500/30" : "text-foreground"}`}>
                                                                {m.alunos?.nome_completo}
                                                            </h3>
                                                            <div className="flex gap-2.5 mt-1">
                                                                {m.alunos?.anamneses?.[0]?.is_pne && (
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" title="PNE" />
                                                                )}
                                                                {(m.alunos?.anamneses?.[0]?.doenca_cronica || m.alunos?.anamneses?.[0]?.alergias) && (
                                                                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" title="Saúde" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between sm:justify-end gap-2 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-border/10 shrink-0">
                                                        <div className="flex items-center bg-muted/30 p-1 rounded-xl border border-border/10">
                                                            <button
                                                                className={`h-9 px-4 rounded-lg text-xs font-medium transition-all flex-1 sm:flex-none ${!isPresent ? "bg-red-500 text-white shadow-md shadow-red-500/30" : "text-muted-foreground hover:bg-background/40"}`}
                                                                onClick={() => setPresence(m.id, false)}
                                                            >
                                                                FALTOU
                                                            </button>
                                                            <button
                                                                className={`h-9 px-4 rounded-lg text-xs font-medium transition-all flex-1 sm:flex-none ${isPresent ? "bg-green-500 text-white shadow-md shadow-green-500/30" : "text-muted-foreground hover:bg-background/40"}`}
                                                                onClick={() => setPresence(m.id, true)}
                                                            >
                                                                PRESENTE
                                                            </button>
                                                        </div>

                                                        <div className="shrink-0">
                                                            <ObservacaoAluno
                                                                alunoId={m.aluno_id}
                                                                alunoNome={m.alunos?.nome_completo}
                                                                turmaId={selectedTurmaId}
                                                                onSave={(text) => {
                                                                    setObservations((prev) => ({
                                                                        ...prev,
                                                                        [m.aluno_id]: text,
                                                                    }));
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={m.id}
                                                className={`relative overflow-hidden rounded-[24px] transition-all duration-300 border shadow-sm ${isPresent
                                                    ? "bg-gradient-to-br from-background to-green-50/5 border-green-500/20 dark:border-green-500/10"
                                                    : "bg-gradient-to-br from-background to-red-50/5 border-red-500/20 dark:border-red-500/10 opacity-90"
                                                    }`}
                                            >
                                                <div className="p-5 flex flex-col gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-white font-bold transition-all duration-500 ${isPresent ? "bg-green-500" : "bg-red-500 rotate-12"}`}>
                                                            {studentInitials}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className={`font-semibold text-[15px] truncate transition-colors ${isPresent ? "text-foreground" : "text-muted-foreground line-through decoration-red-500/30"}`}>
                                                                {m.alunos?.nome_completo}
                                                            </h3>
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                {m.alunos?.anamneses?.[0]?.is_pne && (
                                                                    <Badge variant="destructive" className="text-[9px] px-2 py-0 h-4 font-semibold bg-red-500">PNE</Badge>
                                                                )}
                                                                {(m.alunos?.anamneses?.[0]?.doenca_cronica || m.alunos?.anamneses?.[0]?.alergias) && (
                                                                    <Badge variant="outline" className="text-[9px] px-2 py-0 h-4 font-semibold border-orange-500 text-orange-600 bg-orange-50/50">Saúde</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 pt-4 border-t border-border/10">
                                                        <div className="grid grid-cols-2 flex-1 gap-1.5 bg-muted/30 p-1 rounded-xl">
                                                            <button
                                                                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${!isPresent ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-muted-foreground hover:bg-background/50 opacity-60"}`}
                                                                onClick={(e) => { e.stopPropagation(); setPresence(m.id, false); }}
                                                            >
                                                                <X className="w-3 h-3" /> Faltou
                                                            </button>
                                                            <button
                                                                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${isPresent ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "text-muted-foreground hover:bg-background/50 opacity-60"}`}
                                                                onClick={(e) => { e.stopPropagation(); setPresence(m.id, true); }}
                                                            >
                                                                <Check className="w-3 h-3" /> Presente
                                                            </button>
                                                        </div>

                                                        <div className="shrink-0">
                                                            <ObservacaoAluno
                                                                alunoId={m.aluno_id}
                                                                alunoNome={m.alunos?.nome_completo}
                                                                turmaId={selectedTurmaId}
                                                                onSave={(text) => {
                                                                    setObservations((prev) => ({
                                                                        ...prev,
                                                                        [m.aluno_id]: text,
                                                                    }));
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Card className="border-red-500/20 bg-red-500/5 rounded-xl">
                                    <CardContent className="p-10 text-center text-red-500 flex flex-col items-center">
                                        <AlertCircle className="h-10 w-10 mb-3 opacity-80" />
                                        <p className="font-bold">Ocorreu um erro ao carregar os dados.</p>
                                        <p className="text-xs opacity-70 mt-1">Por favor, selecione a data novamente ou recarregue a página.</p>
                                        <Button
                                            variant="outline"
                                            className="mt-4 border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-xl"
                                            onClick={() => window.location.reload()}
                                        >
                                            <RefreshCw className="w-4 h-4 mr-2" /> Recarregar
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </main>

                {/* Removed bottom bars to prevent overlap - Actions moved to Header */}
            </div>
        </DashboardLayout>
    );
};

export default Chamada;
