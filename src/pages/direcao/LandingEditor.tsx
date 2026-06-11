import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUnidade } from "@/contexts/UnidadeContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, ExternalLink, Image as ImageIcon, Loader2,
  Eye, EyeOff, ChevronUp, ChevronDown, Layout, List,
} from "lucide-react";
import { activities as staticActivities, ICON_OPTIONS, GRADIENT_OPTIONS, getIconByName } from "@/data/landing-data";
import { compressImage } from "@/utils/compressImage";

// ── Atividades ────────────────────────────────────────────────────────────────

interface LandingAtividade {
  id: string;
  titulo: string;
  descricao: string;
  preco: string;
  preco_nota: string | null;
  frequencia: string;
  horario: string;
  publico_alvo: string;
  nota: string | null;
  imagem_url: string | null;
  icone: string;
  gradiente: string;
  lista_espera: boolean;
  gratuito: boolean;
  ordem: number;
  ativo: boolean;
  unidade_id: string | null;
}

const emptyForm = (): Omit<LandingAtividade, "id" | "unidade_id"> => ({
  titulo: "",
  descricao: "",
  preco: "",
  preco_nota: "",
  frequencia: "1x por semana",
  horario: "",
  publico_alvo: "",
  nota: "",
  imagem_url: null,
  icone: "Activity",
  gradiente: "from-blue-500 to-cyan-500",
  lista_espera: false,
  gratuito: false,
  ordem: 0,
  ativo: true,
});

// ── Landing Config ────────────────────────────────────────────────────────────

interface LandingConfig {
  hero: {
    headline: string;
    subtitulo: string;
    badge_texto: string;
    cta_texto: string;
    bg_image_url: string;
  };
  sobre: {
    titulo: string;
    texto: string;
    imagem_url: string;
  };
  depoimentos: Array<{ nome: string; texto: string; foto_url: string }>;
  galeria: string[];
  secoes_ativas: {
    sobre: boolean;
    depoimentos: boolean;
    galeria: boolean;
  };
  secao_atividades: {
    titulo: string;
    subtitulo: string;
  };
  quem_somos: {
    titulo: string;
    subtitulo: string;
    historia: string;
    missao: string;
    visao: string;
    valores: string;
    mostrar_nav: boolean;
    equipe: Array<{ nome: string; cargo: string; bio: string; foto_url: string }>;
  };
}

const defaultLandingConfig: LandingConfig = {
  hero: { headline: "", subtitulo: "", badge_texto: "", cta_texto: "", bg_image_url: "" },
  sobre: { titulo: "", texto: "", imagem_url: "" },
  depoimentos: [],
  galeria: [],
  secoes_ativas: { sobre: false, depoimentos: false, galeria: false },
  secao_atividades: { titulo: "", subtitulo: "" },
  quem_somos: {
    titulo: "", subtitulo: "", historia: "", missao: "", visao: "", valores: "",
    mostrar_nav: false, equipe: [],
  },
};

// ── Componente ─────────────────────────────────────────────────────────────────

const LandingEditor = () => {
  const { user } = useAuth();
  const { currentUnidade } = useUnidade();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroBgRef = useRef<HTMLInputElement>(null);
  const sobreImgRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  // Atividades state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [uploading, setUploading] = useState(false);
  const [tableError, setTableError] = useState(false);

  // Aparência state
  const [landingConfig, setLandingConfig] = useState<LandingConfig>(defaultLandingConfig);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // ── Atividades queries ────────────────────────────────────────────────────

  const { data: dbAtividades, isLoading } = useQuery({
    queryKey: ["landing-atividades-admin", currentUnidade?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_atividades" as any)
        .select("*")
        .order("ordem", { ascending: true });
      if (error) {
        const isTableMissing = error.code === "42P01" || error.code === "PGRST106"
          || error.message?.toLowerCase().includes("not find the table")
          || error.message?.toLowerCase().includes("does not exist");
        if (isTableMissing) { setTableError(true); return []; }
        throw error;
      }
      setTableError(false);
      return (data as LandingAtividade[]) || [];
    },
  });

  // ── Aparência query ───────────────────────────────────────────────────────

  const { data: savedConfig } = useQuery({
    queryKey: ["unidade-landing-config", currentUnidade?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("unidades" as any)
        .select("landing_config")
        .eq("id", currentUnidade!.id)
        .maybeSingle();
      return (data as any)?.landing_config as LandingConfig | null;
    },
    enabled: !!currentUnidade?.id,
  });

  useEffect(() => {
    if (savedConfig) {
      setLandingConfig({
        ...defaultLandingConfig,
        ...savedConfig,
        hero: { ...defaultLandingConfig.hero, ...(savedConfig.hero || {}) },
        sobre: { ...defaultLandingConfig.sobre, ...(savedConfig.sobre || {}) },
        secoes_ativas: { ...defaultLandingConfig.secoes_ativas, ...(savedConfig.secoes_ativas || {}) },
        secao_atividades: { ...defaultLandingConfig.secao_atividades, ...((savedConfig as any).secao_atividades || {}) },
        quem_somos: { ...defaultLandingConfig.quem_somos, ...((savedConfig as any).quem_somos || {}) },
        depoimentos: savedConfig.depoimentos || [],
        galeria: savedConfig.galeria || [],
      });
    }
  }, [savedConfig]);

  // ── Atividades mutations ──────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (data: Omit<LandingAtividade, "id" | "unidade_id"> & { id?: string }) => {
      const payload = {
        titulo: data.titulo,
        descricao: data.descricao,
        preco: data.preco,
        preco_nota: data.preco_nota || null,
        frequencia: data.frequencia,
        horario: data.horario,
        publico_alvo: data.publico_alvo,
        nota: data.nota || null,
        imagem_url: data.imagem_url,
        icone: data.icone,
        gradiente: data.gradiente,
        lista_espera: data.lista_espera,
        gratuito: data.gratuito,
        ordem: data.ordem,
        ativo: data.ativo,
        unidade_id: currentUnidade?.id || null,
      };

      if (data.id) {
        const { error } = await supabase
          .from("landing_atividades" as any)
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("landing_atividades" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-atividades-admin"] });
      queryClient.invalidateQueries({ queryKey: ["landing-atividades"] });
      setDialogOpen(false);
      toast({ title: editingId ? "Atividade atualizada!" : "Atividade criada!" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("landing_atividades" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-atividades-admin"] });
      queryClient.invalidateQueries({ queryKey: ["landing-atividades"] });
      setDeleteId(null);
      toast({ title: "Atividade removida" });
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("landing_atividades" as any).update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-atividades-admin"] });
      queryClient.invalidateQueries({ queryKey: ["landing-atividades"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, ordem }: { id: string; ordem: number }) => {
      const { error } = await supabase.from("landing_atividades" as any).update({ ordem }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["landing-atividades-admin"] }),
  });

  // ── Aparência mutation ────────────────────────────────────────────────────

  const saveLandingConfigMutation = useMutation({
    mutationFn: async (config: LandingConfig) => {
      const { error } = await supabase
        .from("unidades" as any)
        .update({ landing_config: config })
        .eq("id", currentUnidade!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidade-landing-config"] });
      toast({ title: "Aparência salva!", description: "As alterações já estão visíveis na sua landing page." });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar aparência", description: e.message, variant: "destructive" }),
  });

  // ── Upload helpers ────────────────────────────────────────────────────────

  const uploadActivityImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const ext = file.name.split(".").pop();
      const path = `landing/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("student-photos").upload(path, compressed, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("student-photos").getPublicUrl(path);
      setForm(f => ({ ...f, imagem_url: data.publicUrl }));
      toast({ title: "Imagem enviada!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const uploadAparenciaImage = async (
    file: File,
    fieldPath: string,
    onSuccess: (url: string) => void
  ) => {
    setUploadingField(fieldPath);
    try {
      const compressed = await compressImage(file);
      const ext = file.name.split(".").pop();
      const path = `landing-config/${fieldPath.replace(/\./g, "-")}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("student-photos").upload(path, compressed, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("student-photos").getPublicUrl(path);
      onSuccess(data.publicUrl);
      toast({ title: "Imagem enviada!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingField(null);
    }
  };

  // ── Activity helpers ──────────────────────────────────────────────────────

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), ordem: (dbAtividades?.length || 0) + 1 });
    setDialogOpen(true);
  };

  const openEdit = (a: LandingAtividade) => {
    setEditingId(a.id);
    setForm({
      titulo: a.titulo, descricao: a.descricao, preco: a.preco,
      preco_nota: a.preco_nota || "", frequencia: a.frequencia, horario: a.horario,
      publico_alvo: a.publico_alvo, nota: a.nota || "", imagem_url: a.imagem_url,
      icone: a.icone, gradiente: a.gradiente, lista_espera: a.lista_espera,
      gratuito: a.gratuito, ordem: a.ordem, ativo: a.ativo,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.titulo.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" }); return;
    }
    saveMutation.mutate({ ...form, ...(editingId ? { id: editingId } : {}) });
  };

  const moveOrder = (id: string, currentOrdem: number, dir: "up" | "down") => {
    const newOrdem = dir === "up" ? currentOrdem - 1 : currentOrdem + 1;
    reorderMutation.mutate({ id, ordem: newOrdem });
  };

  const staticTemplates = staticActivities.map((a, i) => ({
    id: a.id, titulo: a.title, descricao: a.description, preco: a.price,
    preco_nota: a.priceNote || null, frequencia: a.frequency, horario: a.schedule,
    publico_alvo: a.targetAudience, nota: a.note || null, imagem_url: a.image || null,
    icone: "Activity", gradiente: a.gradient, lista_espera: a.waitlist || false,
    gratuito: a.free || false, ordem: i, ativo: true, unidade_id: null, isStatic: true as const,
  }));

  const importTemplate = (tpl: typeof staticTemplates[0]) => {
    setEditingId(null);
    setForm({
      titulo: tpl.titulo, descricao: tpl.descricao, preco: tpl.preco,
      preco_nota: tpl.preco_nota || "", frequencia: tpl.frequencia, horario: tpl.horario,
      publico_alvo: tpl.publico_alvo, nota: tpl.nota || "", imagem_url: tpl.imagem_url,
      icone: tpl.icone, gradiente: tpl.gradiente, lista_espera: tpl.lista_espera,
      gratuito: tpl.gratuito, ordem: (dbAtividades?.length || 0) + 1, ativo: true,
    });
    setDialogOpen(true);
  };

  // ── Depoimentos helpers ───────────────────────────────────────────────────

  const addDepoimento = () => {
    setLandingConfig(c => ({
      ...c,
      depoimentos: [...c.depoimentos, { nome: "", texto: "", foto_url: "" }],
    }));
  };

  const updateDepoimento = (i: number, field: string, value: string) => {
    setLandingConfig(c => {
      const updated = [...c.depoimentos];
      updated[i] = { ...updated[i], [field]: value };
      return { ...c, depoimentos: updated };
    });
  };

  const removeDepoimento = (i: number) => {
    setLandingConfig(c => ({ ...c, depoimentos: c.depoimentos.filter((_, idx) => idx !== i) }));
  };

  const removeGaleriaImage = (i: number) => {
    setLandingConfig(c => ({ ...c, galeria: c.galeria.filter((_, idx) => idx !== i) }));
  };

  const dbList: LandingAtividade[] = dbAtividades || [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Editor da Landing Page</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Personalize o site público da sua organização</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={`/org/${currentUnidade?.slug}`} target="_blank" rel="noopener noreferrer" className="gap-1.5">
              <ExternalLink className="h-4 w-4" /> Ver Site
            </a>
          </Button>
        </div>

        <Tabs defaultValue="atividades">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="atividades" className="gap-1.5">
              <List className="h-4 w-4" /> Atividades
            </TabsTrigger>
            <TabsTrigger value="aparencia" className="gap-1.5">
              <Layout className="h-4 w-4" /> Aparência
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Atividades ───────────────────────────────────────────── */}
          <TabsContent value="atividades" className="space-y-6 mt-6">

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Gerencie as atividades exibidas no site público</p>
              <Button onClick={openNew} className="gap-1.5" size="sm" disabled={tableError}>
                <Plus className="h-4 w-4" /> Nova Atividade
              </Button>
            </div>

            {tableError && (
              <Card className="border-amber-500/30 bg-amber-50 dark:bg-amber-900/10">
                <CardContent className="p-4 space-y-3">
                  <p className="font-bold text-amber-700 dark:text-amber-400">⚠ Tabela não encontrada no Supabase</p>
                  <p className="text-sm text-amber-600 dark:text-amber-300">
                    Rode o SQL abaixo no painel do Supabase → SQL Editor para ativar o editor:
                  </p>
                  <pre className="text-xs bg-black/80 text-green-400 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">{SQL_MIGRATION}</pre>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-8">

                {/* Atividades no site */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                      No site agora {dbList.length > 0 && `(${dbList.length})`}
                    </h2>
                    {dbList.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">— adicione atividades abaixo ou crie uma nova</span>
                    )}
                  </div>
                  {dbList.length === 0 ? (
                    <Card className="border-dashed border-2 border-muted-foreground/20">
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <Plus className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhuma atividade personalizada ainda.</p>
                        <p className="text-xs mt-1">Use os templates abaixo como ponto de partida.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-3">
                      {dbList.map((a, idx) => {
                        const IconComp = getIconByName(a.icone);
                        return (
                          <Card key={a.id} className={`border ${!a.ativo ? "opacity-50" : ""}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div className={`relative h-16 w-28 rounded-xl bg-gradient-to-br ${a.gradiente} flex items-center justify-center shrink-0 overflow-hidden`}>
                                  {a.imagem_url
                                    ? <img src={a.imagem_url} alt="" className="w-full h-full object-cover object-center" />
                                    : <IconComp className="h-7 w-7 text-white/70" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="font-bold">{a.titulo}</span>
                                    {a.gratuito && <Badge className="bg-green-600 text-white text-[10px]">Gratuito</Badge>}
                                    {a.lista_espera && <Badge className="bg-amber-500 text-white text-[10px]">Lista de espera</Badge>}
                                    {!a.ativo && <Badge variant="secondary" className="text-[10px]">Oculto</Badge>}
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-1">{a.descricao}</p>
                                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                                    <span><strong>Preço:</strong> {a.preco}</span>
                                    <span><strong>Público:</strong> {a.publico_alvo}</span>
                                    {a.imagem_url && <span className="text-green-600 font-medium">📷 Com foto</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveOrder(a.id, a.ordem, "up")} disabled={idx === 0}>
                                    <ChevronUp className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveOrder(a.id, a.ordem, "down")} disabled={idx === dbList.length - 1}>
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleAtivoMutation.mutate({ id: a.id, ativo: !a.ativo })}>
                                    {a.ativo ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(a.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Templates padrão */}
                <div className="space-y-3">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Templates padrão — clique para adicionar ao site
                  </h2>
                  <div className="grid gap-2">
                    {staticTemplates.map((a) => {
                      const IconComp = getIconByName(a.icone);
                      return (
                        <Card key={a.id} className="border-dashed border-muted-foreground/25 opacity-80 hover:opacity-100 transition-opacity">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className={`h-12 w-20 rounded-lg bg-gradient-to-br ${a.gradiente} flex items-center justify-center shrink-0 overflow-hidden`}>
                                <IconComp className="h-6 w-6 text-white/70" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">{a.titulo}</span>
                                  {a.gratuito && <Badge className="bg-green-600 text-white text-[10px]">Gratuito</Badge>}
                                  {a.lista_espera && <Badge className="bg-amber-500 text-white text-[10px]">Lista de espera</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{a.preco} · {a.publico_alvo}</p>
                              </div>
                              <Button
                                variant="outline" size="sm"
                                className="shrink-0 gap-1 text-xs"
                                disabled={tableError}
                                onClick={() => importTemplate(a)}
                              >
                                <Plus className="h-3 w-3" /> Adicionar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </TabsContent>

          {/* ── Tab: Aparência ────────────────────────────────────────────── */}
          <TabsContent value="aparencia" className="space-y-6 mt-6">

            <p className="text-sm text-muted-foreground">
              Personalize textos, imagens e seções da sua landing page. As alterações ficam visíveis ao clicar em "Salvar Aparência".
            </p>

            {/* Hero */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🏠 Seção Principal (Hero)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Headline</Label>
                    <Input
                      value={landingConfig.hero.headline}
                      onChange={e => setLandingConfig(c => ({ ...c, hero: { ...c.hero, headline: e.target.value } }))}
                      placeholder={`Bem-vindo à ${currentUnidade?.nome || "sua escola"}`}
                    />
                    <p className="text-xs text-muted-foreground">Deixe em branco para usar "Bem-vindo à {currentUnidade?.nome}"</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Texto do Badge</Label>
                    <Input
                      value={landingConfig.hero.badge_texto}
                      onChange={e => setLandingConfig(c => ({ ...c, hero: { ...c.hero, badge_texto: e.target.value } }))}
                      placeholder="Inscrições Abertas"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Subtítulo</Label>
                  <Textarea
                    value={landingConfig.hero.subtitulo}
                    onChange={e => setLandingConfig(c => ({ ...c, hero: { ...c.hero, subtitulo: e.target.value } }))}
                    rows={2}
                    placeholder="Conheça nossas atividades e faça sua inscrição online. Vagas limitadas."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Texto do Botão CTA</Label>
                  <Input
                    value={landingConfig.hero.cta_texto}
                    onChange={e => setLandingConfig(c => ({ ...c, hero: { ...c.hero, cta_texto: e.target.value } }))}
                    placeholder="Ver Atividades"
                    className="max-w-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Imagem de Fundo (opcional)</Label>
                  {landingConfig.hero.bg_image_url ? (
                    <div className="relative w-full aspect-video max-w-md rounded-xl overflow-hidden border">
                      <img src={landingConfig.hero.bg_image_url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setLandingConfig(c => ({ ...c, hero: { ...c.hero, bg_image_url: "" } }))}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => heroBgRef.current?.click()}
                      disabled={uploadingField === "hero.bg_image_url"}
                      className="w-full max-w-md aspect-video rounded-xl border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 transition-colors"
                    >
                      {uploadingField === "hero.bg_image_url"
                        ? <Loader2 className="h-8 w-8 animate-spin" />
                        : <ImageIcon className="h-8 w-8" />}
                      <span className="text-sm">Clique para adicionar imagem de fundo</span>
                      <span className="text-xs opacity-60">ideal: 1920×1080 px · 16:9 · JPG/PNG</span>
                    </button>
                  )}
                  <input
                    ref={heroBgRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) uploadAparenciaImage(file, "hero.bg_image_url", url =>
                        setLandingConfig(c => ({ ...c, hero: { ...c.hero, bg_image_url: url } }))
                      );
                      e.target.value = "";
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Seção de Atividades */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🎯 Seção de Atividades</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Título da Seção</Label>
                  <Input
                    value={landingConfig.secao_atividades.titulo}
                    onChange={e => setLandingConfig(c => ({ ...c, secao_atividades: { ...c.secao_atividades, titulo: e.target.value } }))}
                    placeholder={`${dbList.length || 0} atividades para todas as idades`}
                    className="max-w-md"
                  />
                  <p className="text-xs text-muted-foreground">Deixe em branco para usar o padrão</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Subtítulo</Label>
                  <Textarea
                    value={landingConfig.secao_atividades.subtitulo}
                    onChange={e => setLandingConfig(c => ({ ...c, secao_atividades: { ...c.secao_atividades, subtitulo: e.target.value } }))}
                    rows={2}
                    placeholder="Do esporte à arte, do aprendizado ao aconselhamento. Encontre a atividade certa para você ou seu filho."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sobre Nós */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">ℹ️ Sobre Nós</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Exibir seção</span>
                    <Switch
                      checked={landingConfig.secoes_ativas.sobre}
                      onCheckedChange={v => setLandingConfig(c => ({ ...c, secoes_ativas: { ...c.secoes_ativas, sobre: v } }))}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Título da Seção</Label>
                  <Input
                    value={landingConfig.sobre.titulo}
                    onChange={e => setLandingConfig(c => ({ ...c, sobre: { ...c.sobre, titulo: e.target.value } }))}
                    placeholder="Quem Somos"
                    className="max-w-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Texto</Label>
                  <Textarea
                    value={landingConfig.sobre.texto}
                    onChange={e => setLandingConfig(c => ({ ...c, sobre: { ...c.sobre, texto: e.target.value } }))}
                    rows={4}
                    placeholder="Fale sobre a história, missão e valores da sua organização..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Imagem (opcional)</Label>
                  {landingConfig.sobre.imagem_url ? (
                    <div className="relative w-full max-w-sm aspect-video rounded-xl overflow-hidden border">
                      <img src={landingConfig.sobre.imagem_url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setLandingConfig(c => ({ ...c, sobre: { ...c.sobre, imagem_url: "" } }))}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sobreImgRef.current?.click()}
                      disabled={uploadingField === "sobre.imagem_url"}
                      className="w-full max-w-sm aspect-video rounded-xl border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 transition-colors"
                    >
                      {uploadingField === "sobre.imagem_url"
                        ? <Loader2 className="h-8 w-8 animate-spin" />
                        : <ImageIcon className="h-8 w-8" />}
                      <span className="text-sm">Clique para adicionar imagem</span>
                      <span className="text-xs opacity-60">ideal: 800×450 px · 16:9 · JPG/PNG</span>
                    </button>
                  )}
                  <input
                    ref={sobreImgRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) uploadAparenciaImage(file, "sobre.imagem_url", url =>
                        setLandingConfig(c => ({ ...c, sobre: { ...c.sobre, imagem_url: url } }))
                      );
                      e.target.value = "";
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Depoimentos */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">💬 Depoimentos</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Exibir seção</span>
                    <Switch
                      checked={landingConfig.secoes_ativas.depoimentos}
                      onCheckedChange={v => setLandingConfig(c => ({ ...c, secoes_ativas: { ...c.secoes_ativas, depoimentos: v } }))}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {landingConfig.depoimentos.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum depoimento ainda. Adicione o primeiro!</p>
                )}
                {landingConfig.depoimentos.map((d, i) => (
                  <div key={i} className="border rounded-xl p-4 space-y-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Depoimento {i + 1}</span>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeDepoimento(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nome</Label>
                        <Input
                          value={d.nome}
                          onChange={e => updateDepoimento(i, "nome", e.target.value)}
                          placeholder="Maria Silva"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Foto (URL opcional)</Label>
                        <Input
                          value={d.foto_url}
                          onChange={e => updateDepoimento(i, "foto_url", e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Texto do Depoimento</Label>
                      <Textarea
                        value={d.texto}
                        onChange={e => updateDepoimento(i, "texto", e.target.value)}
                        rows={2}
                        placeholder="Meu filho adora as aulas! A equipe é incrível..."
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={addDepoimento}>
                  <Plus className="h-4 w-4" /> Adicionar Depoimento
                </Button>
              </CardContent>
            </Card>

            {/* Galeria */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">🖼️ Galeria de Fotos</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Exibir seção</span>
                    <Switch
                      checked={landingConfig.secoes_ativas.galeria}
                      onCheckedChange={v => setLandingConfig(c => ({ ...c, secoes_ativas: { ...c.secoes_ativas, galeria: v } }))}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {landingConfig.galeria.map((url, i) => (
                    <div key={i} className="relative aspect-square group">
                      <img src={url} alt="" className="w-full h-full object-cover rounded-xl" />
                      <button
                        onClick={() => removeGaleriaImage(i)}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => galeriaRef.current?.click()}
                    disabled={!!uploadingField}
                    className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 transition-colors"
                  >
                    {uploadingField?.startsWith("galeria.")
                      ? <Loader2 className="h-5 w-5 animate-spin" />
                      : <Plus className="h-5 w-5" />}
                    <span className="text-xs">Adicionar</span>
                  </button>
                </div>
                <input
                  ref={galeriaRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) uploadAparenciaImage(file, `galeria.${landingConfig.galeria.length}`, url =>
                      setLandingConfig(c => ({ ...c, galeria: [...c.galeria, url] }))
                    );
                    e.target.value = "";
                  }}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Passe o mouse sobre uma foto para removê-la</p>
                  <div className="flex gap-1.5 text-[10px] text-muted-foreground font-mono">
                    <span className="bg-muted px-1.5 py-0.5 rounded">1:1</span>
                    <span className="bg-muted px-1.5 py-0.5 rounded">JPG / PNG</span>
                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">ideal: 800×800 px</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quem Somos */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">👥 Quem Somos — Página Dedicada</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Acessível em <code className="bg-muted px-1 rounded text-[11px]">/org/{currentUnidade?.slug}/quem-somos</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Exibir no menu</span>
                    <Switch
                      checked={landingConfig.quem_somos.mostrar_nav}
                      onCheckedChange={v => setLandingConfig(c => ({ ...c, quem_somos: { ...c.quem_somos, mostrar_nav: v } }))}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Título da página</Label>
                    <Input
                      value={landingConfig.quem_somos.titulo}
                      onChange={e => setLandingConfig(c => ({ ...c, quem_somos: { ...c.quem_somos, titulo: e.target.value } }))}
                      placeholder={`Conheça a ${currentUnidade?.nome || "organização"}`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Subtítulo</Label>
                    <Input
                      value={landingConfig.quem_somos.subtitulo}
                      onChange={e => setLandingConfig(c => ({ ...c, quem_somos: { ...c.quem_somos, subtitulo: e.target.value } }))}
                      placeholder="Nossa história, nossa missão, nossa equipe."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Nossa História</Label>
                  <Textarea
                    value={landingConfig.quem_somos.historia}
                    onChange={e => setLandingConfig(c => ({ ...c, quem_somos: { ...c.quem_somos, historia: e.target.value } }))}
                    rows={5}
                    placeholder="Conte a história da sua organização: como surgiu, o que a motiva, marcos importantes..."
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Missão</Label>
                    <Textarea
                      value={landingConfig.quem_somos.missao}
                      onChange={e => setLandingConfig(c => ({ ...c, quem_somos: { ...c.quem_somos, missao: e.target.value } }))}
                      rows={3}
                      placeholder="Nossa missão é..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Visão</Label>
                    <Textarea
                      value={landingConfig.quem_somos.visao}
                      onChange={e => setLandingConfig(c => ({ ...c, quem_somos: { ...c.quem_somos, visao: e.target.value } }))}
                      rows={3}
                      placeholder="Nossa visão é ser..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valores</Label>
                    <Textarea
                      value={landingConfig.quem_somos.valores}
                      onChange={e => setLandingConfig(c => ({ ...c, quem_somos: { ...c.quem_somos, valores: e.target.value } }))}
                      rows={3}
                      placeholder="Respeito, Inclusão, Excelência..."
                    />
                  </div>
                </div>

                {/* Equipe */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Equipe</Label>
                    <Button
                      variant="outline" size="sm" className="gap-1.5"
                      onClick={() => setLandingConfig(c => ({
                        ...c,
                        quem_somos: {
                          ...c.quem_somos,
                          equipe: [...c.quem_somos.equipe, { nome: "", cargo: "", bio: "", foto_url: "" }],
                        },
                      }))}
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar Membro
                    </Button>
                  </div>

                  {landingConfig.quem_somos.equipe.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">Nenhum membro adicionado ainda.</p>
                  )}

                  {landingConfig.quem_somos.equipe.map((m, i) => (
                    <div key={i} className="border rounded-xl p-4 space-y-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Membro {i + 1}</span>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setLandingConfig(c => ({
                            ...c,
                            quem_somos: { ...c.quem_somos, equipe: c.quem_somos.equipe.filter((_, idx) => idx !== i) },
                          }))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={m.nome}
                            onChange={e => {
                              const eq = [...landingConfig.quem_somos.equipe];
                              eq[i] = { ...eq[i], nome: e.target.value };
                              setLandingConfig(c => ({ ...c, quem_somos: { ...c.quem_somos, equipe: eq } }));
                            }}
                            placeholder="Ana Silva"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Cargo</Label>
                          <Input
                            value={m.cargo}
                            onChange={e => {
                              const eq = [...landingConfig.quem_somos.equipe];
                              eq[i] = { ...eq[i], cargo: e.target.value };
                              setLandingConfig(c => ({ ...c, quem_somos: { ...c.quem_somos, equipe: eq } }));
                            }}
                            placeholder="Diretora Pedagógica"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Bio (opcional)</Label>
                        <Input
                          value={m.bio}
                          onChange={e => {
                            const eq = [...landingConfig.quem_somos.equipe];
                            eq[i] = { ...eq[i], bio: e.target.value };
                            setLandingConfig(c => ({ ...c, quem_somos: { ...c.quem_somos, equipe: eq } }));
                          }}
                          placeholder="15 anos de experiência em educação social..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Foto (URL ou deixe em branco para usar inicial do nome)</Label>
                        <Input
                          value={m.foto_url}
                          onChange={e => {
                            const eq = [...landingConfig.quem_somos.equipe];
                            eq[i] = { ...eq[i], foto_url: e.target.value };
                            setLandingConfig(c => ({ ...c, quem_somos: { ...c.quem_somos, equipe: eq } }));
                          }}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Save button */}
            <div className="flex justify-end pb-6">
              <Button
                size="lg"
                className="gap-2 shadow-md shadow-primary/20"
                onClick={() => saveLandingConfigMutation.mutate(landingConfig)}
                disabled={saveLandingConfigMutation.isPending}
              >
                {saveLandingConfigMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Aparência
              </Button>
            </div>

          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog: Criar/Editar Atividade */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Imagem */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Foto da Atividade</Label>
                <div className="flex gap-1.5 text-[10px] text-muted-foreground font-mono">
                  <span className="bg-muted px-1.5 py-0.5 rounded">16:9</span>
                  <span className="bg-muted px-1.5 py-0.5 rounded">JPG / PNG</span>
                  <span className="bg-muted px-1.5 py-0.5 rounded">máx 5 MB</span>
                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">ideal: 1280×720 px</span>
                </div>
              </div>

              <div className={`relative w-full aspect-video rounded-xl overflow-hidden border-2 border-dashed ${form.imagem_url ? "border-transparent" : "border-muted-foreground/20"} bg-gradient-to-br ${form.gradiente}`}>
                {form.imagem_url ? (
                  <>
                    <img src={form.imagem_url} alt="" className="w-full h-full object-cover object-center" />
                    <button
                      onClick={() => setForm(f => ({ ...f, imagem_url: null }))}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-1.5 text-white transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                      Prévia real — exatamente como aparece no site
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70 hover:text-white transition-colors"
                  >
                    {uploading
                      ? <Loader2 className="h-10 w-10 animate-spin" />
                      : <ImageIcon className="h-10 w-10" />}
                    <span className="text-sm font-medium">{uploading ? "Enviando..." : "Clique para adicionar foto"}</span>
                    <span className="text-xs opacity-70">Sem foto → gradiente colorido aparece no lugar</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                  {uploading ? "Enviando..." : form.imagem_url ? "Trocar Foto" : "Escolher Foto"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Tire uma foto da aula no celular e envie aqui. O sistema ajusta automaticamente.
                </p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadActivityImage} />
            </div>

            {/* Cores e Ícone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gradiente</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {GRADIENT_OPTIONS.map(g => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, gradiente: g.value }))}
                      className={`h-8 w-full rounded-lg bg-gradient-to-br ${g.value} border-2 transition-all ${form.gradiente === g.value ? "border-foreground scale-110" : "border-transparent"}`}
                      title={g.label}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ícone</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {ICON_OPTIONS.map(({ name, icon: Icon, label }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, icone: name }))}
                      title={label}
                      className={`h-9 w-full rounded-lg flex items-center justify-center border-2 transition-all ${form.icone === name ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Campos */}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Ballet Infantil" />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} placeholder="Breve descrição da atividade..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Preço</Label>
                  <Input value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))} placeholder="R$ 60,00/mês" />
                </div>
                <div className="space-y-1.5">
                  <Label>Observação de Preço</Label>
                  <Input value={form.preco_nota || ""} onChange={e => setForm(f => ({ ...f, preco_nota: e.target.value }))} placeholder="Ex: Material: R$ 25/sem." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Frequência</Label>
                  <Input value={form.frequencia} onChange={e => setForm(f => ({ ...f, frequencia: e.target.value }))} placeholder="1x por semana" />
                </div>
                <div className="space-y-1.5">
                  <Label>Público-alvo</Label>
                  <Input value={form.publico_alvo} onChange={e => setForm(f => ({ ...f, publico_alvo: e.target.value }))} placeholder="Ex: 4 a 10 anos" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Horários</Label>
                <Textarea value={form.horario} onChange={e => setForm(f => ({ ...f, horario: e.target.value }))} rows={2} placeholder="Ex: Terças e Quintas | 13h30 às 14h30" />
              </div>
              <div className="space-y-1.5">
                <Label>Nota (opcional)</Label>
                <Input value={form.nota || ""} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} placeholder="Ex: Quimono não incluso" />
              </div>
            </div>

            {/* Flags */}
            <div className="flex gap-6 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Switch checked={form.gratuito} onCheckedChange={v => setForm(f => ({ ...f, gratuito: v }))} id="gratuito" />
                <Label htmlFor="gratuito" className="cursor-pointer">Gratuito</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.lista_espera} onCheckedChange={v => setForm(f => ({ ...f, lista_espera: v }))} id="lista-espera" />
                <Label htmlFor="lista-espera" className="cursor-pointer">Lista de espera</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} id="ativo" />
                <Label htmlFor="ativo" className="cursor-pointer">Visível no site</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-1.5">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover atividade?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. A atividade será removida da landing page.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

const SQL_MIGRATION = `-- Rode no Supabase SQL Editor
create table if not exists landing_atividades (
  id uuid default gen_random_uuid() primary key,
  unidade_id uuid references unidades(id) on delete cascade,
  titulo text not null,
  descricao text default '',
  preco text default '',
  preco_nota text,
  frequencia text default '',
  horario text default '',
  publico_alvo text default '',
  nota text,
  imagem_url text,
  icone text default 'Activity',
  gradiente text default 'from-blue-500 to-cyan-500',
  lista_espera boolean default false,
  gratuito boolean default false,
  ordem int default 0,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table landing_atividades enable row level security;

create policy "landing_read" on landing_atividades
  for select using (true);

create policy "landing_write" on landing_atividades
  for all using (
    exists (
      select 1 from perfis where user_id = auth.uid()
      and role in ('direcao', 'coordenacao')
    )
  );`;

export default LandingEditor;
