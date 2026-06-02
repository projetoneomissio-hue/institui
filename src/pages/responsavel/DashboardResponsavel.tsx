import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardCard } from "@/components/DashboardCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  FileText,
  DollarSign,
  Calendar,
  Loader2,
  UserPlus,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Clock,
  Megaphone,
  Edit2,
  Camera,
  Search
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAlunoMutations } from "@/hooks/useAlunos";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCPF, unmaskCPF, validateCPF } from "@/utils/cpf";
import { formatCEP, fetchCEP } from "@/utils/cep";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { useState } from "react";

import { OnboardingResponsavel } from "@/components/responsavel/OnboardingResponsavel";
import { compressImage } from "@/utils/compressImage";
import { StudentProgressBar } from "@/components/responsavel/StudentProgressBar";
import { ProfileProgressBar } from "@/components/responsavel/ProfileProgressBar";

const DashboardResponsavel = () => {
  const { user } = useAuth();
  const { saveMutation } = useAlunoMutations();

  // State for Edit
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAluno, setEditingAluno] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: "",
    data_nascimento: "",
    cpf: "",
    telefone: "",
    endereco: "",
    bairro: "",
    alergias: "",
    medicamentos: "",
    observacoes: "",
    foto_url: null as string | null,
    tipoSanguineo: "",
    isPne: false,
    pneCid: "",
    temLaudo: false,
    laudoUrl: "",
    contatoEmergenciaNome: "",
    contatoEmergenciaTelefone: "",
    contatoEmergenciaRelacao: "",
    doenca_cronica: "",
  });
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const handleCepChange = async (value: string) => {
    const formatted = formatCEP(value);
    setCep(formatted);
    setCepError(null);
    const clean = formatted.replace(/\D/g, "");
    if (clean.length === 8) {
      setCepLoading(true);
      const result = await fetchCEP(clean);
      setCepLoading(false);
      if (result) {
        setFormData(prev => ({ ...prev, endereco: result.logradouro, bairro: result.bairro }));
      } else {
        setCepError("CEP não encontrado.");
      }
    }
  };

  const handleCpfChange = (value: string) => {
    const formatted = formatCPF(value);
    setFormData({ ...formData, cpf: formatted });
    setCpfError(null);

    const clean = unmaskCPF(formatted);
    if (clean.length === 11 && !validateCPF(clean)) {
      setCpfError("CPF inválido");
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      setUploading(true);
      const file = event.target.files[0];
      
      // Comprimir imagem antes do upload
      const compressedFile = await compressImage(file);
      
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, foto_url: data.publicUrl }));
    } catch (error: any) {
      console.error("Erro no upload:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cpfError) return;
    
    // 1. Atualizar Aluno
    saveMutation.mutate(
      { id: editingAluno?.id, data: formData },
      {
        onSuccess: async () => {
          // 2. Atualizar Anamnese
          const cleanCpf = unmaskCPF(formData.cpf);
          const { error: alunoError } = await supabase
          .from("alunos")
          .update({
            nome_completo: formData.nome,
            data_nascimento: formData.data_nascimento,
            cpf: cleanCpf || null,
            telefone: formData.telefone || null,
            endereco: formData.endereco || null,
            bairro: formData.bairro || null,
            foto_url: formData.foto_url,
          })
          .eq("id", editingAluno.id);

          if (alunoError) {
            console.error("Erro ao salvar aluno:", alunoError);
          }

          const { error: anamneseError } = await supabase
            .from("anamneses")
            .upsert({
              aluno_id: editingAluno.id,
              tipo_sanguineo: formData.tipoSanguineo,
              is_pne: formData.isPne,
              pne_cid: formData.pneCid,
              tem_laudo: formData.temLaudo,
              laudo_url: formData.laudoUrl,
              contato_emergencia_nome: formData.contatoEmergenciaNome,
              contato_emergencia_telefone: formData.contatoEmergenciaTelefone,
              contato_emergencia_relacao: formData.contatoEmergenciaRelacao,
              doenca_cronica: formData.doenca_cronica,
              alergias: formData.alergias,
              medicamentos: formData.medicamentos,
              observacoes: formData.observacoes,
            });

          if (anamneseError) {
            console.error("Erro ao salvar anamnese:", anamneseError);
          }

          setIsDialogOpen(false);
          setEditingAluno(null);
          setCep("");
          setCepError(null);
          setFormData({
            nome: "", data_nascimento: "", cpf: "", telefone: "", endereco: "",
            bairro: "", alergias: "", medicamentos: "", observacoes: "", foto_url: null,
            tipoSanguineo: "", isPne: false, pneCid: "", temLaudo: false,
            laudoUrl: "", contatoEmergenciaNome: "", contatoEmergenciaTelefone: "",
            contatoEmergenciaRelacao: "", doenca_cronica: ""
          });
        },
      }
    );
  };

  // Fetch alunos do responsável
  const { data: alunos, isLoading: loadingAlunos } = useQuery({
    queryKey: ["dashboard-alunos", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("alunos")
        .select(`
          *,
          anamneses (*)
        `)
        .eq("responsavel_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch matrículas dos alunos
  const { data: matriculas, isLoading: loadingMatriculas } = useQuery({
    queryKey: ["dashboard-matriculas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("matriculas")
        .select(`
          id,
          status,
          data_inicio,
          aluno:alunos!inner(id, nome_completo, responsavel_id),
          turma:turmas(
            nome,
            horario,
            dias_semana,
            atividade:atividades(nome)
          )
        `)
        .eq("alunos.responsavel_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch pagamentos pendentes — 3 passos pois Supabase não suporta filtro em 3 níveis de join
  const { data: pagamentos, isLoading: loadingPagamentos } = useQuery({
    queryKey: ["dashboard-pagamentos", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: alunosData } = await supabase
        .from("alunos")
        .select("id")
        .eq("responsavel_id", user.id);

      if (!alunosData?.length) return [];
      const alunoIds = alunosData.map(a => a.id);

      const { data: matriculasData } = await supabase
        .from("matriculas")
        .select("id")
        .in("aluno_id", alunoIds);

      if (!matriculasData?.length) return [];
      const matriculaIds = matriculasData.map(m => m.id);

      const { data, error } = await supabase
        .from("pagamentos")
        .select(`
          id,
          valor,
          data_vencimento,
          status,
          matricula:matriculas(
            aluno:alunos(nome_completo),
            turma:turmas(atividade:atividades(nome))
          )
        `)
        .in("matricula_id", matriculaIds)
        .eq("status", "pendente")
        .order("data_vencimento", { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const totalAlunos = alunos?.length || 0;
  const matriculasPendentes = matriculas?.filter(m => m.status === "pendente").length || 0;
  const matriculasAtivas = matriculas?.filter(m => m.status === "ativa").length || 0;
  const totalPagamentosPendentes = pagamentos?.length || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case "ativa":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20"><CheckCircle2 className="w-3 h-3 mr-1" />Ativa</Badge>;
      case "cancelada":
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isVencidoOuProximo = (dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    return isBefore(vencimento, addDays(hoje, 7));
  };

  if (loadingAlunos || loadingMatriculas || loadingPagamentos) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  // Show Onboarding fullscreen (no sidebar) if no students found
  if (alunos && alunos.length === 0) {
    return <OnboardingResponsavel />;
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Olá, {user?.name?.split(" ")[0]}!</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe os alunos, matrículas e pagamentos
          </p>
        </div>

        <ProfileProgressBar />

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Alunos Cadastrados"
            value={totalAlunos}
            icon={Users}
            description="Total de dependentes"
            variant="alunos"
          />
          <DashboardCard
            title="Matrículas Ativas"
            value={matriculasAtivas}
            icon={CheckCircle2}
            description="Inscrições aprovadas"
            variant="atividades"
          />
          <DashboardCard
            title="Matrículas Pendentes"
            value={matriculasPendentes}
            icon={Clock}
            description="Aguardando aprovação"
            variant="ocupacao"
          />
          <DashboardCard
            title="Pagamentos Pendentes"
            value={totalPagamentosPendentes}
            icon={DollarSign}
            description="A vencer ou vencidos"
            variant="financeiro"
          />
        </div>

        {/* Mural de Avisos e Frequência */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <MuralAvisos />
          </div>
          <div className="space-y-6">
            <FrequenciaCard />
          </div>
        </div>

        {/* Ações Rápidas */}
        {totalAlunos === 0 && (
          <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <UserPlus className="h-12 w-12 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">Comece cadastrando seu primeiro aluno</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Para solicitar matrículas, você precisa primeiro cadastrar um aluno (filho/dependente).
                  </p>
                </div>
                <Button asChild>
                  <Link to="/responsavel/cadastrar-aluno">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Cadastrar Aluno
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Meus Alunos */}
          <Card className="border-t-4 border-t-primary/80 lg:col-span-2 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between bg-primary/5 pb-6">
              <div>
                <CardTitle className="text-xl flex items-center gap-2 text-primary">
                  <Users className="h-5 w-5" />
                  Perfis Vinculados
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Gerencie os perfis atuais ou adicione novas pessoas para realizar matrículas.</p>
              </div>
              <Button 
                variant="default" 
                className="shadow-lg hover:shadow-primary/20 transition-all font-semibold" 
                title="Cadastre os dados pessoais do estudante aqui antes de solicitar uma nova matrícula"
                asChild
              >
                <Link to="/responsavel/cadastrar-aluno">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Cadastrar p/ Matrícula
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {alunos && alunos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alunos.map((aluno) => (
                    <div key={aluno.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/50 hover:border-primary/30 transition-all hover:shadow-md group">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border-2 border-primary/20 group-hover:border-primary transition-colors">
                          {aluno.foto_url ? (
                            <AvatarImage src={aluno.foto_url} className="object-cover" />
                          ) : (
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                              {aluno.nome_completo.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">{aluno.nome_completo}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium bg-muted px-2 py-0.5 rounded-full">
                              Nascimento: {format(new Date(aluno.data_nascimento), "dd/MM/yyyy")}
                            </span>
                          </div>
                          <StudentProgressBar aluno={aluno} />
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => {
                            const anamnese = aluno.anamneses?.[0] || {};
                            setEditingAluno(aluno);
                            setCep("");
                            setCepError(null);
                            setFormData({
                              nome: aluno.nome_completo,
                              data_nascimento: aluno.data_nascimento,
                              cpf: formatCPF(aluno.cpf || ""),
                              telefone: aluno.telefone || "",
                              endereco: aluno.endereco || "",
                              bairro: aluno.bairro || "",
                              alergias: anamnese.alergias || aluno.alergias || "",
                              medicamentos: anamnese.medicamentos || aluno.medicamentos || "",
                              observacoes: anamnese.observacoes || aluno.observacoes || "",
                              foto_url: aluno.foto_url || null,
                              tipoSanguineo: anamnese.tipo_sanguineo || "",
                              isPne: anamnese.is_pne || false,
                              pneCid: anamnese.pne_cid || "",
                              temLaudo: anamnese.tem_laudo || false,
                              laudoUrl: anamnese.laudo_url || "",
                              contatoEmergenciaNome: anamnese.contato_emergencia_nome || "",
                              contatoEmergenciaTelefone: anamnese.contato_emergencia_telefone || "",
                              contatoEmergenciaRelacao: anamnese.contato_emergencia_relacao || "",
                              doenca_cronica: anamnese.doenca_cronica || "",
                            });
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-1.5" /> Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Nenhum aluno cadastrado</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Matrículas Recentes */}
          <Card className="shadow-md border-t-4 border-t-primary/50 flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <ClipboardList className="h-4 w-4 text-primary" />
                </div>
                Matrículas
              </CardTitle>
              {totalAlunos > 0 && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/responsavel/nova-matricula">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Nova Matrícula
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {matriculas && matriculas.length > 0 ? (
                matriculas.slice(0, 5).map((matricula) => (
                  <div key={matricula.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{matricula.aluno?.nome_completo}</p>
                      <p className="text-sm text-muted-foreground">
                        {matricula.turma?.atividade?.nome} - {matricula.turma?.nome}
                      </p>
                    </div>
                    {getStatusBadge(matricula.status)}
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Nenhuma matrícula encontrada</p>
                  {totalAlunos > 0 && (
                    <Button variant="link" asChild className="mt-2">
                      <Link to="/responsavel/nova-matricula">Solicitar primeira matrícula</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Próximos Pagamentos */}
          <Card className="shadow-md border-t-4 border-t-destructive/50 flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-1.5 bg-destructive/10 rounded-lg">
                  <DollarSign className="h-4 w-4 text-destructive" />
                </div>
                Próximos Pagamentos
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/responsavel/pagamentos">Ver Todos</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {pagamentos && pagamentos.length > 0 ? (
                <div className="space-y-3">
                  {pagamentos.map((pag) => {
                    const vencido = isBefore(new Date(pag.data_vencimento), new Date());
                    const proximo = isVencidoOuProximo(pag.data_vencimento);

                    return (
                      <div key={pag.id} className={`flex items-center justify-between p-4 rounded-lg ${vencido ? 'bg-destructive/10 border border-destructive/20' : proximo ? 'bg-warning/10 border border-warning/20' : 'bg-muted/50'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${vencido ? 'bg-destructive/20' : proximo ? 'bg-warning/20' : 'bg-muted'}`}>
                            {vencido ? (
                              <AlertCircle className="h-5 w-5 text-destructive" />
                            ) : (
                              <Calendar className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{pag.matricula?.aluno?.nome_completo}</p>
                            <p className="text-sm text-muted-foreground">
                              {pag.matricula?.turma?.atividade?.nome}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            R$ {parseFloat(pag.valor.toString()).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <p className={`text-sm ${vencido ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {vencido ? 'Vencido em ' : 'Vence em '}
                            {format(new Date(pag.data_vencimento), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {totalPagamentosPendentes > 0 && (
                    <div className="pt-2">
                      <Button className="w-full" asChild>
                        <Link to="/responsavel/registrar-pagamento">
                          <DollarSign className="mr-2 h-4 w-4" />
                          Registrar Pagamento
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum pagamento pendente
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">

            {/* Foto Upload UI */}
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="relative group cursor-pointer w-24 h-24">
                <Avatar className="w-24 h-24 border-2 border-white shadow-md">
                  {formData.foto_url && <AvatarImage src={formData.foto_url} className="object-cover" />}
                  <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                    {(formData.nome?.[0] || "A").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="edit-photo-upload"
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full cursor-pointer backdrop-blur-sm"
                >
                  {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
                </label>
                <Input
                  id="edit-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleCpfChange(e.target.value)}
                  placeholder="000.000.000-00"
                />
                {cpfError && <p className="text-sm text-red-500">{cpfError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep-edit">CEP</Label>
                  <div className="relative">
                    <Input
                      id="cep-edit"
                      value={cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      className="pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {cepLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Search className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </div>
                  </div>
                  {cepError && <p className="text-xs text-destructive">{cepError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    placeholder="Bairro"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco">Rua / Endereço Completo</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, número, complemento"
                />
              </div>


              {/* Informações de Saúde Consolidada */}
              <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-primary/10">
                <div className="flex items-center gap-2 text-sm font-bold text-neomissio-primary">
                  <AlertCircle className="h-4 w-4" /> Informações de Saúde
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 space-y-2">
                    <Label htmlFor="tipoSanguineo">Tipo Sanguíneo</Label>
                    <Select
                      value={formData.tipoSanguineo}
                      onValueChange={(value) => setFormData({ ...formData, tipoSanguineo: value })}
                    >
                      <SelectTrigger id="tipoSanguineo" className="h-10">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-2 border-l border-muted pl-4">
                    <p className="text-[9px] text-muted-foreground uppercase font-medium">Dica de Segurança</p>
                    <p className="text-[10px] leading-tight text-muted-foreground">O tipo sanguíneo ajuda a equipe médica em casos de emergência.</p>
                  </div>
                </div>

                <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-4">
                  <div>
                    <p className="font-semibold text-xs text-foreground mb-2">Possui Necessidade Específica (PNE)?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isPne: true })}
                        className={`flex-1 py-2 px-3 rounded-lg border font-bold text-xs transition-all ${formData.isPne === true
                          ? "border-orange-500 bg-orange-500/10 text-orange-600"
                          : "border-muted bg-muted/20 text-muted-foreground hover:border-orange-500/40"
                          }`}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isPne: false })}
                        className={`flex-1 py-2 px-3 rounded-lg border font-bold text-xs transition-all ${formData.isPne === false
                          ? "border-green-500 bg-green-500/10 text-green-600"
                          : "border-muted bg-muted/20 text-muted-foreground hover:border-green-500/40"
                          }`}
                      >
                        Não
                      </button>
                    </div>
                  </div>

                  {formData.isPne && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="space-y-1.5">
                        <Label htmlFor="pneCid" className="text-xs text-muted-foreground">CID (Se houver)</Label>
                        <Input
                          id="pneCid"
                          value={formData.pneCid}
                          onChange={(e) => setFormData({ ...formData, pneCid: e.target.value })}
                          placeholder="Ex: F84.0"
                          className="h-9 bg-background"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Tem Laudo?</Label>
                        <div className="flex gap-2 ml-auto">
                          {["Sim", "Não"].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFormData({ ...formData, temLaudo: opt === "Sim" })}
                              className={`px-3 py-1 rounded-md border text-[10px] font-medium transition-all ${formData.temLaudo === (opt === "Sim")
                                ? "bg-slate-800 text-white border-slate-800"
                                : "bg-background text-muted-foreground border-input hover:border-slate-300"
                                }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {formData.laudoUrl && (
                        <div className="flex items-center justify-between p-2 bg-green-500/5 border border-green-500/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <a href={formData.laudoUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-green-700 font-medium hover:underline">Ver Laudo Anexado</a>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => setFormData(prev => ({ ...prev, laudoUrl: "" }))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[9px] uppercase text-muted-foreground/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Dados Protegidos por LGPD
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doenca_cronica" className="text-xs">Doenças Crônicas</Label>
                  <Textarea
                    id="doenca_cronica"
                    value={formData.doenca_cronica}
                    onChange={(e) => setFormData({ ...formData, doenca_cronica: e.target.value })}
                    placeholder="Descreva se houver..."
                    className="min-h-[60px] text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="alergias" className="text-xs">Alergias</Label>
                    <Input
                      id="alergias"
                      value={formData.alergias}
                      onChange={(e) => setFormData({ ...formData, alergias: e.target.value })}
                      className="h-10 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medicamentos" className="text-xs">Medicamentos</Label>
                    <Input
                      id="medicamentos"
                      value={formData.medicamentos}
                      onChange={(e) => setFormData({ ...formData, medicamentos: e.target.value })}
                      className="h-10 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Contato de Emergência */}
              <div className="col-span-1 md:col-span-2 space-y-3 pt-4 border-t border-primary/10">
                <div className="flex items-center gap-2 text-sm font-bold text-neomissio-primary">
                  <AlertCircle className="h-4 w-4" /> Contato de Emergência
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl border border-dashed border-neomissio-primary/30 bg-neomissio-primary/5">
                  <div className="space-y-1.5">
                    <Label htmlFor="contatoEmergenciaNome" className="text-xs text-muted-foreground">Nome</Label>
                    <Input
                      id="contatoEmergenciaNome"
                      value={formData.contatoEmergenciaNome}
                      onChange={(e) => setFormData({ ...formData, contatoEmergenciaNome: e.target.value })}
                      className="h-9 bg-background text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contatoEmergenciaTelefone" className="text-xs text-muted-foreground">Telefone</Label>
                    <Input
                      id="contatoEmergenciaTelefone"
                      value={formData.contatoEmergenciaTelefone}
                      onChange={(e) => setFormData({ ...formData, contatoEmergenciaTelefone: e.target.value })}
                      className="h-9 bg-background text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contatoEmergenciaRelacao" className="text-xs text-muted-foreground">Parentesco</Label>
                    <Input
                      id="contatoEmergenciaRelacao"
                      value={formData.contatoEmergenciaRelacao}
                      onChange={(e) => setFormData({ ...formData, contatoEmergenciaRelacao: e.target.value })}
                      className="h-9 bg-background text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label htmlFor="observacoes" className="text-xs">Observações Gerais</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Outras informações importantes"
                  className="min-h-[60px] text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

const MuralAvisos = () => {
  const { user } = useAuth();

  const { data: comunicados = [], isLoading } = useQuery({
    queryKey: ["mural-comunicados", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("comunicados")
        .select(`
          id,
          titulo,
          mensagem,
          tipo,
          created_at,
          turmas (nome)
        `)
        .eq("status", "enviado")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Mural de Avisos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (comunicados.length === 0) {
    return (
      <Card className="border-t-4 border-t-primary/30 shadow-lg lg:col-span-2 h-full">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold uppercase tracking-tight text-muted-foreground/50">
              <div className="p-2 bg-muted rounded-lg">
                <Megaphone className="h-5 w-5" />
              </div>
              Mural de Avisos
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center h-[200px]">
          <Megaphone className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Nenhum aviso no momento</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Tudo tranquilo por aqui. Quando houver novidades, elas aparecerão no seu mural.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-t-4 border-t-primary shadow-lg lg:col-span-2">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold uppercase tracking-tight">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            Mural de Avisos
            {comunicados.length > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse ml-2" title="Novos Recados"></span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {comunicados.map((comunicado: any) => (
            <div
              key={comunicado.id}
              className="p-5 hover:bg-muted/30 transition-colors flex gap-4"
            >
              <div className="hidden sm:flex flex-col items-center gap-2 min-w-[60px]">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Megaphone className="h-4 w-4 text-primary" />
                </div>
                <div className="text-[10px] text-muted-foreground text-center">
                  {format(new Date(comunicado.created_at), "dd MMM", { locale: ptBR })}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-bold text-lg text-foreground leading-tight">
                    {comunicado.titulo}
                  </h4>
                  {comunicado.tipo === "turma" && comunicado.turmas?.nome ? (
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20 w-fit">
                      Turma: {comunicado.turmas.nome}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground w-fit">
                      Geral
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                  {comunicado.mensagem}
                </p>
                <div className="sm:hidden text-xs font-semibold text-muted-foreground mt-2">
                  {format(new Date(comunicado.created_at), "dd MMM HH:mm", { locale: ptBR })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const FrequenciaCard = () => {
  const { user } = useAuth();

  const { data: presencas } = useQuery({
    queryKey: ["dashboard-presencas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get children IDs first
      const { data: alunos } = await supabase.from("alunos").select("id").eq("responsavel_id", user.id);
      if (!alunos?.length) return [];

      const alunoIds = alunos.map(a => a.id);

      // Get matriculas for these children
      const { data: matriculas } = await supabase
        .from("matriculas")
        .select("id, aluno_id")
        .in("aluno_id", alunoIds);

      if (!matriculas?.length) return [];

      const matriculaIds = matriculas.map(m => m.id);

      // Get recent attendance for these matriculas using presencas table
      const { data, error } = await supabase
        .from("presencas")
        .select(`
           data,
           presente,
           observacao,
           matricula_id
         `)
        .in("matricula_id", matriculaIds)
        .order("data", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  return (
    <Card className="shadow-md border-t-4 border-t-green-500 h-full">
      <CardHeader className="bg-green-50/50 dark:bg-green-900/10 border-b pb-4">
        <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-400 font-bold uppercase tracking-tight">
          <div className="p-1.5 bg-green-100 dark:bg-green-800 rounded-lg">
            <ClipboardList className="h-4 w-4" />
          </div>
          Últimas Presenças
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {presencas && presencas.length > 0 ? (
          <div className="divide-y divide-border/50">
            {presencas.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${p.presente ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {p.presente ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {format(new Date(p.data), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                      Registro de sala
                    </p>
                  </div>
                </div>
                <div>
                  {p.presente ? (
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">Presente</span>
                  ) : (
                    <Badge variant="destructive" className="font-bold uppercase tracking-wider text-[10px]">Falta</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum registro verificado.</p>
            <p className="text-xs text-muted-foreground mt-1">A frequência será atualizada após as aulas.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardResponsavel;
