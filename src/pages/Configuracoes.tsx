import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useUnidade } from "@/contexts/UnidadeContext";
import { useAllFeatures, type FeatureKey } from "@/contexts/FeatureContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  User, Lock, Bell, Loader2, Building2, TrendingUp, ChevronRight,
  LayoutGrid, ShieldCheck, Mail, Sliders, Heart, GraduationCap,
  DollarSign, Calendar, Users, Share2, Globe, CheckCircle2,
  Camera, Trash2, CreditCard, Copy, ExternalLink, Zap,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF, unmaskCPF, validateCPF } from "@/utils/cpf";
import { UnitSettingsForm } from "@/components/direcao/UnitSettingsForm";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const profileSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(100, "Nome muito longo"),
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  cpf: z.string().optional(),
  phone: z.string().trim().optional(),
  avatar_url: z.string().optional(),
}).refine((data) => {
  if (data.cpf) {
    const clean = unmaskCPF(data.cpf);
    return clean.length === 11 && validateCPF(clean);
  }
  return true;
}, { message: "CPF inválido", path: ["cpf"] });

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres").max(100),
  confirmPassword: z.string().min(6, "Confirmação é obrigatória"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

// ---------------------------------------------------------------------------
// Definição dos módulos (para a aba Módulos)
// ---------------------------------------------------------------------------
const MODULES: { key: FeatureKey; label: string; description: string; icon: React.ElementType; color: string }[] = [
  {
    key: "saude",
    label: "Saúde & PNE",
    description: "Anamnese dos participantes, laudos médicos e necessidades especiais (PNE/PCD).",
    icon: Heart,
    color: "text-rose-500 bg-rose-500/10",
  },
  {
    key: "predio",
    label: "Espaço Físico",
    description: "Gestão de custos operacionais, locações de salas e controle de funcionários.",
    icon: Building2,
    color: "text-orange-500 bg-orange-500/10",
  },
  {
    key: "academico",
    label: "Acadêmico",
    description: "Grade de avaliações, registro de notas, chamada e controle por bimestre.",
    icon: GraduationCap,
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    key: "comissoes",
    label: "Comissões",
    description: "Cálculo e controle de comissões para instrutores e professores.",
    icon: DollarSign,
    color: "text-emerald-500 bg-emerald-500/10",
  },
  {
    key: "calendario",
    label: "Calendário",
    description: "Calendário de eventos, feriados e datas importantes da instituição.",
    icon: Calendar,
    color: "text-violet-500 bg-violet-500/10",
  },
  {
    key: "voluntarios",
    label: "Voluntários",
    description: "Gestão de voluntários e acesso para perfis de secretaria e atendimento.",
    icon: Users,
    color: "text-cyan-500 bg-cyan-500/10",
  },
  {
    key: "indicacoes",
    label: "Indicações",
    description: "Sistema de referência: rastreie quem indicou cada novo membro cadastrado.",
    icon: Share2,
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    key: "landing_publica",
    label: "Site Público",
    description: "Landing page pública da instituição com formulário de matrícula online.",
    icon: Globe,
    color: "text-indigo-500 bg-indigo-500/10",
  },
  {
    key: "matricula_aprovacao_automatica",
    label: "Aprovação Automática de Matrícula",
    description: "Aprova a matrícula automaticamente quando há vaga disponível na turma. Desligado: toda solicitação passa pela direção ou secretaria antes de ser confirmada.",
    icon: Zap,
    color: "text-yellow-500 bg-yellow-500/10",
  },
];

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
const Configuracoes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUnidade, refreshUnidade } = useUnidade();
  const allFeatures = useAllFeatures();

  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [activeTab, setActiveTab] = useState("profile");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [localFlags, setLocalFlags] = useState<Record<FeatureKey, boolean>>(allFeatures);
  const [flagsSaved, setFlagsSaved] = useState(false);
  const [emailFromName, setEmailFromName] = useState("");
  const [emailReplyTo, setEmailReplyTo] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [gatewayProvider, setGatewayProvider] = useState<string>("");
  const [gatewayHandle, setGatewayHandle] = useState<string>("");
  const [gatewaySaved, setGatewaySaved] = useState(false);

  // Sincroniza localFlags quando unidade muda
  useEffect(() => {
    setLocalFlags(allFeatures);
  }, [currentUnidade?.id]);

  // ---------------------------------------------------------------------------
  // Menu lateral
  // ---------------------------------------------------------------------------
  const settingsMenu = [
    { id: "profile",      label: "Meu Perfil",   description: "Informações básicas e contato",        icon: User      },
    { id: "security",     label: "Segurança",     description: "Senha e proteção da conta",             icon: Lock      },
    { id: "preferences",  label: "Preferências",  description: "Notificações e aparência",              icon: Bell      },
    ...(user?.activeRole === "direcao" ? [
      { id: "organization", label: "Organização", description: "Identidade visual e dados da unidade",  icon: Building2  },
      { id: "modules",      label: "Módulos",     description: "Ative ou desative funcionalidades",     icon: Sliders    },
      { id: "email",        label: "Email",        description: "Nome do remetente e reply-to",          icon: Mail       },
      { id: "pagamentos",   label: "Pagamentos",  description: "Gateway e intermediador financeiro",    icon: CreditCard },
    ] : []),
  ];

  // ---------------------------------------------------------------------------
  // Dados do perfil
  // ---------------------------------------------------------------------------
  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("nome_completo, email, cpf, telefone, avatar_url")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
  });

  // ---------------------------------------------------------------------------
  // Mutation — feature flags
  // ---------------------------------------------------------------------------
  const saveModulesMutation = useMutation({
    mutationFn: async (flags: Record<FeatureKey, boolean>) => {
      if (!currentUnidade?.id) throw new Error("Nenhuma unidade selecionada");
      const { error } = await supabase
        .from("unidades")
        .update({ feature_flags: flags })
        .eq("id", currentUnidade.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshUnidade();
      queryClient.invalidateQueries({ queryKey: ["unidade"] });
      setFlagsSaved(true);
      setTimeout(() => setFlagsSaved(false), 3000);
      toast({ title: "Módulos salvos", description: "As configurações foram aplicadas para todos os usuários desta unidade." });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar módulos", description: err.message, variant: "destructive" });
    },
  });

  // ---------------------------------------------------------------------------
  // Email config — carrega ao entrar na aba
  // ---------------------------------------------------------------------------
  useQuery({
    queryKey: ["email-config", currentUnidade?.id],
    enabled: !!currentUnidade?.id && user?.activeRole === "direcao",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("email_config")
        .eq("id", currentUnidade!.id)
        .single();
      if (error) throw error;
      const cfg = (data as any)?.email_config;
      setEmailFromName(cfg?.from_name ?? "");
      setEmailReplyTo(cfg?.reply_to ?? "");
      return cfg;
    },
  });

  useQuery({
    queryKey: ["gateway-config", currentUnidade?.id],
    enabled: !!currentUnidade?.id && user?.activeRole === "direcao",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("gateway_config")
        .eq("id", currentUnidade!.id)
        .single();
      if (error) throw error;
      const cfg = (data as any)?.gateway_config;
      setGatewayProvider(cfg?.provider ?? "");
      setGatewayHandle(cfg?.handle ?? "");
      return cfg;
    },
  });

  const saveGatewayMutation = useMutation({
    mutationFn: async () => {
      if (!currentUnidade?.id) throw new Error("Nenhuma unidade selecionada");
      const { error } = await supabase
        .from("unidades")
        .update({ gateway_config: { provider: gatewayProvider, handle: gatewayHandle.trim() } })
        .eq("id", currentUnidade.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setGatewaySaved(true);
      setTimeout(() => setGatewaySaved(false), 3000);
      toast({ title: "Gateway salvo", description: "Pagamentos serão processados com as novas credenciais." });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const saveEmailConfigMutation = useMutation({
    mutationFn: async () => {
      if (!currentUnidade?.id) throw new Error("Nenhuma unidade selecionada");
      const { error } = await supabase
        .from("unidades")
        .update({ email_config: { from_name: emailFromName.trim(), reply_to: emailReplyTo.trim() || null } })
        .eq("id", currentUnidade.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 3000);
      toast({ title: "Configurações de email salvas" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  // ---------------------------------------------------------------------------
  // Notificações
  // ---------------------------------------------------------------------------
  const requestNotificationPermission = async () => {
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      toast({ title: "Notificações ativadas com sucesso!" });
    } else {
      toast({ title: "Permissão negada", variant: "destructive" });
    }
  };

  // ---------------------------------------------------------------------------
  // Formulário de perfil
  // ---------------------------------------------------------------------------
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", email: "", cpf: "", phone: "", avatar_url: "" },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.nome_completo || user?.name || "",
        email: profile.email || user?.email || "",
        cpf: profile.cpf ? formatCPF(profile.cpf) : "",
        phone: profile.telefone || "",
        avatar_url: (profile as any).avatar_url || "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const onUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user?.id) return;
    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`;
    setIsUploadingAvatar(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("unidades")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("unidades").getPublicUrl(fileName);
      profileForm.setValue("avatar_url", data.publicUrl, { shouldDirty: true });
      toast({ title: "Foto carregada!", description: "Clique em salvar para confirmar." });
    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const cleanCPF = data.cpf ? unmaskCPF(data.cpf) : null;
      const { error } = await supabase
        .from("profiles")
        .update({ nome_completo: data.name, cpf: cleanCPF, telefone: data.phone, avatar_url: data.avatar_url || null })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile-settings", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-progress", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile-avatar", user?.id] });
      toast({ title: "Perfil atualizado", description: "Suas informações foram atualizadas com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  // ---------------------------------------------------------------------------
  // Formulário de senha
  // ---------------------------------------------------------------------------
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: data.newPassword });
      if (error) throw error;
      toast({ title: "Senha alterada", description: "Sua senha foi alterada com sucesso." });
      passwordForm.reset();
    } catch (error: any) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    }
  };

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex bg-background h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background/50">
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Configurações</h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Gerencie sua conta pessoal e as diretrizes visuais da sua organização em um só lugar.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-10">
            {/* Nav Sidebar */}
            <aside className="w-full lg:w-72 shrink-0">
              <nav className="flex flex-col gap-1 p-1 bg-card rounded-2xl border border-border/50 shadow-sm">
                {settingsMenu.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group text-left",
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 shrink-0 rounded-lg flex items-center justify-center transition-colors",
                      activeTab === item.id ? "bg-white/20" : "bg-muted-foreground/10 group-hover:bg-muted-foreground/20"
                    )}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-bold text-sm leading-tight">{item.label}</span>
                      <span className={cn(
                        "text-[10px] truncate leading-tight opacity-70",
                        activeTab === item.id ? "text-white" : "text-muted-foreground"
                      )}>
                        {item.description}
                      </span>
                    </div>
                    {activeTab === item.id && <ChevronRight className="h-4 w-4 ml-auto shrink-0 opacity-50" />}
                  </button>
                ))}
              </nav>

              <div className="mt-8 p-6 rounded-2xl border border-dashed border-border/60 bg-muted/20 opacity-60">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Segurança Ativa</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Sua conta está protegida por criptografia de ponta a ponta e autenticação Supabase Auth.
                </p>
              </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 min-w-0 pb-10">

              {/* ── PERFIL ─────────────────────────────────────────────── */}
              {activeTab === "profile" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-border/50 shadow-xl shadow-black/5 bg-card">
                    <CardHeader className="border-b border-border/30 pb-8">
                      <div className="flex items-center gap-5">
                        {/* Avatar upload */}
                        <div className="relative group shrink-0">
                          <div className="h-20 w-20 rounded-full border-2 border-dashed border-border overflow-hidden bg-muted/50 flex items-center justify-center shadow-inner">
                            {isUploadingAvatar ? (
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            ) : profileForm.watch("avatar_url") ? (
                              <img src={profileForm.watch("avatar_url")} alt="Foto de perfil" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-3xl font-black text-primary uppercase select-none">
                                {user?.name?.[0] || "?"}
                              </span>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => document.getElementById("avatar-upload")?.click()}
                              className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                              title="Alterar foto"
                            >
                              <Camera className="h-4 w-4 text-white" />
                            </button>
                            {profileForm.watch("avatar_url") && (
                              <button
                                type="button"
                                onClick={() => profileForm.setValue("avatar_url", "", { shouldDirty: true })}
                                className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                                title="Remover foto"
                              >
                                <Trash2 className="h-4 w-4 text-white" />
                              </button>
                            )}
                          </div>
                          <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={onUploadAvatar} />
                        </div>
                        <div>
                          <CardTitle className="text-2xl">Dados Pessoais</CardTitle>
                          <CardDescription>Atualize como você aparece no sistema</CardDescription>
                          <p className="text-[11px] text-muted-foreground/60 mt-1.5">Passe o mouse sobre a foto para alterar</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-10">
                      <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit((d) => updateProfileMutation.mutate(d))} className="space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <FormField control={profileForm.control} name="name" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Nome Completo</FormLabel>
                                <FormControl><Input placeholder="Seu nome completo" {...field} className="h-12 bg-background/50 border-border/50 text-base" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />

                            <FormField control={profileForm.control} name="email" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">E-mail Principal</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input type="email" {...field} disabled className="h-12 bg-muted/40 border-border/30 pl-10 opacity-70" />
                                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground/50" />
                                  </div>
                                </FormControl>
                                <FormDescription className="text-[10px] flex items-center gap-1 mt-1.5">
                                  <Lock className="h-3 w-3" /> E-mail usado para login (Gestão Centralizada)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )} />

                            <FormField control={profileForm.control} name="cpf" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Documento (CPF)</FormLabel>
                                <FormControl>
                                  <Input placeholder="000.000.000-00" maxLength={14} {...field} className="h-12 bg-background/50 border-border/50"
                                    onChange={(e) => field.onChange(formatCPF(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />

                            <FormField control={profileForm.control} name="phone" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Contato Celular</FormLabel>
                                <FormControl><Input placeholder="(00) 00000-0000" {...field} className="h-12 bg-background/50 border-border/50" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>

                          <div className="pt-6 border-t border-border/30 flex items-center justify-between">
                            <p className="text-xs text-muted-foreground max-w-[60%] italic">
                              Última atualização em {new Date().toLocaleDateString("pt-BR")}
                            </p>
                            <div className="flex gap-3">
                              <Button type="button" variant="ghost" onClick={() => profileForm.reset()} className="h-12">Descartar</Button>
                              <Button type="submit" disabled={updateProfileMutation.isPending} className="h-12 px-8 font-bold shadow-lg shadow-primary/20">
                                {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Perfil
                              </Button>
                            </div>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ── SEGURANÇA ──────────────────────────────────────────── */}
              {activeTab === "security" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-border/50 shadow-xl shadow-black/5 bg-card">
                    <CardHeader className="border-b border-border/30 pb-8">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                          <Lock className="h-6 w-6 text-amber-500" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl">Segurança da Conta</CardTitle>
                          <CardDescription>Mantenha sua senha forte e atualizada</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-10">
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6 max-w-xl mx-auto">
                          <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha Atual</FormLabel>
                              <FormControl><Input type="password" placeholder="••••••••" {...field} className="h-12 border-border/50" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nova Senha</FormLabel>
                                <FormControl><Input type="password" placeholder="••••••••" {...field} className="h-12 border-border/50" /></FormControl>
                                <FormDescription className="text-[10px]">Use pelo menos 6 caracteres e símbolos.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirmar Nova Senha</FormLabel>
                                <FormControl><Input type="password" placeholder="••••••••" {...field} className="h-12 border-border/50" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                          <div className="pt-10 flex flex-col gap-4">
                            <Button type="submit" className="h-12 w-full font-bold bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20">
                              Atualizar Senha de Acesso
                            </Button>
                            <Button type="button" variant="outline" onClick={() => passwordForm.reset()} className="h-12 w-full">
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ── PREFERÊNCIAS ───────────────────────────────────────── */}
              {activeTab === "preferences" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                  <Card className="border-border/50 shadow-xl shadow-black/5 bg-card">
                    <CardHeader className="border-b border-border/30 pb-6 flex flex-row items-center gap-4 space-y-0">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Notificações Inteligentes</CardTitle>
                        <CardDescription>Defina como deseja ser avisado sobre o dia a dia</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="divide-y divide-border/30 pt-4">
                      <div className="flex items-center justify-between py-5">
                        <div className="space-y-1">
                          <Label className="text-base">Notificações Push</Label>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            Receba alertas em tempo real no seu navegador ou dispositivo mobile.
                          </p>
                        </div>
                        <Button
                          variant={notificationPermission === "granted" ? "outline" : "default"}
                          onClick={requestNotificationPermission}
                          disabled={notificationPermission === "granted"}
                          size="sm"
                          className="min-w-[100px]"
                        >
                          {notificationPermission === "granted" ? "Ativado" : "Ativar Agora"}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between py-5">
                        <div className="space-y-1">
                          <Label className="text-base" htmlFor="email-notifications">Resumos por E-mail</Label>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            Enviaremos um resumo semanal das atividades e métricas financeiras.
                          </p>
                        </div>
                        <Switch id="email-notifications" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between py-5">
                        <div className="space-y-1">
                          <Label className="text-base" htmlFor="matriculas-notifications">Status de Matrículas</Label>
                          <p className="text-xs text-muted-foreground">
                            Notificar quando um participante for aprovado ou concluir programa.
                          </p>
                        </div>
                        <Switch id="matriculas-notifications" defaultChecked />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 shadow-xl shadow-black/5 bg-card">
                    <CardHeader className="border-b border-border/30 pb-6 flex flex-row items-center gap-4 space-y-0">
                      <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <LayoutGrid className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Aparência do Workspace</CardTitle>
                        <CardDescription>Personalize sua visão individual do sistema</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="divide-y divide-border/30 pt-4">
                      <div className="flex items-center justify-between py-5">
                        <div className="space-y-1">
                          <Label className="text-base" htmlFor="compact-mode">Foco e Produtividade (Modo Compacto)</Label>
                          <p className="text-xs text-muted-foreground">
                            Reduz as margens e tamanhos para exibir mais dados na tela.
                          </p>
                        </div>
                        <Switch id="compact-mode" />
                      </div>
                      <div className="flex items-center justify-between py-5">
                        <div className="space-y-1">
                          <Label className="text-base" htmlFor="animations">Experiência Fluida (Animações)</Label>
                          <p className="text-xs text-muted-foreground">Transições suaves entre telas e carregamentos.</p>
                        </div>
                        <Switch id="animations" defaultChecked />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end pt-4">
                    <Button size="lg" className="px-10 h-14 text-lg font-bold">
                      Salvar Todas as Preferências
                    </Button>
                  </div>
                </div>
              )}

              {/* ── ORGANIZAÇÃO ────────────────────────────────────────── */}
              {activeTab === "organization" && user?.activeRole === "direcao" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-primary/20 shadow-xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                      <TrendingUp className="h-32 w-32 text-primary" />
                    </div>
                    <CardHeader className="border-b border-border/30 pb-10 relative z-10">
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                          <Building2 className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-3xl font-bold">Identidade da Marca</CardTitle>
                          <CardDescription className="text-base">
                            Personalize a experiência visual, logo e cores da sua unidade.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-10 pb-12">
                      <UnitSettingsForm />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ── MÓDULOS ────────────────────────────────────────────── */}
              {activeTab === "modules" && user?.activeRole === "direcao" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                  <Card className="border-border/50 shadow-xl shadow-black/5 bg-card">
                    <CardHeader className="border-b border-border/30 pb-8">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <Sliders className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl">Módulos da Instituição</CardTitle>
                          <CardDescription>
                            Ative apenas as funcionalidades que fazem sentido para a sua organização.
                            As alterações são aplicadas para todos os usuários desta unidade.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-6 divide-y divide-border/30">
                      {MODULES.map((mod) => {
                        const Icon = mod.icon;
                        const isOn = localFlags[mod.key];
                        return (
                          <div
                            key={mod.key}
                            className={cn(
                              "flex items-center gap-5 py-5 transition-opacity duration-300",
                              !isOn && "opacity-50"
                            )}
                          >
                            <div className={cn("h-11 w-11 shrink-0 rounded-xl flex items-center justify-center", mod.color)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-semibold text-sm text-foreground">{mod.label}</span>
                                {isOn ? (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
                                    Ativo
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border text-muted-foreground">
                                    Inativo
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{mod.description}</p>
                            </div>
                            <Switch
                              checked={isOn}
                              onCheckedChange={(checked) =>
                                setLocalFlags((prev) => ({ ...prev, [mod.key]: checked }))
                              }
                              className="shrink-0"
                            />
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {/* Botão salvar */}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      As mudanças entram em vigor assim que salvas — sem recarregar a página.
                    </p>
                    <Button
                      size="lg"
                      onClick={() => saveModulesMutation.mutate(localFlags)}
                      disabled={saveModulesMutation.isPending}
                      className={cn(
                        "h-12 px-10 font-bold shadow-lg shadow-primary/20 gap-2",
                        flagsSaved && "bg-emerald-600 hover:bg-emerald-700"
                      )}
                    >
                      {saveModulesMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : flagsSaved ? (
                        <><CheckCircle2 className="h-4 w-4" /> Salvo!</>
                      ) : (
                        "Salvar Módulos"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── EMAIL ─────────────────────────────────────────────── */}
              {activeTab === "email" && user?.activeRole === "direcao" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-border/50 shadow-xl shadow-black/5">
                    <CardHeader className="border-b border-border/30 pb-8">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl">Configurações de Email</CardTitle>
                          <CardDescription>
                            Os emails do sistema são enviados pela plataforma, mas com o nome da sua organização.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="from-name">Nome do Remetente</Label>
                        <Input
                          id="from-name"
                          placeholder="Ex: Academia FitLife"
                          value={emailFromName}
                          onChange={(e) => setEmailFromName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Aparece como: <code className="bg-muted px-1 rounded">{emailFromName || "Institui"} &lt;noreply@institui.com.br&gt;</code>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reply-to">Reply-to (opcional)</Label>
                        <Input
                          id="reply-to"
                          type="email"
                          placeholder="Ex: contato@suaorg.com.br"
                          value={emailReplyTo}
                          onChange={(e) => setEmailReplyTo(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Quando o destinatário responder ao email, a resposta vai para este endereço.
                        </p>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          size="lg"
                          onClick={() => saveEmailConfigMutation.mutate()}
                          disabled={saveEmailConfigMutation.isPending || !emailFromName.trim()}
                          className={cn(
                            "h-12 px-10 font-bold shadow-lg shadow-primary/20 gap-2",
                            emailSaved && "bg-emerald-600 hover:bg-emerald-700"
                          )}
                        >
                          {saveEmailConfigMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : emailSaved ? (
                            <><CheckCircle2 className="h-4 w-4" /> Salvo!</>
                          ) : (
                            "Salvar"
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ── PAGAMENTOS ─────────────────────────────────────────── */}
              {activeTab === "pagamentos" && user?.activeRole === "direcao" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                  <Card className="border-border/50 shadow-xl shadow-black/5">
                    <CardHeader className="border-b border-border/30 pb-8">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                          <CreditCard className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl">Gateway de Pagamento</CardTitle>
                          <CardDescription>
                            Conecte o intermediador financeiro da sua organização. Os pagamentos dos responsáveis
                            vão diretamente para a conta que você configurar aqui.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-8">

                      {/* Escolha do gateway */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Intermediador de Pagamento</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { id: "infinitepay", label: "InfinitePay", desc: "PIX e Cartão", available: true },
                            { id: "asaas",       label: "Asaas",       desc: "PIX, Boleto e Cartão", available: false },
                            { id: "mercadopago", label: "Mercado Pago",desc: "PIX e Cartão", available: false },
                          ].map((gw) => (
                            <button
                              key={gw.id}
                              type="button"
                              disabled={!gw.available}
                              onClick={() => gw.available && setGatewayProvider(gw.id)}
                              className={cn(
                                "relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all",
                                gatewayProvider === gw.id
                                  ? "border-emerald-500 bg-emerald-500/5"
                                  : "border-border/50 hover:border-border",
                                !gw.available && "opacity-40 cursor-not-allowed"
                              )}
                            >
                              <span className="font-semibold text-sm">{gw.label}</span>
                              <span className="text-xs text-muted-foreground">{gw.desc}</span>
                              {!gw.available && (
                                <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground border border-border/50 rounded px-1.5 py-0.5">
                                  Em breve
                                </span>
                              )}
                              {gatewayProvider === gw.id && (
                                <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-emerald-500" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Handle / credencial */}
                      {gatewayProvider === "infinitepay" && (
                        <div className="space-y-2">
                          <Label htmlFor="gateway-handle">Seu InfiniteTag (Handle)</Label>
                          <Input
                            id="gateway-handle"
                            placeholder="ex: neomissio"
                            value={gatewayHandle}
                            onChange={(e) => setGatewayHandle(e.target.value)}
                            className="h-12 border-border/50 font-mono"
                          />
                          <p className="text-xs text-muted-foreground">
                            Encontre no painel InfinitePay → Configurações → InfiniteTag.
                            Os pagamentos dos responsáveis irão direto para sua conta.
                          </p>
                        </div>
                      )}

                      {/* Webhook URL */}
                      {gatewayProvider && (
                        <div className="space-y-2">
                          <Label>URL do Webhook</Label>
                          <div className="flex gap-2">
                            <Input
                              readOnly
                              value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/infinitepay-webhook`}
                              className="h-12 border-border/50 font-mono text-xs bg-muted/30"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-12 w-12 shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/infinitepay-webhook`
                                );
                                toast({ title: "URL copiada!" });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Registre essa URL no painel do seu gateway em "Webhooks" para que as
                            confirmações de pagamento cheguem automaticamente ao sistema.
                          </p>
                        </div>
                      )}

                      {/* Aviso de segurança */}
                      <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 flex gap-3">
                        <ShieldCheck className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Segurança das credenciais</p>
                          <p className="text-xs text-muted-foreground">
                            O identificador é armazenado de forma segura e criptografada. Nunca compartilhe
                            sua chave de API ou secret do webhook com terceiros.
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          size="lg"
                          onClick={() => saveGatewayMutation.mutate()}
                          disabled={saveGatewayMutation.isPending || !gatewayProvider || !gatewayHandle.trim()}
                          className={cn(
                            "h-12 px-10 font-bold shadow-lg shadow-primary/20 gap-2",
                            gatewaySaved && "bg-emerald-600 hover:bg-emerald-700"
                          )}
                        >
                          {saveGatewayMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : gatewaySaved ? (
                            <><CheckCircle2 className="h-4 w-4" /> Salvo!</>
                          ) : (
                            "Salvar Gateway"
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

            </main>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;
