import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Helmet } from "react-helmet-async";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, School, User, UserCheck, Camera, Baby, ChevronLeft } from "lucide-react";
import { solicitacoesService } from "@/services/solicitacoes.service";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ParticipantType = "filho" | "eu_mesmo" | null;

const matriculaSchema = z.object({
    nome_completo: z.string().min(3, "Nome é obrigatório"),
    sobrenome: z.string().min(2, "Sobrenome é obrigatório"),
    whatsapp: z.string().min(14, "WhatsApp incompleto"),
    data_nascimento: z.string().refine((val) => !isNaN(Date.parse(val)), "Data inválida"),
    email_proprio: z.string().email("E-mail inválido").optional().or(z.literal("")),
    cpf_responsavel: z.string().optional(),
    nome_responsavel: z.string().optional(),
    email_responsavel: z.string().email("E-mail inválido").optional().or(z.literal("")),
    escola: z.string().optional(),
    serie_ano: z.string().optional(),
    necessidades_especiais: z.string().optional(),
    como_conheceu: z.string().optional(),
    autoriza_imagem: z.boolean().default(false),
});

type MatriculaFormValues = z.infer<typeof matriculaSchema>;

export default function MatriculaOnline() {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const atividadeUrl = searchParams.get("atividade");
    const [unidade, setUnidade] = useState<{ id: string; nome: string; logo_url: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [participantType, setParticipantType] = useState<ParticipantType>(null);
    const [step, setStep] = useState(1);
    const [solicitacaoId, setSolicitacaoId] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const { toast } = useToast();

    const form = useForm<MatriculaFormValues>({
        resolver: zodResolver(matriculaSchema),
        shouldUnregister: false,
        defaultValues: {
            nome_completo: "",
            sobrenome: "",
            whatsapp: "",
            data_nascimento: "",
            email_proprio: "",
            cpf_responsavel: "",
            nome_responsavel: "",
            email_responsavel: "",
            escola: "",
            serie_ano: "",
            necessidades_especiais: "",
            como_conheceu: "",
            autoriza_imagem: false,
        },
    });

    useEffect(() => {
        async function fetchUnidade() {
            if (!slug) return;
            const { data, error } = await supabase
                .from("unidades")
                .select("id, nome, logo_url")
                .eq("slug", slug)
                .maybeSingle();
            if (error) {
                console.error("Erro ao buscar unidade:", error);
                toast({ title: "Erro ao carregar unidade", variant: "destructive" });
            }
            setUnidade(data);
            setLoading(false);
        }
        fetchUnidade();
    }, [slug, toast]);

    const onStep1Submit = async () => {
        if (!unidade) return;

        const fields: (keyof MatriculaFormValues)[] = ["nome_completo", "sobrenome", "whatsapp", "data_nascimento"];
        if (participantType === "eu_mesmo") fields.push("email_proprio");
        const isValid = await form.trigger(fields);
        if (!isValid) return;

        try {
            const values = form.getValues();
            const payload = {
                id: solicitacaoId || undefined,
                nome_completo: values.nome_completo,
                sobrenome: values.sobrenome,
                whatsapp: values.whatsapp,
                data_nascimento: values.data_nascimento,
                unidade_id: unidade.id,
                status: "interessado",
                atividade_desejada: atividadeUrl || "Geral",
                // Para eu_mesmo, o e-mail próprio já é do responsável
                ...(participantType === "eu_mesmo" && values.email_proprio
                    ? { email_responsavel: values.email_proprio, nome_responsavel: `${values.nome_completo} ${values.sobrenome}`.trim() }
                    : {}),
            };
            const data = await solicitacoesService.upsert(payload as any);
            if (data?.id) setSolicitacaoId(data.id);
            setStep(2);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            console.error("Erro no Passo 1:", error);
            toast({ title: "Erro ao salvar contato", description: "Verifique os dados e tente novamente.", variant: "destructive" });
        }
    };

    const onFinalSubmit = async (data: MatriculaFormValues) => {
        if (!unidade || !solicitacaoId) return;

        try {
            // Para eu_mesmo: o responsável é o próprio aluno
            const nomeResp = participantType === "eu_mesmo"
                ? `${data.nome_completo} ${data.sobrenome}`.trim()
                : data.nome_responsavel;
            const emailResp = participantType === "eu_mesmo"
                ? data.email_proprio
                : data.email_responsavel;

            const payload = {
                id: solicitacaoId,
                nome_completo: data.nome_completo,
                sobrenome: data.sobrenome,
                whatsapp: data.whatsapp,
                data_nascimento: data.data_nascimento,
                unidade_id: unidade.id,
                status: "pendente",
                atividade_desejada: atividadeUrl || "Geral",
                nome_responsavel: nomeResp,
                email_responsavel: emailResp,
                cpf_responsavel: data.cpf_responsavel,
                escola: data.escola,
                serie_ano: data.serie_ano,
                necessidades_especiais: data.necessidades_especiais,
                como_conheceu: data.como_conheceu,
                autoriza_imagem: data.autoriza_imagem,
            };

            await solicitacoesService.upsert(payload as any);
            setSubmitted(true);
        } catch (error) {
            console.error("Erro no Passo 2:", error);
            toast({ title: "Erro ao finalizar matrícula", variant: "destructive" });
        }
    };

    const handleSelectType = (type: ParticipantType) => {
        setParticipantType(type);
        form.reset();
        setStep(1);
        setSolicitacaoId(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!unidade) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <School className="h-16 w-16 text-gray-300 mb-4" />
                <h1 className="text-xl font-bold text-gray-900">Unidade não encontrada</h1>
                <p className="text-gray-500">Verifique o link ou entre em contato com a instituição.</p>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-primary/5 p-4">
                <Card className="w-full max-w-md text-center p-6">
                    <div className="flex justify-center mb-4">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl mb-2">Solicitação Recebida!</CardTitle>
                    <CardDescription className="text-lg text-gray-700">
                        Muito obrigado, <strong>{form.getValues("nome_completo")}</strong>.
                        <br /><br />
                        A equipe da <strong>{unidade.nome}</strong> recebeu seus dados e entrará em contato pelo WhatsApp em breve.
                    </CardDescription>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <Helmet>
                <title>Matrícula Online | {unidade.nome}</title>
            </Helmet>

            {/* Header */}
            <div className="mb-8 text-center px-4">
                {unidade.logo_url && (
                    <img src={unidade.logo_url} alt={unidade.nome} className="h-16 mx-auto mb-4 object-contain" />
                )}
                <h1 className="text-3xl font-bold text-gray-900">Matrícula Online</h1>
                <p className="text-lg text-gray-600 mt-1">{unidade.nome}</p>
                {atividadeUrl && (
                    <Badge variant="secondary" className="mt-4 text-sm py-1 px-3">
                        Interesse em: {atividadeUrl}
                    </Badge>
                )}
            </div>

            {/* SELEÇÃO: quem vai participar */}
            {!participantType && (
                <Card className="w-full max-w-md shadow-lg border-primary/10">
                    <CardHeader className="pb-2 text-center">
                        <CardTitle className="text-xl font-black uppercase italic">Quem vai participar?</CardTitle>
                        <CardDescription>Escolha para preencher o formulário certo</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        <button
                            onClick={() => handleSelectType("filho")}
                            className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-gray-100 bg-white hover:border-primary hover:bg-primary/5 transition-all text-left group"
                        >
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                <Baby className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-black text-sm uppercase tracking-wide text-gray-900">Meu filho(a)</p>
                                <p className="text-xs text-gray-500 mt-0.5">Estou inscrevendo uma criança ou dependente</p>
                            </div>
                        </button>

                        <button
                            onClick={() => handleSelectType("eu_mesmo")}
                            className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-gray-100 bg-white hover:border-primary hover:bg-primary/5 transition-all text-left group"
                        >
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-black text-sm uppercase tracking-wide text-gray-900">Eu mesmo</p>
                                <p className="text-xs text-gray-500 mt-0.5">Quero me inscrever em uma atividade</p>
                            </div>
                        </button>
                    </CardContent>
                </Card>
            )}

            {/* FORMULÁRIO (passos 1 e 2) */}
            {participantType && (
                <Card className="w-full max-w-md shadow-lg border-primary/10 overflow-hidden">
                    <div className="h-1.5 w-full bg-gray-100">
                        <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: step === 1 ? "50%" : "100%" }}
                        />
                    </div>
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-2">
                            {/* Botão voltar para seleção (só no passo 1) */}
                            {step === 1 && (
                                <button
                                    onClick={() => setParticipantType(null)}
                                    className="text-gray-400 hover:text-gray-700 transition-colors"
                                    title="Voltar"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                            )}
                            <CardTitle className="flex-1 flex justify-between items-center text-2xl font-black italic uppercase">
                                {step === 1
                                    ? participantType === "filho" ? "Dados da Criança" : "Seus Dados"
                                    : "Ficha de Inscrição"}
                                <Badge variant="outline" className="font-bold text-[10px] uppercase border-primary/20 text-primary">
                                    Passo {step} de 2
                                </Badge>
                            </CardTitle>
                        </div>
                        <CardDescription className="text-sm font-medium pl-7">
                            {step === 1
                                ? participantType === "filho"
                                    ? "Preencha os dados da criança e seu WhatsApp para contato."
                                    : "Preencha seus dados para garantirmos seu contato."
                                : "Complete a ficha para agilizar sua matrícula."}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onFinalSubmit)} className="space-y-6">

                                {/* ── PASSO 1 ── */}
                                <div className={cn("space-y-5 animate-in fade-in duration-300", step !== 1 && "hidden")}>

                                    {/* Seção: Dados do aluno / da pessoa */}
                                    <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                                        {participantType === "filho"
                                            ? <Baby className="h-3.5 w-3.5 text-primary" />
                                            : <User className="h-3.5 w-3.5 text-primary" />
                                        }
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                            {participantType === "filho" ? "Dados da Criança" : "Seus Dados"}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="nome_completo"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[11px] font-black uppercase tracking-wider opacity-70">
                                                        {participantType === "filho" ? "Nome da Criança" : "Seu Nome"}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ex: João" className="h-11 font-medium" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="sobrenome"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[11px] font-black uppercase tracking-wider opacity-70">Sobrenome</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ex: Silva" className="h-11 font-medium" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="data_nascimento"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[11px] font-black uppercase tracking-wider opacity-70">
                                                    {participantType === "filho" ? "Data de Nascimento da Criança" : "Sua Data de Nascimento"}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input type="date" className="h-11 font-medium" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Seção: contato — pai/mãe ou o próprio */}
                                    <div className="flex items-center gap-2 pb-1 border-b border-gray-100 pt-2">
                                        <UserCheck className="h-3.5 w-3.5 text-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                            {participantType === "filho" ? "Contato do Responsável" : "Contato"}
                                        </span>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="whatsapp"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[11px] font-black uppercase tracking-wider opacity-70">
                                                    {participantType === "filho" ? "WhatsApp do Pai / Mãe" : "Seu WhatsApp"}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="(00) 00000-0000"
                                                        className="h-11 font-medium"
                                                        {...field}
                                                        onChange={(e) => {
                                                            let value = e.target.value.replace(/\D/g, "");
                                                            if (value.length > 11) value = value.slice(0, 11);
                                                            if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                                                            if (value.length > 9) value = `${value.slice(0, 9)}-${value.slice(9)}`;
                                                            field.onChange(value);
                                                        }}
                                                    />
                                                </FormControl>
                                                <p className="text-[10px] text-gray-400 mt-1">Entraremos em contato por aqui para confirmar a vaga.</p>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* E-mail só no modo "eu mesmo" — necessário para o convite */}
                                    {participantType === "eu_mesmo" && (
                                        <FormField
                                            control={form.control}
                                            name="email_proprio"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[11px] font-black uppercase tracking-wider opacity-70">Seu E-mail</FormLabel>
                                                    <FormControl>
                                                        <Input type="email" placeholder="email@exemplo.com" className="h-11 font-medium" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    <Button
                                        type="button"
                                        onClick={onStep1Submit}
                                        className="w-full text-lg h-12 font-black italic uppercase"
                                    >
                                        Próximo Passo
                                    </Button>
                                </div>

                                {/* ── PASSO 2 ── */}
                                <div className={cn("space-y-6 animate-in fade-in duration-300", step !== 2 && "hidden")}>

                                    {/* Dados do responsável (só para "filho") */}
                                    {participantType === "filho" && (
                                        <>
                                            <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                                                <UserCheck className="h-3.5 w-3.5 text-primary" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Dados do Pai / Mãe / Responsável</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="nome_responsavel"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[11px] font-black uppercase tracking-wider opacity-70">Nome Completo</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: Maria Silva" className="h-11 font-medium" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="email_responsavel"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[11px] font-black uppercase tracking-wider opacity-70">E-mail</FormLabel>
                                                            <FormControl>
                                                                <Input type="email" placeholder="email@exemplo.com" className="h-11 font-medium" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="cpf_responsavel"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[11px] font-black uppercase tracking-wider opacity-70">CPF do Responsável</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="000.000.000-00" className="h-11 font-medium" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </>
                                    )}

                                    {/* Informações do aluno (escola/série — só faz sentido para filho) */}
                                    {participantType === "filho" && (
                                        <>
                                            <div className="flex items-center gap-2 pb-1 border-b border-gray-100 pt-1">
                                                <Baby className="h-3.5 w-3.5 text-primary" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Informações da Criança</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="escola"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[11px] font-black uppercase tracking-wider opacity-70">Escola</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: Colégio Estadual" className="h-11 font-medium" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="serie_ano"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[11px] font-black uppercase tracking-wider opacity-70">Série / Ano</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: 3º Ano" className="h-11 font-medium" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <FormField
                                        control={form.control}
                                        name="necessidades_especiais"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[11px] font-black uppercase tracking-wider opacity-70">
                                                    {participantType === "filho" ? "Necessidades Especiais / Neurodiversidade da Criança" : "Necessidades Especiais / Neurodiversidade"}
                                                </FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Descreva se houver alguma condição especial..."
                                                        className="min-h-[80px] font-medium resize-none shadow-none focus-visible:ring-1"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="como_conheceu"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[11px] font-black uppercase tracking-wider opacity-70">Como conheceu a {unidade?.nome}?</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11 font-medium bg-white/50 border-gray-200">
                                                            <SelectValue placeholder="Selecione uma opção" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Instagram">Instagram</SelectItem>
                                                        <SelectItem value="Facebook">Facebook</SelectItem>
                                                        <SelectItem value="Amigos">Amigos / Indicação</SelectItem>
                                                        <SelectItem value="Escola">Na Escola</SelectItem>
                                                        <SelectItem value="Outro">Outro</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="autoriza_imagem"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 rounded-xl bg-primary/5 border border-primary/10">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        className="mt-0.5"
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <div className="flex items-center gap-1.5">
                                                        <Camera className="h-3.5 w-3.5 text-primary" />
                                                        <FormLabel className="text-xs font-black uppercase tracking-tight cursor-pointer text-primary">
                                                            Autorizo o uso de fotos e vídeos
                                                        </FormLabel>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 leading-relaxed">
                                                        Autorizo a {unidade?.nome} a publicar fotos e vídeos{participantType === "filho" ? " da criança" : ""} em redes sociais (Instagram, Facebook, WhatsApp) e materiais de divulgação.
                                                    </p>
                                                </div>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setStep(1)}
                                            className="h-12 px-6 uppercase font-black italic text-[10px]"
                                        >
                                            Voltar
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="flex-1 h-12 text-lg font-black italic uppercase"
                                            disabled={form.formState.isSubmitting}
                                        >
                                            {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Finalizar Cadastro"}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}

            <p className="mt-8 text-sm text-gray-400">Desenvolvido por NeoMissio</p>
        </div>
    );
}
