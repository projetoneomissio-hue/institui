import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Bell, Loader2, Building2, TrendingUp, ChevronRight, LayoutGrid, ShieldCheck, Mail } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { formatCPF, unmaskCPF, validateCPF } from "@/utils/cpf";
import { UnitSettingsForm } from "@/components/direcao/UnitSettingsForm";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(100, "Nome muito longo"),
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  cpf: z.string().optional(),
  phone: z.string().trim().optional(),
}).refine((data) => {
  if (data.cpf) {
    const clean = unmaskCPF(data.cpf);
    return clean.length === 11 && validateCPF(clean);
  }
  return true;
}, {
  message: "CPF inválido",
  path: ["cpf"],
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres").max(100, "Senha muito longa"),
  confirmPassword: z.string().min(6, "Confirmação é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

const Configuracoes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [activeTab, setActiveTab] = useState("profile");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("nome_completo, email, cpf, telefone")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const settingsMenu = [
    { 
      id: "profile", 
      label: "Meu Perfil", 
      description: "Informações básicas e contato",
      icon: User 
    },
    { 
      id: "security", 
      label: "Segurança", 
      description: "Senha e proteção da conta",
      icon: Lock 
    },
    { 
      id: "preferences", 
      label: "Preferências", 
      description: "Notificações e aparência",
      icon: Bell 
    },
    ...(user?.activeRole === 'direcao' ? [{ 
      id: "organization", 
      label: "Organização", 
      description: "Identidade visual e dados da unidade",
      icon: Building2 
    }] : []),
  ];

  const requestNotificationPermission = async () => {
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      toast({ title: "Notificações ativadas com sucesso!" });
    } else {
      toast({ title: "Permissão negada", variant: "destructive" });
    }
  };

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      cpf: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.nome_completo || user?.name || "",
        email: profile.email || user?.email || "",
        cpf: profile.cpf ? formatCPF(profile.cpf) : "",
        phone: profile.telefone || "",
      });
    }
  }, [profile, user, profileForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const cleanCPF = data.cpf ? unmaskCPF(data.cpf) : null;
      const { error } = await supabase
        .from("profiles")
        .update({
          nome_completo: data.name,
          // email: data.email, // Email change usually requires Supabase Auth email change flow
          cpf: cleanCPF,
          telefone: data.phone,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile-settings", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-progress", user?.id] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });
      if (error) throw error;
      
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
      passwordForm.reset();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex bg-background h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background/50">
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Configurações
            </h1>
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
                    {activeTab === item.id && (
                      <ChevronRight className="h-4 w-4 ml-auto shrink-0 opacity-50" />
                    )}
                  </button>
                ))}
              </nav>

              {/* Status Section */}
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
              {activeTab === "profile" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-border/50 shadow-xl shadow-black/5 bg-card">
                    <CardHeader className="border-b border-border/30 pb-8">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl">Dados Pessoais</CardTitle>
                          <CardDescription>Atualize como você aparece no sistema</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-10">
                      <Form {...profileForm}>
                        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <FormField
                              control={profileForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Nome Completo</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Seu nome completo" {...field} className="h-12 bg-background/50 border-border/50 text-base" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={profileForm.control}
                              name="email"
                              render={({ field }) => (
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
                              )}
                            />

                            <FormField
                              control={profileForm.control}
                              name="cpf"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Documento (CPF)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="000.000.000-00" 
                                      maxLength={14}
                                      {...field} 
                                      className="h-12 bg-background/50 border-border/50"
                                      onChange={(e) => field.onChange(formatCPF(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={profileForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Contato Celular</FormLabel>
                                  <FormControl>
                                    <Input placeholder="(00) 00000-0000" {...field} className="h-12 bg-background/50 border-border/50" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="pt-6 border-t border-border/30 flex items-center justify-between">
                            <p className="text-xs text-muted-foreground max-w-[60%] italic">
                              Última atualização em {new Date().toLocaleDateString('pt-BR')}
                            </p>
                            <div className="flex gap-3">
                              <Button type="button" variant="ghost" onClick={() => profileForm.reset()} className="h-12">
                                Descartar
                              </Button>
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
                          <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Senha Atual</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="••••••••" {...field} className="h-12 border-border/50" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={passwordForm.control}
                              name="newPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nova Senha</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} className="h-12 border-border/50" />
                                  </FormControl>
                                  <FormDescription className="text-[10px]">
                                    Use pelo menos 6 caracteres e símbolos.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={passwordForm.control}
                              name="confirmPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Confirmar Nova Senha</FormLabel>
                                  <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} className="h-12 border-border/50" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="pt-10 flex flex-col gap-4">
                            <Button type="submit" className="h-12 w-full font-bold bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20">
                              Atualizar Senha de Acesso
                            </Button>
                            <Button type="button" variant="outline" onClick={() => passwordForm.reset()} className="h-12 w-full">
                              Lembrar senha antiga
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>
              )}

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
                            Notificar quando um aluno for aprovado ou concluir curso.
                          </p>
                        </div>
                        <Switch id="matriculas-notifications" defaultChecked />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 shadow-xl shadow-black/5 bg-card">
                    <CardHeader className="border-b border-border/30 pb-6 flex flex-row items-center gap-4 space-y-0 text-amber-500">
                      <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <LayoutGrid className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-foreground">Aparência do Workspace</CardTitle>
                        <CardDescription>Personalize sua visão individual do sistema</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="divide-y divide-border/30 pt-4">
                      <div className="flex items-center justify-between py-5 text-balance">
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
                          <p className="text-xs text-muted-foreground">
                            Transições suaves entre telas e carregamentos.
                          </p>
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

              {activeTab === "organization" && user?.activeRole === 'direcao' && (
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
            </main>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;
