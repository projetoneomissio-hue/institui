
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUnidade } from "@/contexts/UnidadeContext";
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
import { WizardSteps } from "@/components/ui/wizard-steps";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Camera, User, AlertCircle, ArrowRight, ArrowLeft, Save, CheckCircle, Paperclip, FileText, Trash2, Search } from "lucide-react";
import { formatCPF, unmaskCPF, validateCPF } from "@/utils/cpf";
import { formatCEP, fetchCEP } from "@/utils/cep";
import { compressImage } from "@/utils/compressImage";
import { alunosService } from "@/services/alunos.service";

const CadastrarAluno = () => {
  const { user } = useAuth();
  const { currentUnidade } = useUnidade();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [formData, setFormData] = useState({
    nomeCompleto: "",
    dataNascimento: "",
    cpf: "",
    rg: "",
    telefone: "",
    endereco: "",
    bairro: "",
    escola: "",
    serieAno: "",
    profissao: "",
    grauParentesco: "",
    // Health
    isPne: false,
    pneDescricao: "",
    pneCid: "",
    temLaudo: false,
    doencaCronica: "",
    alergias: "",
    medicamentos: "",
    laudoUrl: "",
    tipoSanguineo: "",
    contatoEmergenciaNome: "",
    contatoEmergenciaTelefone: "",
    contatoEmergenciaRelacao: "",
    // Authorizations
    autorizaImagem: false,
    declaracaoAssinada: false,
    observacoes: "",
  });

  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingLaudo, setUploadingLaudo] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // Photo Upload Handler
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      setUploading(true);
      const originalFile = event.target.files[0];
      const file = await compressImage(originalFile);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      setFotoUrl(data.publicUrl);
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLaudoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      
      setUploadingLaudo(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('medical-reports')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('medical-reports')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, laudoUrl: data.publicUrl }));
      
      toast({
        title: "Sucesso",
        description: "Laudo anexado com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingLaudo(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleanCpf = unmaskCPF(formData.cpf);

      // Validate CPF format if provided
      if (cleanCpf && cleanCpf.length > 0) {
        if (cleanCpf.length !== 11 || !validateCPF(cleanCpf)) {
          throw new Error("CPF inválido. Verifique os dígitos informados.");
        }
        // Check for duplicate CPF/Name globally
        const dups = await alunosService.checkGlobalDuplicate({ 
          cpf: cleanCpf,
          nome: formData.nomeCompleto,
          dataNascimento: formData.dataNascimento
        });
        
        if (dups.aluno) {
          const isFuzzy = !cleanCpf || cleanCpf !== dups.aluno.cpf;
          throw new Error(
            `Já existe um ALUNO cadastrado com estas informações: ${dups.aluno.nome_completo}${isFuzzy ? ' (Nome + Data Nasc)' : ''}. ` +
            `Se deseja matriculá-lo em outra atividade, vá em "Nova Matrícula".`
          );
        }

        if (dups.profile) {
          throw new Error(
            `Estas informações pertencem a um RESPONSÁVEL já cadastrado: ${dups.profile.nome_completo}. ` +
            `Verifique se o CPF ou Nome+Data Nasc estão corretos.`
          );
        }
      }

      const { error } = await supabase.from("alunos").insert({
        responsavel_id: user?.id,
        nome_completo: formData.nomeCompleto,
        data_nascimento: formData.dataNascimento,
        cpf: cleanCpf || null,
        telefone: formData.telefone || null,
        endereco: formData.endereco || null,
        foto_url: fotoUrl,
        rg: formData.rg || null,
        bairro: formData.bairro || null,
        escola: formData.escola || null,
        serie_ano: formData.serieAno || null,
        profissao: formData.profissao || null,
        grau_parentesco: formData.grauParentesco || null,
        autoriza_imagem: formData.autorizaImagem,
        declaracao_assinada: formData.declaracaoAssinada,
        ...(currentUnidade?.id ? { unidade_id: currentUnidade.id } : {}),
      });

      if (error) throw error;

      // Save health info in Anamneses table
      const { data: newAluno } = await supabase
        .from("alunos")
        .select("id")
        .eq("cpf", cleanCpf)
        .eq("nome_completo", formData.nomeCompleto)
        .maybeSingle();

      if (newAluno) {
        await supabase.from("anamneses").upsert({
          aluno_id: newAluno.id,
          alergias: formData.alergias || null,
          medicamentos: formData.medicamentos || null,
          is_pne: formData.isPne,
          pne_descricao: formData.pneDescricao || null,
          pne_cid: formData.pneCid || null,
          tem_laudo: formData.temLaudo,
          laudo_url: formData.laudoUrl || null,
          tipo_sanguineo: formData.tipoSanguineo || null,
          contato_emergencia_nome: formData.contatoEmergenciaNome || null,
          contato_emergencia_telefone: formData.contatoEmergenciaTelefone || null,
          contato_emergencia_relacao: formData.contatoEmergenciaRelacao || null,
          doenca_cronica: formData.doencaCronica || null,
          observacoes: formData.observacoes || null,
        });
      }
    },
    onSuccess: async () => {
      // Trigger welcome email (fire and forget / robust handling)
      try {
        if (user?.email && formData.nomeCompleto) {
          const { error: emailError } = await supabase.functions.invoke("send-email", {
            body: {
              to: user.email,
              type: "welcome",
              data: {
                nomeResponsavel: (user as any).user_metadata?.nome_completo || "Responsável",
                nomeAluno: formData.nomeCompleto,
              },
            },
          });
          if (emailError) console.error("Falha ao enviar email de boas-vindas:", emailError);
        }
      } catch (err) {
        console.error("Erro ao invocar função de email:", err);
      }

      toast({
        title: "Aluno cadastrado!",
        description: "Agora você pode solicitar matrículas para este aluno.",
      });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-alunos"] });
      setShowSuccessDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cadastrar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
        setFormData(prev => ({
          ...prev,
          endereco: result.logradouro,
          bairro: result.bairro,
        }));
      } else {
        setCepError("CEP não encontrado.");
      }
    }
  };

  const handleCpfChange = (value: string) => {
    // Apenas números para a máscara funcionar bem
    const onlyNumbers = value.replace(/\D/g, "");
    const formatted = formatCPF(onlyNumbers);

    setFormData({ ...formData, cpf: formatted });

    // Limpa erro ao digitar
    if (cpfError) setCpfError(null);

    // Valida apenas se tiver 11 dígitos
    const clean = unmaskCPF(formatted);
    if (clean.length === 11) {
      if (!validateCPF(clean)) {
        setCpfError("CPF inválido.");
      }
    }
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.nomeCompleto.trim()) {
        toast({ title: "Campo obrigatório", description: "Preencha o Nome Completo.", variant: "destructive" });
        return false;
      }
      if (!formData.dataNascimento) {
        toast({ title: "Campo obrigatório", description: "Preencha a Data de Nascimento.", variant: "destructive" });
        return false;
      }
      if (cpfError) {
        toast({ title: "Erro no CPF", description: "Corrija o CPF antes de continuar.", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep(currentStep)) {
      saveMutation.mutate();
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Cadastrar Novo Aluno</h1>
          <p className="text-muted-foreground mt-1">Preencha as informações do aluno para matrícula.</p>
        </div>

        <WizardSteps
          currentStep={currentStep}
          steps={[
            { id: 1, title: "Dados Pessoais", description: "Informações Básicas" },
            { id: 2, title: "Saúde & Contato", description: "Médico e Endereço" },
            { id: 3, title: "Foto & Fim", description: "Identificação" }
          ]}
        />

        <Card className="overflow-hidden border-t-4 border-t-neomissio-primary">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit}>

              {/* STEP 1: DADOS PESSOAIS */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-4">
                    {/* Atalho: sou eu mesmo o aluno */}
                    {user?.name && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, nomeCompleto: user.name!, grauParentesco: "Próprio" })}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                      >
                        <div className="h-9 w-9 bg-primary/20 rounded-full flex items-center justify-center shrink-0 text-primary font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-primary uppercase tracking-wide">Sou eu mesmo o aluno</p>
                          <p className="text-sm text-foreground truncate">{user.name}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                      </button>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="nomeCompleto">Nome Completo <span className="text-destructive">*</span></Label>
                      <Input
                        id="nomeCompleto"
                        value={formData.nomeCompleto}
                        onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
                        placeholder="Ex: João Silva"
                        className="h-11"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dataNascimento">Data de Nascimento <span className="text-destructive">*</span></Label>
                        <Input
                          id="dataNascimento"
                          type="date"
                          value={formData.dataNascimento}
                          onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF do Aluno</Label>
                        <Input
                          id="cpf"
                          value={formData.cpf}
                          onChange={(e) => handleCpfChange(e.target.value)}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          className={`h-11 ${cpfError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        />
                        {cpfError && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {cpfError}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rg">RG do Aluno</Label>
                      <Input
                        id="rg"
                        value={formData.rg}
                        onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                        placeholder="Digite o RG"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: SAÚDE E CONTATO */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="h-11"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cep">CEP</Label>
                        <div className="relative">
                          <Input
                            id="cep"
                            value={cep}
                            onChange={(e) => handleCepChange(e.target.value)}
                            placeholder="00000-000"
                            maxLength={9}
                            className="h-11 pr-10"
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
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endereco">Rua / Endereço Completo</Label>
                      <Textarea
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                        placeholder="Rua, Número, Complemento..."
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="escola">Colégio que estuda</Label>
                        <Input
                          id="escola"
                          value={formData.escola}
                          onChange={(e) => setFormData({ ...formData, escola: e.target.value })}
                          placeholder="Nome da escola"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="serieAno">Série e Ano</Label>
                        <Input
                          id="serieAno"
                          value={formData.serieAno}
                          onChange={(e) => setFormData({ ...formData, serieAno: e.target.value })}
                          placeholder="Ex: 4º ano"
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="profissao">Profissão (se for estudante, coloque 'Estudante')</Label>
                        <Input
                          id="profissao"
                          value={formData.profissao}
                          onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                          placeholder="Profissão"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="grauParentesco">Grau de Parentesco do Responsável</Label>
                        <Input
                          id="grauParentesco"
                          value={formData.grauParentesco}
                          onChange={(e) => setFormData({ ...formData, grauParentesco: e.target.value })}
                          placeholder="Ex: Avó, Pai, Mãe..."
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase">
                        <AlertCircle className="h-4 w-4" /> Informações de Saúde
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1 space-y-2">
                          <Label htmlFor="tipoSanguineo">Tipo Sanguíneo</Label>
                          <Select
                            value={formData.tipoSanguineo}
                            onValueChange={(value) => setFormData({ ...formData, tipoSanguineo: value })}
                          >
                            <SelectTrigger id="tipoSanguineo" className="h-11">
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
                          <p className="text-[10px] text-muted-foreground uppercase mt-1">Dica de Segurança</p>
                          <p className="text-[11px] leading-snug">O tipo sanguíneo ajuda a equipe médica em casos de emergência. Se não souber, pode deixar em branco.</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                        <p className="font-semibold text-sm text-foreground mb-1">
                          O aluno possui alguma necessidade específica de saúde, aprendizagem ou desenvolvimento?
                        </p>
                        <p className="text-[10px] leading-tight text-muted-foreground mb-4">
                          Inclui condições físicas, neurodesenvolvimentais, emocionais, cognitivas, sensoriais ou outras que requeiram atenção da equipe pedagógica.
                        </p>

                        <div className="flex gap-3 mb-4">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isPne: true })}
                            className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${formData.isPne === true
                              ? "border-orange-500 bg-orange-500/10 text-orange-600"
                              : "border-muted bg-muted/20 text-muted-foreground hover:border-orange-500/40"
                              }`}
                          >
                            ✔ Sim, possui
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isPne: false })}
                            className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${formData.isPne === false
                              ? "border-green-500 bg-green-500/10 text-green-600"
                              : "border-muted bg-muted/20 text-muted-foreground hover:border-green-500/40"
                              }`}
                          >
                            ✕ Não possui
                          </button>
                        </div>

                        {formData.isPne === false && (
                          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-[11px] text-yellow-700 animate-in fade-in slide-in-from-top-1 duration-200">
                            <span className="font-bold">⚠ Atenção:</span> Você confirma que o aluno não possui nenhuma necessidade específica que a equipe deva conhecer? Esta informação é importante para garantir o melhor atendimento.
                          </div>
                        )}

                        {formData.isPne === true && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-2">
                              <Label htmlFor="pneDescricao" className="text-xs font-bold uppercase text-orange-600">Descrição Detalhada da Condição *</Label>
                              <Textarea
                                id="pneDescricao"
                                value={formData.pneDescricao}
                                onChange={(e) => setFormData({ ...formData, pneDescricao: e.target.value })}
                                placeholder="Descreva diagnóstico, comportamentos, adaptações necessárias..."
                                rows={3}
                                className="bg-white border-orange-500/20 focus:border-orange-500/50"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="pneCid" className="text-xs font-bold uppercase text-muted-foreground">CID (Se houver)</Label>
                                <Input
                                  id="pneCid"
                                  value={formData.pneCid}
                                  onChange={(e) => setFormData({ ...formData, pneCid: e.target.value.toUpperCase() })}
                                  placeholder="Ex: F84.0"
                                  className="h-10 bg-white"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Possui Laudo?</Label>
                                <div className="flex gap-2 h-10">
                                  <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, temLaudo: true })}
                                    className={`flex-1 rounded-lg border-2 text-xs font-bold transition-all ${formData.temLaudo
                                      ? "border-neomissio-primary bg-neomissio-primary/10 text-neomissio-primary"
                                      : "border-muted bg-muted/20 text-muted-foreground"
                                      }`}
                                  >
                                    Sim
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, temLaudo: false })}
                                    className={`flex-1 rounded-lg border-2 text-xs font-bold transition-all ${!formData.temLaudo
                                      ? "border-muted bg-muted/50 text-foreground"
                                      : "border-muted bg-muted/20 text-muted-foreground"
                                      }`}
                                  >
                                    Não
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            {formData.temLaudo && (
                              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Anexar Laudo Digitalizado</Label>
                                
                                {!formData.laudoUrl ? (
                                  <div className="relative">
                                    <input
                                      type="file"
                                      id="laudo-upload"
                                      className="hidden"
                                      accept=".pdf,image/*"
                                      onChange={handleLaudoUpload}
                                      disabled={uploadingLaudo}
                                    />
                                    <label
                                      htmlFor="laudo-upload"
                                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/20 rounded-xl bg-white hover:bg-muted/10 transition-colors cursor-pointer"
                                    >
                                      {uploadingLaudo ? (
                                        <Loader2 className="h-8 w-8 animate-spin text-neomissio-primary" />
                                      ) : (
                                        <>
                                          <Paperclip className="h-8 w-8 text-muted-foreground mb-2" />
                                          <span className="text-sm font-medium text-foreground">Clique para anexar (PDF ou Imagem)</span>
                                          <span className="text-xs text-muted-foreground mt-1">Tamanho máximo: 5MB</span>
                                        </>
                                      )}
                                    </label>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                        <FileText className="h-5 w-5 text-green-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-green-700">Arquivo Anexado</p>
                                        <p className="text-[10px] text-green-600/70">Documento pronto para envio</p>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:bg-destructive/10"
                                      onClick={() => setFormData(prev => ({ ...prev, laudoUrl: "" }))}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                                
                                <p className="text-[10px] text-neomissio-primary/80 bg-neomissio-primary/5 border border-neomissio-primary/10 rounded-lg p-2">
                                  📋 <strong>Laudo confirmado.</strong> O arquivo será enviado junto com o formulário.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-orange-500/10 flex items-center gap-2 text-[9px] uppercase tracking-wider font-bold text-muted-foreground/60">
                          <div className="flex items-center gap-1 bg-muted/30 px-2 py-1 rounded-full border border-muted-foreground/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Dados Protegidos por LGPD
                          </div>
                          <span>•</span>
                          <span>Sigilo Absoluto</span>
                        </div>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-neomissio-primary">
                          <AlertCircle className="h-4 w-4" /> Contato de Emergência
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-dashed border-neomissio-primary/30 bg-neomissio-primary/5">
                          <div className="space-y-2">
                            <Label htmlFor="contatoEmergenciaNome">Nome Completo</Label>
                            <Input
                              id="contatoEmergenciaNome"
                              value={formData.contatoEmergenciaNome}
                              onChange={(e) => setFormData({ ...formData, contatoEmergenciaNome: e.target.value })}
                              placeholder="Quem chamar..."
                              className="h-11 bg-background"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contatoEmergenciaTelefone">Telefone</Label>
                            <Input
                              id="contatoEmergenciaTelefone"
                              value={formData.contatoEmergenciaTelefone}
                              onChange={(e) => setFormData({ ...formData, contatoEmergenciaTelefone: e.target.value })}
                              placeholder="(00) 00000-0000"
                              className="h-11 bg-background"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contatoEmergenciaRelacao">Grau de Parentesco</Label>
                            <Input
                              id="contatoEmergenciaRelacao"
                              value={formData.contatoEmergenciaRelacao}
                              onChange={(e) => setFormData({ ...formData, contatoEmergenciaRelacao: e.target.value })}
                              placeholder="Ex: Mãe, Pai..."
                              className="h-11 bg-background"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="doencaCronica">Possui alguma doença crônica? Se sim, descreva:</Label>
                        <Textarea
                          id="doencaCronica"
                          value={formData.doencaCronica}
                          onChange={(e) => setFormData({ ...formData, doencaCronica: e.target.value })}
                          placeholder="Descreva ou deixe em branco..."
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor="alergias">Alergias (Opcional)</Label>
                          <Input
                            id="alergias"
                            value={formData.alergias}
                            onChange={(e) => setFormData({ ...formData, alergias: e.target.value })}
                            placeholder="Ex: Amendoim, Dipirona..."
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="medicamentos">Medicamentos (Opcional)</Label>
                          <Input
                            id="medicamentos"
                            value={formData.medicamentos}
                            onChange={(e) => setFormData({ ...formData, medicamentos: e.target.value })}
                            placeholder="Uso contínuo..."
                            className="h-11"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: FOTO E REVISÃO */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 text-center">
                  <div className="flex flex-col items-center gap-6 py-4">
                    <div className="relative group cursor-pointer w-40 h-40">
                      <Avatar className="w-40 h-40 border-4 border-white shadow-xl">
                        {fotoUrl && <AvatarImage src={fotoUrl} className="object-cover" />}
                        <AvatarFallback className="bg-muted text-muted-foreground text-4xl">
                          {(formData.nomeCompleto?.[0] || "A").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <label
                        htmlFor="photo-upload"
                        className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full cursor-pointer backdrop-blur-sm"
                      >
                        {uploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Camera className="h-8 w-8 mb-2" />}
                        <span className="text-xs font-medium">Trocar Foto</span>
                      </label>
                      <Input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={uploading}
                      />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-foreground">{formData.nomeCompleto}</h3>
                      <p className="text-muted-foreground">{formData.dataNascimento ? `Nascido em ${new Date(formData.dataNascimento).toLocaleDateString('pt-BR')}` : ''}</p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg text-sm text-left w-full max-w-sm space-y-2">
                      <p><strong>CPF/RG:</strong> {formData.cpf || "Não inf."} / {formData.rg || "Não inf."}</p>
                      <p><strong>Sangue / PNE:</strong> {formData.tipoSanguineo || "Sangue não inf."} | {formData.isPne ? (
                        <span className="text-orange-600 font-bold ml-1">Com PNE</span>
                      ) : "Sem PNE"}</p>
                      
                      {formData.tipoSanguineo && (
                        <p className="text-xs text-muted-foreground ml-4">• Tipo: {formData.tipoSanguineo}</p>
                      )}

                      {formData.isPne && (
                        <div className="ml-4 space-y-0.5">
                          {formData.pneCid && <span className="text-xs block text-muted-foreground">• CID: {formData.pneCid}</span>}
                          <span className="text-xs block text-muted-foreground">• Laudo: {formData.temLaudo ? "Sim" : "Não informado"}</span>
                        </div>
                      )}

                      <div className="pt-2 mt-2 border-t border-muted-foreground/10">
                        <p><strong>Emergência:</strong> {formData.contatoEmergenciaNome || "Não informado"}</p>
                        {formData.contatoEmergenciaTelefone && (
                          <p className="text-xs text-muted-foreground ml-4">• {formData.contatoEmergenciaTelefone} ({formData.contatoEmergenciaRelacao || "Contato"})</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t w-full text-left">
                      <p className="text-xs text-muted-foreground mb-4">
                        Ao finalizar, você concorda com a política de matrícula e autorizações abaixo:
                      </p>

                      <div className="flex items-center space-x-2 bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <Checkbox
                          id="autorizaImagem"
                          checked={formData.autorizaImagem}
                          onCheckedChange={(checked) => setFormData({ ...formData, autorizaImagem: checked === true })}
                        />
                        <Label htmlFor="autorizaImagem" className="text-sm cursor-pointer leading-tight">Autorizo o uso de imagem para divulgação das nossas atividades.</Label>
                      </div>

                      <div className="flex items-center space-x-2 bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <Checkbox
                          id="declaracaoAssinada"
                          checked={formData.declaracaoAssinada}
                          onCheckedChange={(checked) => setFormData({ ...formData, declaracaoAssinada: checked === true })}
                        />
                        <Label htmlFor="declaracaoAssinada" className="text-sm cursor-pointer leading-tight">Declaro que as informações são verdadeiras e aceito os termos.</Label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NAVIGATION BUTTONS */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                {currentStep > 1 ? (
                  <Button type="button" variant="outline" onClick={prevStep} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => navigate("/dashboard")}>
                    Cancelar
                  </Button>
                )}

                {currentStep < 3 ? (
                  <Button type="button" onClick={nextStep} className="gap-2 bg-primary hover:bg-primary/90">
                    Próximo <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={saveMutation.isPending || uploading} className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 w-full sm:w-auto">
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Finalizar Cadastro
                  </Button>
                )}
              </div>

            </form>
          </CardContent>
        </Card>

        {/* SUCCESS DIALOG */}
        <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-6 w-6" /> Cadastro Realizado com Sucesso!
              </AlertDialogTitle>
              <AlertDialogDescription>
                O aluno <strong>{formData.nomeCompleto}</strong> foi cadastrado. O que deseja fazer agora?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel onClick={() => navigate("/dashboard")}>Voltar ao Início</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setShowSuccessDialog(false);
                setCurrentStep(1);
                setFormData({
                  nomeCompleto: "",
                  dataNascimento: "",
                  cpf: "",
                  rg: "",
                  telefone: "",
                  endereco: "",
                  bairro: "",
                  escola: "",
                  serieAno: "",
                  profissao: "",
                  grauParentesco: "",
                  isPne: false,
                  pneDescricao: "",
                  pneCid: "",
                  temLaudo: false,
                  laudoUrl: "",
                  doencaCronica: "",
                  alergias: "",
                  medicamentos: "",
                  tipoSanguineo: "",
                  contatoEmergenciaNome: "",
                  contatoEmergenciaTelefone: "",
                  contatoEmergenciaRelacao: "",
                  autorizaImagem: false,
                  declaracaoAssinada: false,
                  observacoes: "",
                });
                setFotoUrl(null);
                setUploadingLaudo(false); // Reset laudo uploading state
              }}>Cadastrar Outro Aluno</AlertDialogAction>
              <AlertDialogAction className="bg-neomissio-primary" onClick={() => navigate("/responsavel/nova-matricula")}>
                Matricular em Atividade <ArrowRight className="ml-2 h-4 w-4" />
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default CadastrarAluno;
