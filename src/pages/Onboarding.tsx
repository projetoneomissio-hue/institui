import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ArrowRight, Loader2, GraduationCap, Dumbbell, Heart, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUnidade } from "@/contexts/UnidadeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type OrgTypeId = "escola" | "academia" | "ong" | "personal";

const ORG_TYPES: {
  id: OrgTypeId;
  label: string;
  description: string;
  icon: React.ElementType;
  flags: Record<string, boolean>;
}[] = [
  {
    id: "escola",
    label: "Escola",
    description: "Ensino fundamental, médio, cursos livres",
    icon: GraduationCap,
    flags: {
      saude: true,
      predio: true,
      academico: true,
      comissoes: true,
      calendario: true,
      voluntarios: true,
      landing_publica: true,
      indicacoes: false,
    },
  },
  {
    id: "academia",
    label: "Academia / Studio",
    description: "Fitness, dança, artes marciais, yoga",
    icon: Dumbbell,
    flags: {
      saude: false,
      predio: true,
      academico: false,
      comissoes: true,
      calendario: true,
      voluntarios: false,
      landing_publica: true,
      indicacoes: false,
    },
  },
  {
    id: "ong",
    label: "ONG / Projeto Social",
    description: "Projetos comunitários, voluntariado, assistência",
    icon: Heart,
    flags: {
      saude: true,
      predio: false,
      academico: false,
      comissoes: false,
      calendario: true,
      voluntarios: true,
      landing_publica: false,
      indicacoes: false,
    },
  },
  {
    id: "personal",
    label: "Personal / Consultoria",
    description: "Atendimento individual, coaching, saúde",
    icon: UserCircle,
    flags: {
      saude: true,
      predio: false,
      academico: false,
      comissoes: false,
      calendario: true,
      voluntarios: false,
      landing_publica: true,
      indicacoes: false,
    },
  },
];

const STEP_LABELS = ["Boas-vindas", "Tipo", "Dados", "Pronto"];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentUnidade } = useUnidade();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [orgType, setOrgType] = useState<OrgTypeId | null>(null);
  const [orgName, setOrgName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const selectedType = ORG_TYPES.find((t) => t.id === orgType);

  const handleSaveData = async () => {
    if (!orgName.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Preencha o nome da instituição.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const slug = orgName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      if (currentUnidade?.id) {
        const updatePayload: Record<string, any> = { nome: orgName.trim(), slug };
        if (selectedType) {
          updatePayload.feature_flags = selectedType.flags;
        }

        const { error } = await supabase
          .from("unidades")
          .update(updatePayload)
          .eq("id", currentUnidade.id);

        if (error) throw error;
      }

      if (user?.id && phone.trim()) {
        await supabase
          .from("profiles")
          .update({ telefone: phone.trim() })
          .eq("id", user.id);
      }

      toast({
        title: "Tudo configurado!",
        description: `"${orgName}" está pronta para uso.`,
      });

      setStep(4);
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step === 2 && !orgType) {
      toast({
        title: "Selecione o tipo",
        description: "Escolha o tipo de organização para continuar.",
        variant: "destructive",
      });
      return;
    }
    if (step === 3) {
      handleSaveData();
      return;
    }
    if (step === 4) {
      navigate("/dashboard");
      return;
    }
    setStep(step + 1);
  };

  const stepTitle: Record<number, string> = {
    1: "Bem-vindo!",
    2: "Qual é o seu tipo de organização?",
    3: `Dados da ${selectedType?.label ?? "Instituição"}`,
    4: "Tudo Pronto!",
  };

  const stepDescription: Record<number, string> = {
    1: "Vamos configurar seu ambiente em menos de 2 minutos.",
    2: "Escolha o tipo certo e o sistema vai se adaptar para você.",
    3: "Precisamos de alguns detalhes para personalizar seu painel.",
    4: "Seu ambiente foi configurado com sucesso.",
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg mb-6 space-y-3">
        <div className="flex justify-between text-sm font-medium text-slate-500">
          {STEP_LABELS.map((label, i) => (
            <span
              key={label}
              className={cn(
                "transition-colors",
                i + 1 === step && "text-primary font-semibold",
                i + 1 < step && "text-slate-400"
              )}
            >
              {label}
            </span>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="w-full max-w-lg shadow-soft border-none">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{stepTitle[step]}</CardTitle>
          <CardDescription className="text-center">{stepDescription[step]}</CardDescription>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <div className="bg-primary/5 p-4 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-slate-700">
                <p className="font-medium text-primary mb-2">O que você vai poder fazer:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Gestão completa de alunos e turmas</li>
                  <li>Controle financeiro automatizado</li>
                  <li>Portal do Responsável com matrícula online</li>
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-3">
              {ORG_TYPES.map((type) => {
                const Icon = type.icon;
                const selected = orgType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setOrgType(type.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all cursor-pointer",
                      selected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-slate-200 bg-white hover:border-primary/40 hover:bg-primary/[0.02]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        selected ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={cn("text-sm font-semibold", selected ? "text-primary" : "text-slate-700")}>
                      {type.label}
                    </span>
                    <span className="text-xs text-slate-500 leading-snug">{type.description}</span>
                    {selected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {selectedType && (
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20 text-sm text-primary font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Tipo selecionado: {selectedType.label}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="orgName">Nome da Instituição *</Label>
                <Input
                  id="orgName"
                  placeholder={`Ex: Minha ${selectedType?.label ?? "Instituição"}`}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input
                  id="phone"
                  placeholder="(41) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-in zoom-in duration-300">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <div className="space-y-2">
                <p className="text-slate-700 font-medium">
                  <strong>{orgName || "Sua organização"}</strong> está configurada.
                </p>
                <p className="text-sm text-slate-500">
                  Os módulos foram ativados de acordo com o perfil de{" "}
                  <span className="font-medium text-primary">{selectedType?.label}</span>.
                  Você pode ajustar isso a qualquer momento em Configurações.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {step > 1 && step < 4 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={saving}>
              Voltar
            </Button>
          ) : (
            <div />
          )}

          <Button onClick={handleNext} className="gap-2" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                {step === 4 ? "Ir para o Dashboard" : "Continuar"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <p className="mt-8 text-center text-sm text-slate-400">
        {currentUnidade?.nome || "Zafen"} &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
};

export default Onboarding;
