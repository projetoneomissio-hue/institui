import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { formatCPF, unmaskCPF, validateCPF } from "@/utils/cpf";
import { formatCEP, fetchCEP } from "@/utils/cep";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { User, Calendar, IdCard, Phone, MapPin, Loader2, Save, X, Activity, Camera, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

const alunoSchema = z.object({
    // Básico & Contato
    nome_completo: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(200, "Nome muito longo"),
    data_nascimento: z.string().min(1, "Data de nascimento é obrigatória"),
    cpf: z.string().trim().optional().nullable().or(z.literal("")).refine(
        (val) => {
            if (!val || val === "") return true;
            const clean = val.replace(/\D/g, "");
            if (clean.length === 0) return true;
            if (clean.length !== 11) return false;
            return validateCPF(clean);
        },
        { message: "CPF inválido. Verifique os dígitos." }
    ),
    telefone: z.string().trim().max(20, "Telefone muito longo").optional().nullable().or(z.literal("")),
    bairro: z.string().trim().max(255).optional().nullable().or(z.literal("")),
    endereco: z.string().trim().max(500, "Endereço muito longo").optional().nullable().or(z.literal("")),
    responsavel_id: z.string().uuid("ID do responsável inválido").optional().nullable().or(z.literal("")),

    // Acadêmico & Família
    rg: z.string().trim().max(50, "RG muito longo").optional().nullable().or(z.literal("")),
    escola: z.string().trim().max(255, "Nome da escola muito longo").optional().nullable().or(z.literal("")),
    profissao: z.string().trim().max(255, "Profissão muito longa").optional().nullable().or(z.literal("")),
    grau_parentesco: z.string().trim().max(100, "Grau de parentesco muito longo").optional().nullable().or(z.literal("")),

    // Governança e Compliance
    autoriza_imagem: z.boolean().default(false).optional(),
    declaracao_assinada: z.boolean().default(false).optional(),

    // Saúde e Alertas (Anamnese)
    is_pne: z.boolean().default(false).optional(),
    pne_descricao: z.string().trim().optional().nullable().or(z.literal("")),
    pne_cid: z.string().trim().max(20, "CID muito longo").optional().nullable().or(z.literal("")),
    tem_laudo: z.boolean().default(false).optional(),
    alergias: z.string().trim().optional().nullable().or(z.literal("")),
    doenca_cronica: z.string().trim().optional().nullable().or(z.literal("")),
    medicamentos: z.string().trim().optional().nullable().or(z.literal("")),
    tipo_sanguineo: z.string().trim().max(5).optional().nullable().or(z.literal("")),
    foto_url: z.string().optional().nullable(),
});

type AlunoFormData = z.infer<typeof alunoSchema>;

interface AlunoFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    alunoToEdit?: any | null; // Pass null for new pupil
}

export function AlunoFormModal({ open, onOpenChange, alunoToEdit }: AlunoFormModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const isEditing = !!alunoToEdit;

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [cep, setCep] = useState("");
    const [cepLoading, setCepLoading] = useState(false);
    const [cepError, setCepError] = useState<string | null>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const form = useForm<AlunoFormData>({
        resolver: zodResolver(alunoSchema),
        defaultValues: {
            nome_completo: "",
            data_nascimento: "",
            cpf: "",
            telefone: "",
            bairro: "",
            endereco: "",
            responsavel_id: "",
            rg: "",
            escola: "",
            profissao: "",
            grau_parentesco: "",
            autoriza_imagem: false,
            declaracao_assinada: false,
            is_pne: false,
            pne_descricao: "",
            pne_cid: "",
            tem_laudo: false,
            alergias: "",
            doenca_cronica: "",
            medicamentos: "",
            tipo_sanguineo: "",
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
                form.setValue("endereco", result.logradouro);
                form.setValue("bairro", result.bairro);
            } else {
                setCepError("CEP não encontrado.");
            }
        }
    };

    useEffect(() => {
        if (open) {
            setCep("");
            setCepError(null);
            if (isEditing) {
                const anamnese = alunoToEdit.anamneses?.[0] || {};
                setAvatarFile(null);
                setAvatarPreview(alunoToEdit.foto_url || null);
                form.reset({
                    nome_completo: alunoToEdit.nome_completo || "",
                    data_nascimento: alunoToEdit.data_nascimento || "",
                    cpf: alunoToEdit.cpf ? formatCPF(alunoToEdit.cpf) : "",
                    telefone: alunoToEdit.telefone || "",
                    bairro: alunoToEdit.bairro || "",
                    endereco: alunoToEdit.endereco || "",
                    responsavel_id: alunoToEdit.responsavel_id || "",
                    rg: alunoToEdit.rg || "",
                    escola: alunoToEdit.escola || "",
                    profissao: alunoToEdit.profissao || "",
                    grau_parentesco: alunoToEdit.grau_parentesco || "",
                    autoriza_imagem: alunoToEdit.autoriza_imagem || false,
                    declaracao_assinada: alunoToEdit.declaracao_assinada || false,
                    is_pne: anamnese.is_pne || false,
                    pne_descricao: anamnese.pne_descricao || "",
                    alergias: anamnese.alergias || "",
                    doenca_cronica: anamnese.doenca_cronica || "",
                    medicamentos: anamnese.medicamentos || "",
                    tipo_sanguineo: anamnese.tipo_sanguineo || "",
                    foto_url: alunoToEdit.foto_url || null,
                });
            } else {
                setAvatarFile(null);
                setAvatarPreview(null);
                form.reset({
                    nome_completo: "",
                    data_nascimento: "",
                    cpf: "",
                    telefone: "",
                    bairro: "",
                    endereco: "",
                    responsavel_id: "",
                    rg: "",
                    escola: "",
                    profissao: "",
                    grau_parentesco: "",
                    autoriza_imagem: false,
                    declaracao_assinada: false,
                    is_pne: false,
                    pne_descricao: "",
                    alergias: "",
                    doenca_cronica: "",
                    medicamentos: "",
                    tipo_sanguineo: "",
                    foto_url: null,
                });
            }
        }
    }, [open, isEditing, alunoToEdit, form]);

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
        enabled: open && (user?.role === "direcao" || user?.role === "coordenacao"),
    });

    const saveMutation = useMutation({
        mutationFn: async (values: AlunoFormData) => {
            const cleanCpf = values.cpf ? unmaskCPF(values.cpf) : null;

            if (cleanCpf && cleanCpf.length === 11) {
                const { data: existing, error: checkError } = await supabase
                    .from("alunos")
                    .select("id, nome_completo")
                    .eq("cpf", cleanCpf)
                    .maybeSingle();

                if (checkError) throw checkError;
                if (existing && existing.id !== alunoToEdit?.id) {
                    throw new Error(`Já existe um aluno com este CPF: ${existing.nome_completo}`);
                }
            }

            let uploadedAvatarUrl = values.foto_url || null;

            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${crypto.randomUUID()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from("avatars")
                    .upload(fileName, avatarFile, { upsert: true });

                if (uploadError) throw new Error(`Erro ao upar avatar: ${uploadError.message}`);

                const { data: publicUrlData } = supabase.storage
                    .from("avatars")
                    .getPublicUrl(fileName);

                uploadedAvatarUrl = publicUrlData.publicUrl;
            }

            const alunoPayload = {
                nome_completo: values.nome_completo,
                foto_url: uploadedAvatarUrl,
                data_nascimento: values.data_nascimento,
                cpf: cleanCpf || null,
                telefone: values.telefone || null,
                bairro: values.bairro || null,
                endereco: values.endereco || null,
                responsavel_id: values.responsavel_id || null,
                rg: values.rg || null,
                escola: values.escola || null,
                profissao: values.profissao || null,
                grau_parentesco: values.grau_parentesco || null,
                autoriza_imagem: values.autoriza_imagem ?? false,
                declaracao_assinada: values.declaracao_assinada ?? false,
            };

            let savedAlunoId = alunoToEdit?.id;

            if (isEditing) {
                const { error } = await supabase.from("alunos").update(alunoPayload).eq("id", alunoToEdit.id);
                if (error) throw error;
            } else {
                const { data: newAluno, error } = await supabase.from("alunos").insert([alunoPayload]).select("id").single();
                if (error) throw error;
                savedAlunoId = newAluno.id;
            }

            // Upsert Anamnese (Saúde)
            if (savedAlunoId) {
                const anamnesePayload = {
                    aluno_id: savedAlunoId,
                    is_pne: values.is_pne ?? false,
                    pne_descricao: values.pne_descricao || null,
                    pne_cid: values.pne_cid || null,
                    tem_laudo: values.tem_laudo ?? false,
                    alergias: values.alergias || null,
                    doenca_cronica: values.doenca_cronica || null,
                    medicamentos: values.medicamentos || null,
                    tipo_sanguineo: values.tipo_sanguineo || null,
                };

                // Primeiro verificar se o aluno já tem anamnese
                const { data: existingAnamnese } = await supabase.from("anamneses").select("id").eq("aluno_id", savedAlunoId).maybeSingle();

                if (existingAnamnese) {
                    const { error } = await supabase.from("anamneses").update(anamnesePayload).eq("id", existingAnamnese.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from("anamneses").insert([anamnesePayload]);
                    if (error) throw error;
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["alunos"] });
            // Caso seja a tela de finanças etc. Invalida genérico também.
            queryClient.invalidateQueries({ queryKey: ["gestao-cobrancas"] });

            toast({ title: isEditing ? "Aluno atualizado" : "Aluno cadastrado", description: "Os dados foram salvos com sucesso." });
            onOpenChange(false);
        },
        onError: (error: Error) => {
            toast({
                title: "Erro ao salvar",
                description: error.message || "Ocorreu um erro ao salvar os dados.",
                variant: "destructive",
            });
        },
    });

    const onSubmit = (values: AlunoFormData) => {
        saveMutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] p-0 bg-background border border-border shadow-2xl overflow-hidden flex flex-col">
                <div className="relative shrink-0 h-24 bg-primary/5 border-b border-border flex items-center px-6 z-10 py-4">
                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:16px_16px]" />
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                    <div className="relative flex items-center gap-4">
                        <div
                            className="h-16 w-16 rounded-full bg-muted border-2 border-border flex items-center justify-center cursor-pointer overflow-hidden group shrink-0 shadow-lg relative"
                            onClick={handleAvatarClick}
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                            ) : (
                                <User className="h-7 w-7 text-muted-foreground group-hover:opacity-0 transition-opacity" />
                            )}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                                {isEditing ? "Editar Aluno" : "Novo Aluno"}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">
                                {isEditing
                                    ? "Atualize as informações oficiais deste registro."
                                    : "Preencha os dados necessários para o novo cadastro acadêmico."}
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <Form {...form}>
                        <form id="aluno-form-modal" onSubmit={form.handleSubmit(onSubmit)} className="px-4 sm:px-6 py-6 h-full flex flex-col">
                            <Tabs defaultValue="basico" className="w-full flex-1 flex flex-col">
                            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-muted/30 p-1 mb-6 rounded-xl gap-1 h-auto">
                                    <TabsTrigger value="basico" className="rounded-lg py-2.5 text-[10px] sm:text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">Básico</TabsTrigger>
                                    <TabsTrigger value="academico" className="rounded-lg py-2.5 text-[10px] sm:text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">Família</TabsTrigger>
                                    <TabsTrigger value="saude" className="rounded-lg py-2.5 text-[10px] sm:text-xs font-semibold data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">Saúde</TabsTrigger>
                                    <TabsTrigger value="compliance" className="rounded-lg py-2.5 text-[10px] sm:text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">Legal</TabsTrigger>
                                </TabsList>

                                {/* ABA 1: BÁSICO */}
                                <TabsContent value="basico" className="space-y-6 mt-0">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                                            <User className="h-4 w-4 text-primary" />
                                            <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-primary/70">
                                                Identificação Pessoal
                                            </h3>
                                        </div>

                                        <div className="grid gap-4">
                                            <FormField
                                                control={form.control}
                                                name="nome_completo"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                                            <User className="h-3 w-3" /> Nome Completo *
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Digite o nome completo" {...field} className="h-11 bg-muted/20 border-border focus:border-primary/30 transition-all rounded-xl shadow-inner-sm" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="data_nascimento"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                                                <Calendar className="h-3 w-3" /> Nascimento *
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input type="date" {...field} className="h-11 bg-muted/20 border-border focus:border-primary/30 transition-all rounded-xl" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="cpf"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                                                <IdCard className="h-3 w-3" /> CPF / Passaporte
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder="000.000.000-00"
                                                                    {...field}
                                                                    onChange={(e) => field.onChange(formatCPF(e.target.value))}
                                                                    maxLength={14}
                                                                    className="h-11 bg-muted/20 border-border focus:border-primary/30 transition-all rounded-xl"
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                                            <Phone className="h-4 w-4 text-primary" />
                                            <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-primary/70">
                                                Contato e Endereço
                                            </h3>
                                        </div>

                                        <div className="grid gap-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="telefone"
                                                    render={({ field }) => (
                                                        <FormItem className="col-span-2">
                                                            <FormLabel className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                                                <Phone className="h-3 w-3" /> Telefone (Principal)
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="(00) 00000-0000" {...field} className="h-11 bg-muted/20 border-border focus:border-primary/30 transition-all rounded-xl" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            {/* CEP com busca automática */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                                        <MapPin className="h-3 w-3" /> CEP
                                                    </label>
                                                    <div className="relative">
                                                        <Input
                                                            placeholder="00000-000"
                                                            value={cep}
                                                            onChange={(e) => handleCepChange(e.target.value)}
                                                            maxLength={9}
                                                            className="h-11 bg-muted/20 border-border focus:border-primary/30 transition-all rounded-xl pr-10"
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

                                                <FormField
                                                    control={form.control}
                                                    name="bairro"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                                                Bairro
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Bairro" {...field} className="h-11 bg-muted/20 border-border focus:border-primary/30 transition-all rounded-xl" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="endereco"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                                            <MapPin className="h-3 w-3" /> Rua / Endereço Completo
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Rua, Número, Complemento" {...field} className="h-11 bg-muted/20 border-border focus:border-primary/30 transition-all rounded-xl" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* ABA 2: FAMÍLIA E ACADÊMICO */}
                                <TabsContent value="academico" className="space-y-6 mt-0">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                                            <Activity className="h-4 w-4 text-primary" />
                                            <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-primary/70">
                                                Responsabilidade Financeira/Legal
                                            </h3>
                                        </div>
                                        <div className="grid gap-4">
                                            {user?.role !== "professor" && (
                                                <FormField
                                                    control={form.control}
                                                    name="responsavel_id"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                                                Usuário Responsável Vinculado no Sistema
                                                            </FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                                                                <FormControl>
                                                                    <SelectTrigger className="h-11 bg-muted/20 border-border focus:border-primary/30 transition-all rounded-xl">
                                                                        <SelectValue placeholder="Selecione um responsável cadastrado..." />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent className="max-h-60">
                                                                    <SelectItem value="sem_responsavel" className="text-muted-foreground italic">Sem responsável vinculado</SelectItem>
                                                                    {profiles?.map((profile) => (
                                                                        <SelectItem key={profile.id} value={profile.id}>
                                                                            {profile.nome_completo}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="grau_parentesco"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                                                Grau de Parentesco Principal
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: Pai, Mãe, Avó..." {...field} className="h-11 bg-muted/20 border-border focus:border-primary/30 transition-all rounded-xl" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="profissao"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                                                Profissão do Reponsável
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ocupação..." {...field} className="h-11 bg-muted/20 border-border focus:border-primary/30 transition-all rounded-xl" />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                                            <IdCard className="h-4 w-4 text-primary" />
                                            <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-primary/70">
                                                Histórico / Acadêmico Secundário
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="rg"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                                            Doc. RG/Orgão
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="00.000.000-0 - SSP/UF" {...field} className="h-11 bg-muted/20 border-border focus:border-primary/30 transition-all rounded-xl" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="escola"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                                            Escola Regular Atual
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Instituição de ensino..." {...field} className="h-11 bg-muted/20 border-border focus:border-primary/30 transition-all rounded-xl" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* ABA 3: SAÚDE E ALERTAS MÉDICOS */}
                                <TabsContent value="saude" className="space-y-6 mt-0">
                                    <div className="rounded-xl border border-tertiary/20 bg-tertiary/5 p-4 mb-4">
                                        <div className="flex flex-col space-y-2">
                                            <h4 className="font-bold text-tertiary flex items-center gap-2">
                                                <Activity className="h-4 w-4" /> Informações Extraídas de Anamnese
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                Estes dados alimentam os alertas de saúde nos perfis de professores para casos de emergência. Apenas Preencha se aplicável.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-6">
                                        <div className="flex flex-col space-y-4">
                                            {/* Pergunta inclusiva com botões Sim/Não */}
                                            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
                                                <p className="font-semibold text-sm text-foreground mb-1">
                                                    O aluno possui alguma necessidade específica de saúde, aprendizagem ou desenvolvimento?
                                                </p>
                                                <p className="text-xs text-muted-foreground mb-4">
                                                    Inclui condições físicas, neurodesenvolvimentais, emocionais, cognitivas, sensoriais ou outras que requeiram atenção da equipe pedagógica. Seja o mais detalhista possível.
                                                </p>

                                                <FormField
                                                    control={form.control}
                                                    name="is_pne"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <div className="flex flex-col sm:flex-row gap-3">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => field.onChange(true)}
                                                                        className={`flex-1 py-3.5 px-4 rounded-xl border-2 font-bold text-sm transition-all active:scale-[0.98] ${field.value === true
                                                                            ? "border-orange-500 bg-orange-500/10 text-orange-400 shadow-lg shadow-orange-500/10"
                                                                            : "border-border bg-muted/10 text-muted-foreground hover:border-orange-500/40"
                                                                            }`}
                                                                    >
                                                                        ✔ Sim, possui
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => field.onChange(false)}
                                                                        className={`flex-1 py-3.5 px-4 rounded-xl border-2 font-bold text-sm transition-all active:scale-[0.98] ${field.value === false
                                                                            ? "border-green-500 bg-green-500/10 text-green-400 shadow-lg shadow-green-500/10"
                                                                            : "border-border bg-muted/10 text-muted-foreground hover:border-green-500/40"
                                                                            }`}
                                                                    >
                                                                        ✕ Não possui
                                                                    </button>
                                                                </div>
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />

                                                {/* Aviso de confirmação quando Não */}
                                                {form.watch("is_pne") === false && (
                                                    <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-200 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <span className="font-bold">⚠ Atenção:</span> Você confirma que o aluno não possui nenhuma necessidade específica de saúde, aprendizagem ou desenvolvimento que a equipe deva conhecer? Esta informação é importante para garantir o melhor atendimento.
                                                    </div>
                                                )}

                                                {/* Campos expandíveis quando Sim */}
                                                {form.watch("is_pne") === true && (
                                                    <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <FormField
                                                            control={form.control}
                                                            name="pne_descricao"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs font-bold uppercase text-orange-400">
                                                                        Descrição Detalhada da Condição *
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Textarea
                                                                            placeholder="Descreva detalhadamente: diagnóstico, comportamentos, como os instrutores devem agir em sala, adaptações necessárias, pontos de atenção específicos..."
                                                                            className="bg-muted/20 border-orange-500/20 focus:border-orange-500/50 min-h-[100px] rounded-xl"
                                                                            {...field}
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <FormField
                                                                control={form.control}
                                                                name="pne_cid"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel className="text-xs font-bold uppercase text-muted-foreground">
                                                                            CID / Código do Diagnóstico
                                                                        </FormLabel>
                                                                        <FormControl>
                                                                            <Input
                                                                                placeholder="Ex: F84.0, G40..."
                                                                                className="h-11 bg-muted/20 border-border uppercase rounded-xl"
                                                                                {...field}
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <FormField
                                                                control={form.control}
                                                                name="tem_laudo"
                                                                render={({ field }) => (
                                                                    <FormItem className="flex flex-col justify-end">
                                                                        <FormLabel className="text-xs font-bold uppercase text-muted-foreground">
                                                                            Possui Laudo / Relatório Médico?
                                                                        </FormLabel>
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => field.onChange(true)}
                                                                                className={`flex-1 h-12 rounded-xl border-2 text-xs font-bold transition-all active:scale-95 ${field.value
                                                                                    ? "border-primary bg-primary/10 text-primary"
                                                                                    : "border-border bg-muted/10 text-muted-foreground"
                                                                                    }`}
                                                                            >
                                                                                Sim
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => field.onChange(false)}
                                                                                className={`flex-1 h-12 rounded-xl border-2 text-xs font-bold transition-all active:scale-95 ${!field.value
                                                                                    ? "border-border bg-muted/20 text-foreground"
                                                                                    : "border-border bg-muted/10 text-muted-foreground"
                                                                                    }`}
                                                                            >
                                                                                Não
                                                                            </button>
                                                                        </div>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </div>
                                                        {form.watch("tem_laudo") && (
                                                            <p className="text-xs text-primary/80 bg-primary/5 border border-primary/10 rounded-lg p-3 animate-in fade-in">
                                                                📋 <strong>Laudo confirmado.</strong> Solicite ao responsável que entregue uma cópia física ou digital à coordenação para atualizar o prontuário completo do aluno.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>


                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="tipo_sanguineo"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">Tipo Sanguíneo</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-11 bg-muted/20 border-border"><SelectValue placeholder="Ond/Selecione" /></SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="A+">A+</SelectItem><SelectItem value="A-">A-</SelectItem>
                                                                <SelectItem value="B+">B+</SelectItem><SelectItem value="B-">B-</SelectItem>
                                                                <SelectItem value="AB+">AB+</SelectItem><SelectItem value="AB-">AB-</SelectItem>
                                                                <SelectItem value="O+">O+</SelectItem><SelectItem value="O-">O-</SelectItem>
                                                                <SelectItem value="N/I">Não Informado</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="doenca_cronica"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">Doenças Crônicas (Ex: Asma)</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Detalhes (se houver)..." {...field} className="h-11 bg-muted/20 border-border" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="grid gap-4">
                                            <FormField
                                                control={form.control}
                                                name="alergias"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">Alergias (Alimentares, Medicamentos, etc)</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Lactose, Amendoim, Dipirona, etc..." {...field} className="h-11 bg-muted/20 border-border" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="medicamentos"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-semibold uppercase text-muted-foreground">Medicamentos em Uso Contínuo</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Remédios controlados ou diários..." {...field} className="h-11 bg-muted/20 border-border" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* ABA 4: COMPLIANCE E DOCUMENTAÇÃO */}
                                <TabsContent value="compliance" className="space-y-6 mt-0">
                                    <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 mb-4">
                                        <div className="flex flex-col space-y-2">
                                            <h4 className="font-bold text-secondary flex items-center gap-2">
                                                Termos Jurídicos e Contratos
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                Confirmação de checagem física ou eletrônica sobre as obrigações legais vinculadas ao Aluno.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4">
                                        <FormField
                                            control={form.control}
                                            name="autoriza_imagem"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-5 bg-muted/10">
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-base font-semibold">Autorização de Uso de Imagem</FormLabel>
                                                        <div className="text-xs text-muted-foreground max-w-[400px]">Concorda com o registro audiovisual do aluno em aulas/espetáculos para fins de marketing e arquivo da escola segundo contrato.</div>
                                                    </div>
                                                    <FormControl>
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="declaracao_assinada"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-5 bg-muted/10">
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-base font-semibold">Contrato / Regulamento Assinado</FormLabel>
                                                        <div className="text-xs text-muted-foreground max-w-[400px]">O responsável entregou via física ou concordou via digitalmente com os termos do regulamento da instituição.</div>
                                                    </div>
                                                    <FormControl>
                                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </form>
                    </Form>
                </div>

                <div className="shrink-0 p-4 sm:p-5 border-t border-border bg-muted/10 flex justify-end gap-3 z-10">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={saveMutation.isPending}
                        className="h-11 px-6 rounded-xl font-bold text-muted-foreground hover:text-foreground hover:bg-white/5"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="aluno-form-modal"
                        disabled={saveMutation.isPending}
                        className="h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        {isEditing ? "Salvar Alterações" : "Cadastrar Aluno"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
