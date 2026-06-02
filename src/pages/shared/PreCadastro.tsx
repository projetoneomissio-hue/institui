
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus, Mail, Copy, CheckCircle2, AlertCircle, Plus, Trash2, Search, Database } from "lucide-react";
import { formatCPF, unmaskCPF, validateCPF } from "@/utils/cpf";
import { alunosService } from "@/services/alunos.service";
import { Checkbox } from "@/components/ui/checkbox";
import { useUnidade } from "@/contexts/UnidadeContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface PendingAluno {
  id: string;
  nome: string;
  data_nascimento: string;
  cpf?: string;
}

export default function PreCadastro() {
  const { toast } = useToast();
  const [responsavel, setResponsavel] = useState({
    nome: "",
    email: "",
    cpf: "",
    telefone: "",
    data_nascimento: "",
  });
  const [alunos, setAlunos] = useState<PendingAluno[]>([]);
  const [existingAlunos, setExistingAlunos] = useState<any[]>([]);
  const [isSelfEnrollment, setIsSelfEnrollment] = useState(false);
  const [newAluno, setNewAluno] = useState({ nome: "", data_nascimento: "", cpf: "" });
  const [invitationData, setInvitationData] = useState<{ token: string; link: string } | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const handleResponsavelChange = (field: string, value: string) => {
    if (field === "cpf") {
      value = formatCPF(value.replace(/\D/g, ""));
    }
    setResponsavel((prev) => ({ ...prev, [field]: value }));
  };

  const addAluno = () => {
    if (!newAluno.nome || !newAluno.data_nascimento) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e data de nascimento do aluno são necessários.",
        variant: "destructive",
      });
      return;
    }
    setAlunos((prev) => [...prev, { ...newAluno, id: crypto.randomUUID() }]);
    setNewAluno({ nome: "", data_nascimento: "", cpf: "" });
  };

  const removeAluno = (id: string, isExisting = false) => {
    if (isExisting) {
      setExistingAlunos((prev) => prev.filter((a) => a.id !== id));
    } else {
      setAlunos((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 3) return;
    setIsSearching(true);
    try {
      const results = await alunosService.searchStudents(searchQuery);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const addExistingAluno = (aluno: any) => {
    if (existingAlunos.some(a => a.id === aluno.id)) {
      toast({ title: "Já adicionado", description: "Este aluno já está na lista." });
      return;
    }
    setExistingAlunos(prev => [...prev, aluno]);
    setSearchModalOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const preCadastroMutation = useMutation({
    mutationFn: async () => {
      // 1. Validations
      const cleanCpf = unmaskCPF(responsavel.cpf);
      if (cleanCpf && !validateCPF(cleanCpf)) {
        throw new Error("CPF do responsável inválido.");
      }

      // 2. Check duplicates for Responsavel
      const dups = await alunosService.checkGlobalDuplicate({ 
        cpf: cleanCpf, 
        email: responsavel.email,
        nome: responsavel.nome,
        dataNascimento: responsavel.data_nascimento
      });

      if (dups.profile) {
        throw new Error(`Este responsável já está cadastrado: ${dups.profile.nome_completo} (${dups.profile.email})`);
      }
      
      if (dups.aluno && cleanCpf) {
          throw new Error(`Este CPF pertence ao aluno ${dups.aluno.nome_completo}. Use um CPF diferente para o responsável.`);
      }

      // 3. Check duplicates for Students
      for (const aluno of alunos) {
          const alunoDups = await alunosService.checkGlobalDuplicate({
              cpf: aluno.cpf,
              nome: aluno.nome,
              dataNascimento: aluno.data_nascimento
          });
          if (alunoDups.aluno) {
              throw new Error(`O aluno ${aluno.nome} já está cadastrado no sistema.`);
          }
      }

      // 3. Create Invitation
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: { user } } = await supabase.auth.getUser();

      const { data: invitation, error: invError } = await supabase
        .from("invitations")
        .insert({
          email: responsavel.email,
          role: "responsavel",
          token,
          created_by: user?.id,
          expires_at: expiresAt.toISOString(),
          metadata: {
            responsavel_nome: responsavel.nome,
            responsavel_cpf: cleanCpf,
            responsavel_telefone: responsavel.telefone,
            responsavel_data_nascimento: responsavel.data_nascimento,
            is_self: isSelfEnrollment,
            existing_student_ids: existingAlunos.map(a => a.id),
            alunos: alunos.map(a => ({
              nome: a.nome,
              data_nascimento: a.data_nascimento,
              cpf: unmaskCPF(a.cpf || ""),
            }))
          } as any
        })
        .select()
        .single();

      if (invError) throw invError;

      // 4. Send Email (Optional/Mock)
      try {
        await supabase.functions.invoke("send-invitation-email", {
          body: {
            to: responsavel.email,
            inviteToken: token,
            role: "responsavel",
            origin: window.location.origin,
            nomeResponsavel: responsavel.nome
          }
        });
      } catch (e) {
        console.error("Erro ao enviar email:", e);
      }

      return {
        token,
        link: `${window.location.origin}/login?token=${token}`
      };
    },
    onSuccess: (data) => {
      setInvitationData(data);
      toast({
        title: "Pré-cadastro realizado!",
        description: "O convite foi gerado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no pré-cadastro",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const copyLink = () => {
    if (invitationData) {
      navigator.clipboard.writeText(invitationData.link);
      toast({ title: "Link copiado!", description: "Área de transferência atualizada." });
    }
  };

  if (invitationData) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">Convite Gerado!</CardTitle>
              <CardDescription>
                O pré-cadastro de <strong>{responsavel.nome}</strong> foi concluído.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-white rounded-xl border border-green-500/20 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Link de Acesso:</p>
                <div className="flex gap-2">
                  <Input value={invitationData.link} readOnly className="bg-muted/30" />
                  <Button onClick={copyLink} variant="outline" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Envie este link para o responsável. Ele poderá definir a senha e completar o cadastro.
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                    className="flex-1" 
                    variant="outline"
                    onClick={() => {
                        setInvitationData(null);
                        setResponsavel({ nome: "", email: "", cpf: "", telefone: "", data_nascimento: "" });
                        setAlunos([]);
                        setExistingAlunos([]);
                        setIsSelfEnrollment(false);
                    }}
                >
                  Novo Pré-Cadastro
                </Button>
                <Button className="flex-1" asChild>
                  <a href={`mailto:${responsavel.email}?subject=Convite de Acesso - ${currentUnidade?.nome || 'Zafen'}&body=Olá ${responsavel.nome}, aqui está seu link de acesso: ${invitationData.link}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar por Email
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pré-Cadastro</h1>
          <p className="text-muted-foreground mt-1">
            Cadastre um novo responsável e seus dependentes para gerar um convite de acesso.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Dados do Responsável
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input 
                    id="nome" 
                    placeholder="Ex: Maria Oliveira" 
                    value={responsavel.nome}
                    onChange={(e) => handleResponsavelChange("nome", e.target.value)}
                  />
                </div>
                
                <div className="flex items-center space-x-2 bg-primary/5 p-3 rounded-lg border border-primary/10">
                  <Checkbox 
                    id="isSelf" 
                    checked={isSelfEnrollment} 
                    onCheckedChange={(checked) => setIsSelfEnrollment(checked === true)}
                  />
                  <Label htmlFor="isSelf" className="text-sm cursor-pointer font-medium">
                    O responsável é o próprio aluno (Auto-Matrícula)
                  </Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email de Contato *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="email@exemplo.com" 
                      value={responsavel.email}
                      onChange={(e) => handleResponsavelChange("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data_nasc_resp">Data de Nascimento *</Label>
                    <Input 
                      id="data_nasc_resp" 
                      type="date"
                      value={responsavel.data_nascimento}
                      onChange={(e) => handleResponsavelChange("data_nascimento", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input 
                      id="cpf" 
                      placeholder="000.000.000-00" 
                      value={responsavel.cpf}
                      onChange={(e) => handleResponsavelChange("cpf", e.target.value)}
                      maxLength={14}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                    <Input 
                      id="telefone" 
                      placeholder="(00) 00000-0000" 
                      value={responsavel.telefone}
                      onChange={(e) => handleResponsavelChange("telefone", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={isSelfEnrollment ? "opacity-40 pointer-events-none" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Dependente(s) / Alunos
                  </CardTitle>
                  <CardDescription>Adicione ou vincule os alunos deste responsável.</CardDescription>
                </div>
                
                <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Search className="h-4 w-4" /> Buscar Existente
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Buscar Aluno Existente</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Nome do aluno (mín. 3 letras)" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <Button onClick={handleSearch} disabled={isSearching || searchQuery.length < 3}>
                          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                        </Button>
                      </div>
                      
                      <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {searchResults.length === 0 && !isSearching && searchQuery.length >= 3 && (
                          <p className="text-center text-sm text-muted-foreground py-8">Nenhum aluno encontrado.</p>
                        )}
                        {searchResults.map((aluno) => (
                          <div key={aluno.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                            <div>
                              <p className="font-semibold text-sm">{aluno.nome_completo}</p>
                              <p className="text-xs text-muted-foreground">
                                Nasc: {aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR') : 'N/A'} 
                                {aluno.cpf ? ` • CPF: ${aluno.cpf}` : ''}
                              </p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => addExistingAluno(aluno)}>
                              Vincular
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl border border-dashed">
                  <div className="space-y-2">
                    <Label className="text-xs">Nome do Aluno</Label>
                    <Input 
                      placeholder="Nome completo" 
                      value={newAluno.nome}
                      onChange={(e) => setNewAluno(prev => ({ ...prev, nome: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Data de Nascimento</Label>
                    <Input 
                      type="date" 
                      value={newAluno.data_nascimento}
                      onChange={(e) => setNewAluno(prev => ({ ...prev, data_nascimento: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={addAluno} className="w-full h-9">
                      <Plus className="h-4 w-4 mr-1" /> Adicionar Novo Aluno
                    </Button>
                  </div>
                </div>

                {(alunos.length > 0 || existingAlunos.length > 0) && (
                  <div className="space-y-2 pt-2">
                    {/* Alunos Existentes (Vinculados) */}
                    {existingAlunos.map((aluno) => (
                      <div key={aluno.id} className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                          <Database className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-semibold text-sm">{aluno.nome_completo} <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-1 tracking-tight">EXISTENTE</span></p>
                            <p className="text-xs text-muted-foreground">Nasc: {aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR') : 'N/A'}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeAluno(aluno.id, true)} className="text-destructive h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Alunos Novos */}
                    {alunos.map((aluno) => (
                      <div key={aluno.id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                          <UserPlus className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-semibold text-sm">{aluno.nome}</p>
                            <p className="text-xs text-muted-foreground">Nasc: {new Date(aluno.data_nascimento).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeAluno(aluno.id)} className="text-destructive h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-primary/5 border-primary/20 sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Responsável:</span>
                        <span className="font-medium">{responsavel.nome || "-"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium truncate ml-4">{responsavel.email || "-"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Alunos:</span>
                        <span className="font-medium">
                          {(isSelfEnrollment ? 1 : 0) + alunos.length + existingAlunos.length}
                        </span>
                    </div>
                </div>

                <div className="pt-4 border-t border-primary/10">
                    <AlertCircle className="h-4 w-4 text-primary inline mr-2" />
                    <span className="text-xs text-muted-foreground">
                        Ao finalizar, um convite será criado. O responsável receberá um email e poderá completar o cadastro no sistema.
                    </span>
                </div>

                <Button 
                    className="w-full h-11" 
                    disabled={!responsavel.nome || !responsavel.email || preCadastroMutation.isPending}
                    onClick={() => preCadastroMutation.mutate()}
                >
                  {preCadastroMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Finalizar Pré-Cadastro
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
