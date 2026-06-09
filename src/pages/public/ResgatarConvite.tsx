import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, Mail, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const ResgatarConvite = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { signup } = useAuth();

    const [token, setToken] = useState(searchParams.get("token") || "");
    const [email, setEmail] = useState(searchParams.get("email") || "");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    
    const [step, setStep] = useState<"verify" | "signup" | "activation_sent" | "success">("verify");
    const [isLoading, setIsLoading] = useState(false);
    const [invitationData, setInvitationData] = useState<any>(null);

    // Auto-verify if both params are present
    useEffect(() => {
        if (token && email && step === "verify") {
            handleVerify();
        }
    }, []);

    const handleVerify = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke("redeem-invitation", {
                body: { token, email: email.toLowerCase().trim() }
            });

            if (error) {
                const errorData = await error.context.json();
                toast({
                    title: "Erro ao validar convite",
                    description: errorData.error || "Token ou e-mail inválidos.",
                    variant: "destructive",
                });
                return;
            }

            if (data.status === "existing_user") {
                setStep("activation_sent");
                toast({
                    title: "Conta já existente",
                    description: "Enviamos um link de ativação para seu e-mail.",
                });
            } else if (data.status === "new_user") {
                setInvitationData(data);
                setStep("signup");
                setEmail(data.email);
                if (data.is_self && data.selfName) {
                    setName(data.selfName);
                }
            }
        } catch (err) {
            console.error("Erro na verificação:", err);
            toast({
                title: "Erro de conexão",
                description: "Não foi possível conectar ao servidor.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await signup(
                email,
                password,
                name,
                "responsavel",
                token
            );

            if (error) {
                toast({
                    title: "Erro no cadastro",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                setStep("success");
                toast({
                    title: "Sucesso!",
                    description: "Sua conta foi criada e seus alunos foram vinculados.",
                });
            }
        } catch (err) {
            toast({
                title: "Erro inesperado",
                description: "Tente novamente mais tarde.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] p-4 relative overflow-hidden">
            {/* Background elements for premium feel */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-500/10 blur-[120px] rounded-full animate-pulse" />

            <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl relative z-10">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mb-4 border border-primary/30">
                        <Key className="text-primary h-6 w-6" />
                    </div>
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        {step === "success" ? "Bem-vindo!" : "Resgatar Convite"}
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                        {step === "verify" && "Insira os dados do e-mail recebido."}
                        {step === "signup" && "Quase lá! Crie sua senha de acesso."}
                        {step === "activation_sent" && "E-mail de ativação enviado."}
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-6">
                    {step === "verify" && (
                        <form onSubmit={handleVerify} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="token" className="text-gray-300">Token de 8 Caracteres</Label>
                                <Input 
                                    id="token"
                                    placeholder="Ex: EF247427"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                                    className="bg-black/20 border-white/10 text-white h-12 text-center text-lg tracking-widest font-mono"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-300">Seu E-mail Cadastrado</Label>
                                <Input 
                                    id="email" 
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-black/20 border-white/10 text-white h-12"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/20" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : "Verificar Convite"}
                            </Button>
                        </form>
                    )}

                    {step === "signup" && (
                        <form onSubmit={handleSignup} className="space-y-6">
                            {/* Auto-matrícula: responsável é o próprio aluno */}
                            {invitationData?.is_self ? (
                                <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                                    <p className="text-xs text-primary uppercase font-bold tracking-wider mb-1">Sua matrícula pessoal</p>
                                    <p className="text-sm text-gray-300">Seu perfil de aluno será criado automaticamente junto com sua conta.</p>
                                </div>
                            ) : invitationData?.studentNames?.length > 0 && (
                                <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                                    <p className="text-xs text-primary uppercase font-bold tracking-wider mb-1">Alunos Vinculados:</p>
                                    <p className="text-sm text-gray-200">{invitationData.studentNames.join(", ")}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="signup-name" className="text-gray-300">
                                    {invitationData?.is_self ? "Confirme seu Nome Completo" : "Seu Nome Completo"}
                                </Label>
                                <Input
                                    id="signup-name"
                                    placeholder="Como quer ser chamado?"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-black/20 border-white/10 text-white h-12"
                                    disabled={isLoading}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="signup-password" className="text-gray-300">Crie uma Senha Forte</Label>
                                <Input
                                    id="signup-password"
                                    type="password"
                                    placeholder="Mínimo 6 caracteres"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-black/20 border-white/10 text-white h-12"
                                    disabled={isLoading}
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : "Concluir Cadastro"}
                            </Button>
                        </form>
                    )}

                    {step === "activation_sent" && (
                        <div className="text-center py-8 space-y-6">
                            <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center animate-bounce">
                                <Mail className="text-blue-400 h-8 w-8" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Verifique seu E-mail</h3>
                                <p className="text-gray-400">
                                    Como você já tinha um perfil, enviamos um link para você definir sua senha e acessar o sistema.
                                </p>
                            </div>
                            <Button variant="outline" className="w-full border-white/10 text-gray-300" onClick={() => navigate("/login")}>
                                Voltar para Login
                            </Button>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="text-center py-8 space-y-6">
                            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="text-green-400 h-8 w-8" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Tudo Pronto!</h3>
                                <p className="text-gray-400">
                                    {invitationData?.is_self
                                        ? "Sua conta e seu perfil de aluno foram criados. Faça login para se matricular em uma atividade."
                                        : "Sua conta foi ativada e seus alunos foram vinculados com sucesso."
                                    }
                                </p>
                            </div>
                            <Button className="w-full bg-primary" onClick={() => navigate("/login")}>
                                Fazer Login Agora
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ResgatarConvite;
