import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useAlunoMutations } from "@/hooks/useAlunos";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, ArrowRight, CheckCircle2, School, Heart, CalendarCheck, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCPF, unmaskCPF, validateCPF } from "@/utils/cpf";

const steps = [
    {
        icon: Heart,
        title: "Acompanhe o desenvolvimento",
        description: "Veja a frequência e o progresso do seu filho(a) em tempo real.",
    },
    {
        icon: CalendarCheck,
        title: "Matrículas em um clique",
        description: "Solicite matrículas nas atividades disponíveis sem sair de casa.",
    },
    {
        icon: DollarSign,
        title: "Pagamentos simplificados",
        description: "Consulte cobranças e registre pagamentos facilmente.",
    },
];

export const OnboardingResponsavel = () => {
    const { user } = useAuth();
    const { saveMutation } = useAlunoMutations();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        nome: "",
        data_nascimento: "",
        cpf: "",
        telefone: "",
        responsavel_id: user?.id
    });

    const [cpfError, setCpfError] = useState<string | null>(null);

    const handleCpfChange = (value: string) => {
        const formatted = formatCPF(value);
        setFormData({ ...formData, cpf: formatted });
        setCpfError(null);
        const clean = unmaskCPF(formatted);
        if (clean.length === 11 && !validateCPF(clean)) {
            setCpfError("CPF inválido");
        }
    };

    const handleSubmit = async () => {
        if (cpfError) return;
        try {
            await saveMutation.mutateAsync({ data: formData });
            setStep(3);
        } catch (error) {
            console.error("Erro ao salvar aluno:", error);
        }
    };

    const handleGoToDashboard = () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-alunos"] });
        navigate("/responsavel", { replace: true });
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-2">
                <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-primary">N</span>
                </div>
                <span className="font-semibold text-lg uppercase text-foreground">Neo Missio</span>
            </header>

            {/* Progress bar */}
            <div className="h-1 bg-muted">
                <div
                    className="h-1 bg-primary transition-all duration-500"
                    style={{ width: `${(step / 3) * 100}%` }}
                />
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-xl border-primary/10">

                    {/* Step 1 — Boas-vindas */}
                    {step === 1 && (
                        <>
                            <CardHeader className="text-center pb-4">
                                <div className="mx-auto bg-primary/10 p-4 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-3">
                                    <School className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                                </div>
                                <CardTitle className="text-xl sm:text-2xl">
                                    Bem-vindo, {user?.name?.split(" ")[0] || "responsável"}!
                                </CardTitle>
                                <CardDescription className="text-sm sm:text-base mt-1">
                                    Antes de começar, cadastre o primeiro aluno vinculado ao seu perfil.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {steps.map(({ icon: Icon, title, description }) => (
                                    <div key={title} className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
                                        <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                            <Icon className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                            <CardFooter>
                                <Button onClick={() => setStep(2)} className="w-full gap-2 h-12 text-base font-bold">
                                    Começar <ArrowRight className="w-5 h-5" />
                                </Button>
                            </CardFooter>
                        </>
                    )}

                    {/* Step 2 — Cadastro */}
                    {step === 2 && (
                        <>
                            <CardHeader>
                                <CardTitle className="text-xl">Dados do Aluno</CardTitle>
                                <CardDescription>
                                    Informe os dados do seu filho(a) ou dependente.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {user?.name && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, nome: user.name! })}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                                    >
                                        <div className="h-8 w-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-primary uppercase tracking-wide">Sou eu mesmo o aluno</p>
                                            <p className="text-sm text-foreground font-medium truncate">{user.name}</p>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                                    </button>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="nome">Nome Completo *</Label>
                                    <Input
                                        id="nome"
                                        value={formData.nome}
                                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                        placeholder="Nome do aluno"
                                        autoFocus
                                        className="h-12 text-base"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nascimento">Data de Nascimento *</Label>
                                    <Input
                                        id="nascimento"
                                        type="date"
                                        value={formData.data_nascimento}
                                        onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                                        className="h-12 text-base"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cpf">CPF (Opcional)</Label>
                                    <Input
                                        id="cpf"
                                        value={formData.cpf}
                                        onChange={(e) => handleCpfChange(e.target.value)}
                                        placeholder="000.000.000-00"
                                        className="h-12 text-base"
                                    />
                                    {cpfError && <p className="text-xs text-red-500">{cpfError}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telefone">Telefone de Contato</Label>
                                    <Input
                                        id="telefone"
                                        value={formData.telefone}
                                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                        placeholder="(00) 00000-0000"
                                        type="tel"
                                        className="h-12 text-base"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-3">
                                <Button variant="ghost" onClick={() => setStep(1)} className="shrink-0">
                                    Voltar
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!formData.nome || !formData.data_nascimento || saveMutation.isPending}
                                    className="flex-1 h-12 font-bold gap-2"
                                >
                                    {saveMutation.isPending
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <UserPlus className="w-4 h-4" />}
                                    Cadastrar Aluno
                                </Button>
                            </CardFooter>
                        </>
                    )}

                    {/* Step 3 — Sucesso */}
                    {step === 3 && (
                        <>
                            <CardHeader className="text-center">
                                <div className="mx-auto bg-green-100 dark:bg-green-900/30 p-4 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-3">
                                    <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
                                </div>
                                <CardTitle className="text-xl sm:text-2xl">Tudo Pronto!</CardTitle>
                                <CardDescription className="text-sm sm:text-base mt-1">
                                    Aluno cadastrado com sucesso. Agora você pode solicitar matrículas.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800 text-center">
                                    <p className="font-bold text-green-700 dark:text-green-400">{formData.nome}</p>
                                    <p className="text-xs text-green-600/80 dark:text-green-500/80 mt-0.5">Vinculado ao seu perfil</p>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-3">
                                <Button onClick={handleGoToDashboard} className="w-full h-12 text-base font-bold">
                                    Ir para o Dashboard
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate("/responsavel/nova-matricula")}
                                    className="w-full h-12"
                                >
                                    Solicitar Matrícula Agora
                                </Button>
                            </CardFooter>
                        </>
                    )}
                </Card>
            </div>

            <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
        </div>
    );
};
