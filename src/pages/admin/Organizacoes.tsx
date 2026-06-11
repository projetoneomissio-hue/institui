import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Copy, Loader2, GraduationCap, Dumbbell, Heart, UserCircle, Globe, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const MATRIZ_ID = "00000000-0000-0000-0000-000000000001";

type OrgType = "escola" | "academia" | "ong" | "personal";

const ORG_TYPES: { id: OrgType; label: string; icon: React.ElementType; flags: Record<string, boolean> }[] = [
  {
    id: "escola", label: "Escola", icon: GraduationCap,
    flags: { saude: true, predio: true, academico: true, comissoes: true, calendario: true, voluntarios: true, landing_publica: true, indicacoes: false },
  },
  {
    id: "academia", label: "Academia / Studio", icon: Dumbbell,
    flags: { saude: false, predio: true, academico: false, comissoes: true, calendario: true, voluntarios: false, landing_publica: true, indicacoes: false },
  },
  {
    id: "ong", label: "ONG / Projeto Social", icon: Heart,
    flags: { saude: true, predio: false, academico: false, comissoes: false, calendario: true, voluntarios: true, landing_publica: false, indicacoes: false },
  },
  {
    id: "personal", label: "Personal / Consultoria", icon: UserCircle,
    flags: { saude: true, predio: false, academico: false, comissoes: false, calendario: true, voluntarios: false, landing_publica: true, indicacoes: false },
  },
];

export default function Organizacoes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<OrgType>("escola");
  const [directorEmail, setDirectorEmail] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [createdInvite, setCreatedInvite] = useState<{ token: string; email: string; org: string } | null>(null);
  const [editingDomain, setEditingDomain] = useState<{ id: string; value: string } | null>(null);

  const { data: orgs, isLoading } = useQuery({
    queryKey: ["admin-organizacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createOrg = useMutation({
    mutationFn: async () => {
      if (!orgName.trim() || !directorEmail.trim()) throw new Error("Preencha todos os campos.");

      const slug = orgName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const selectedType = ORG_TYPES.find((t) => t.id === orgType)!;

      // 1. Criar unidade
      const insertPayload: Record<string, unknown> = { nome: orgName.trim(), slug, feature_flags: selectedType.flags };
      if (customDomain.trim()) insertPayload.custom_domain = customDomain.trim().toLowerCase();

      const { data: unidade, error: unidadeError } = await supabase
        .from("unidades")
        .insert(insertPayload)
        .select()
        .single();
      if (unidadeError) throw unidadeError;

      // 2. Criar convite para o diretor da nova unidade
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error: inviteError } = await supabase
        .from("invitations")
        .insert({
          email: directorEmail.trim().toLowerCase(),
          role: "direcao",
          token,
          expires_at: expiresAt.toISOString(),
          unidade_id: unidade.id,
        });
      if (inviteError) throw inviteError;

      return { token, email: directorEmail.trim(), org: orgName.trim() };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizacoes"] });
      setCreatedInvite(result);
      setOrgName("");
      setOrgType("escola");
      setDirectorEmail("");
      setCustomDomain("");
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao criar organização", description: e.message, variant: "destructive" });
    },
  });

  const updateDomain = useMutation({
    mutationFn: async ({ id, domain }: { id: string; domain: string }) => {
      const { error } = await supabase
        .from("unidades")
        .update({ custom_domain: domain.trim().toLowerCase() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizacoes"] });
      setEditingDomain(null);
      toast({ title: "Domínio atualizado!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao salvar domínio", description: e.message, variant: "destructive" });
    },
  });

  const copyInviteLink = () => {
    if (!createdInvite) return;
    const link = `${window.location.origin}/resgatar-convite?token=${createdInvite.token}&email=${encodeURIComponent(createdInvite.email)}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!", description: "Envie para o diretor da organização." });
  };

  const handleOpenDialog = () => {
    setCreatedInvite(null);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Organizações</h1>
            <p className="text-muted-foreground">Clientes ativos na plataforma</p>
          </div>
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Organização
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !orgs || orgs.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-12 gap-3">
              <Building2 className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma organização cadastrada ainda.</p>
              <Button variant="outline" onClick={handleOpenDialog}>Criar primeira organização</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => {
              const flags = (org as any).feature_flags as Record<string, boolean> | null;
              const activeCount = flags ? Object.values(flags).filter(Boolean).length : 0;
              const customDomainValue = (org as any).custom_domain as string | null;
              const isEditing = editingDomain?.id === org.id;
              return (
                <Card key={org.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{org.nome}</CardTitle>
                      <Badge variant="secondary" className="text-[10px] font-mono shrink-0 mt-0.5">
                        /org/{org.slug}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Desde {format(new Date(org.created_at), "dd/MM/yyyy")} · {activeCount} módulos ativos
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3 pt-0">
                    {/* Domínio customizado */}
                    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Globe className="h-3 w-3" /> Domínio Customizado
                        </span>
                        {!isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] text-primary hover:text-primary/80"
                            onClick={() => setEditingDomain({ id: org.id, value: customDomainValue || "" })}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            {customDomainValue ? "Editar" : "Configurar"}
                          </Button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            className="h-8 text-xs font-mono flex-1"
                            value={editingDomain.value}
                            onChange={(e) => setEditingDomain({ id: org.id, value: e.target.value })}
                            placeholder="sistema.cliente.com.br"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") updateDomain.mutate({ id: org.id, domain: editingDomain.value });
                              if (e.key === "Escape") setEditingDomain(null);
                            }}
                          />
                          <Button
                            size="icon"
                            variant="default"
                            className="h-8 w-8 shrink-0"
                            onClick={() => updateDomain.mutate({ id: org.id, domain: editingDomain.value })}
                            disabled={updateDomain.isPending}
                          >
                            {updateDomain.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingDomain(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : customDomainValue ? (
                        <p className="text-xs font-mono text-foreground truncate">{customDomainValue}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Não configurado — clique em "Configurar"</p>
                      )}
                    </div>

                    {/* Link para landing */}
                    <a
                      href={`/org/${org.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Globe className="h-3 w-3" />
                      Ver landing pública ↗
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createdInvite ? "Organização criada!" : "Nova Organização"}
            </DialogTitle>
          </DialogHeader>

          {createdInvite ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-sm space-y-1">
                <p className="font-semibold text-green-700">
                  {createdInvite.org} criada com sucesso.
                </p>
                <p className="text-muted-foreground">
                  Envie o link abaixo para <strong>{createdInvite.email}</strong> — ele dá acesso de Direção.
                </p>
              </div>
              <div className="flex gap-2 items-center p-3 bg-muted rounded-lg">
                <code className="text-xs flex-1 truncate">
                  {window.location.origin}/resgatar-convite?token={createdInvite.token}&email={encodeURIComponent(createdInvite.email)}
                </code>
                <Button size="sm" variant="ghost" onClick={copyInviteLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Token: <code className="font-mono">{createdInvite.token}</code> — válido por 30 dias.</p>
              <DialogFooter>
                <Button onClick={() => setDialogOpen(false)}>Fechar</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Organização</Label>
                <Input
                  placeholder="Ex: Academia FitLife"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={createOrg.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ORG_TYPES.map((t) => {
                    const Icon = t.icon;
                    const selected = orgType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setOrgType(t.id)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-all",
                          selected ? "border-primary bg-primary/5 font-medium text-primary" : "border-border hover:border-primary/40"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>E-mail do Diretor</Label>
                <Input
                  type="email"
                  placeholder="diretor@organizacao.com"
                  value={directorEmail}
                  onChange={(e) => setDirectorEmail(e.target.value)}
                  disabled={createOrg.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Um convite de 30 dias será gerado para este e-mail.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Domínio Customizado <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  placeholder="sistema.cliente.com.br"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  disabled={createOrg.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  O cliente deve apontar um CNAME para <code className="font-mono">cname.vercel-dns.com</code>.
                </p>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={createOrg.isPending}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => createOrg.mutate()}
                  disabled={createOrg.isPending || !orgName.trim() || !directorEmail.trim()}
                >
                  {createOrg.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</>
                  ) : "Criar e Gerar Convite"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
