import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ClipboardList,
  PhoneCall,
  UserPlus,
  Mail,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Clock,
  AlertCircle,
  Info,
  Route,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  {
    num: 1,
    label: "Descobre",
    short: "Instagram / indicação",
    who: "auto",
  },
  {
    num: 2,
    label: "Formulário",
    short: "Site online",
    who: "auto",
  },
  {
    num: 3,
    label: "Lead no sistema",
    short: "Interessados",
    who: "auto",
  },
  {
    num: 4,
    label: "1º Contato",
    short: "Equipe · 48h",
    who: "team",
  },
  {
    num: 5,
    label: "Converter",
    short: "Equipe · mesmo dia",
    who: "team",
  },
  {
    num: 6,
    label: "Conta criada",
    short: "Responsável",
    who: "resp",
  },
  {
    num: 7,
    label: "Pagamento",
    short: "Responsável",
    who: "resp",
  },
  {
    num: 8,
    label: "Aprovar",
    short: "Equipe · 24h",
    who: "team",
  },
  {
    num: 9,
    label: "Ativo ✓",
    short: "Concluído",
    who: "done",
  },
];

const stageColor = (who: string) => {
  if (who === "team") return "bg-primary text-primary-foreground shadow-md shadow-primary/30";
  if (who === "done") return "bg-green-500 text-white shadow-md shadow-green-500/30";
  if (who === "resp") return "bg-blue-500/20 text-blue-600 border border-blue-500/30";
  return "bg-muted text-muted-foreground";
};

const labelColor = (who: string) => {
  if (who === "team") return "text-primary font-bold";
  if (who === "done") return "text-green-600 font-bold";
  if (who === "resp") return "text-blue-600";
  return "text-muted-foreground";
};

export const JornadaAluno = () => {
  const navigate = useNavigate();
  const [activeStage, setActiveStage] = useState<string | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1">
          <Route className="h-6 w-6 text-primary" />
          Jornada do Novo Aluno
        </h2>
        <p className="text-sm text-muted-foreground">
          Do primeiro interesse até o aluno ativo na chamada — 9 etapas, 3 são responsabilidade da equipe.
        </p>
        <div className="flex flex-wrap gap-3 mt-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-3 w-3 rounded-full bg-muted border border-border inline-block" /> Automático / Responsável
          </span>
          <span className="flex items-center gap-1.5 text-primary">
            <span className="h-3 w-3 rounded-full bg-primary inline-block" /> Ação da Equipe
          </span>
          <span className="flex items-center gap-1.5 text-green-600">
            <span className="h-3 w-3 rounded-full bg-green-500 inline-block" /> Concluído
          </span>
        </div>
      </div>

      {/* Pipeline Visual */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start gap-0 min-w-max">
          {STAGES.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => setActiveStage(activeStage === String(s.num) ? null : String(s.num))}
                className={cn(
                  "flex flex-col items-center gap-1.5 group transition-transform hover:scale-105 w-20",
                  s.who === "team" && "cursor-pointer"
                )}
              >
                <div className={cn("h-11 w-11 rounded-full flex items-center justify-center text-sm font-black transition-all", stageColor(s.who))}>
                  {s.num}
                </div>
                <span className={cn("text-[10px] text-center leading-tight font-bold", labelColor(s.who))}>
                  {s.label}
                </span>
                <span className="text-[9px] text-center text-muted-foreground/70 leading-tight">
                  {s.short}
                </span>
              </button>
              {i < STAGES.length - 1 && (
                <div className={cn(
                  "h-[2px] w-6 mx-0.5 mt-[-28px] transition-colors",
                  s.who === "team" ? "bg-primary/40" : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stage Detail Accordion */}
      <Accordion type="single" collapsible className="w-full space-y-3" value={activeStage ?? undefined} onValueChange={setActiveStage}>

        {/* Etapa 1 e 2 */}
        <AccordionItem value="1" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-muted p-2 rounded-lg text-muted-foreground">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Etapas 1 e 2 — Como o Aluno Nos Encontra</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Automático — nenhuma ação da equipe necessária</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 px-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              O interessado encontra a organização pelas redes sociais ou indicação e acessa o formulário online.
            </p>
            <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-bold text-foreground">O formulário tem duas fases:</p>
              <div className="space-y-1.5 text-muted-foreground">
                <div className="flex gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Passo 1</Badge> Nome do aluno + WhatsApp do responsável. Lead já aparece no sistema.</div>
                <div className="flex gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Passo 2</Badge> Nome/e-mail/CPF do responsável, escola, série, autorização de imagem.</div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Mesmo que o interessado abandone no Passo 1, a equipe já tem o WhatsApp para entrar em contato.</span>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Etapa 3 */}
        <AccordionItem value="3" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-muted p-2 rounded-lg text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Etapa 3 — Lead Aparece em Interessados</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Automático — o lead fica visível imediatamente</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 px-2 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { badge: "PASSO 1", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", desc: "Só tem WhatsApp" },
                { badge: "FICHA COMPLETA", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", desc: "Pronto para converter" },
                { badge: "CONVERTIDO", color: "bg-green-500/10 text-green-600 border-green-500/20", desc: "Aluno já criado" },
                { badge: "ARQUIVADO", color: "bg-red-500/10 text-red-500 border-red-500/20", desc: "Não aparece na lista" },
              ].map(s => (
                <div key={s.badge} className={cn("p-2.5 rounded-lg border text-center", s.color)}>
                  <p className="font-bold text-[10px] uppercase tracking-wide">{s.badge}</p>
                  <p className="text-[10px] mt-0.5 opacity-80">{s.desc}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full gap-2 h-9 text-xs" onClick={() => navigate("/direcao/interessados")}>
              Ir para Interessados <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Etapa 4 — TEAM */}
        <AccordionItem value="4" className="bg-primary/[0.03] border border-primary/20 rounded-xl px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">Etapa 4 — Primeiro Contato ← SUA AÇÃO</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Prazo: 48 horas após o lead chegar</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 px-2 space-y-4">
            <div className="space-y-3">
              <div className="p-4 bg-card rounded-xl border border-border space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Se o lead está em PASSO 1 (ficha incompleta):</p>
                <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal pl-4">
                  <li>Clique no botão <strong>WhatsApp verde</strong> na linha do lead</li>
                  <li>A mensagem já aparece preenchida — só enviar</li>
                  <li>Objetivo: confirmar interesse e pedir a ficha completa</li>
                  <li>Se coletou por telefone: clique <code className="text-xs bg-muted px-1 rounded">···</code> → <strong>Completar Ficha</strong></li>
                  <li>Sem resposta após 3 tentativas: <code className="text-xs bg-muted px-1 rounded">···</code> → <strong>Arquivar</strong></li>
                </ol>
              </div>
              <div className="p-4 bg-card rounded-xl border border-border space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-yellow-600">Se o lead está em FICHA COMPLETA:</p>
                <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal pl-4">
                  <li>Entre em contato para confirmar o interesse</li>
                  <li>Explique o próximo passo (conta no sistema, pagamento da taxa)</li>
                  <li>Se confirmado → avance para a Etapa 5</li>
                  <li>Se desistiu → <code className="text-xs bg-muted px-1 rounded">···</code> → <strong>Arquivar</strong></li>
                </ol>
              </div>
            </div>
            <Button size="sm" className="w-full gap-2 h-9 text-xs" onClick={() => navigate("/direcao/interessados")}>
              Abrir Interessados <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Etapa 5 — TEAM */}
        <AccordionItem value="5" className="bg-primary/[0.03] border border-primary/20 rounded-xl px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">Etapa 5 — Converter em Aluno ← SUA AÇÃO</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">No mesmo dia após confirmar o interesse</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 px-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              Em Interessados, clique na linha do lead → <code className="text-xs bg-muted px-1 rounded">···</code> → <strong>Converter Aluno</strong>.
            </p>
            <div className="p-4 bg-card rounded-xl border border-border space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide">O que preencher no diálogo:</p>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
                <li><strong>Nome do responsável</strong> — pai, mãe ou o próprio aluno</li>
                <li><strong>E-mail para convite</strong> — onde vai chegar o link de acesso ao sistema</li>
                <li><strong>Isentar taxa?</strong> — marcar APENAS em casos especiais (bolsa, transferência)</li>
              </ul>
            </div>
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-green-600">O sistema faz automaticamente:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Cria o cadastro do aluno</li>
                <li>Cria a matrícula com status PENDENTE</li>
                <li>Gera a taxa de matrícula (R$ 25,00)</li>
                <li>Envia e-mail de convite para o responsável</li>
                <li>Exibe o link de pagamento PIX/Cartão para você copiar</li>
              </ul>
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-700 dark:text-blue-400">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Após converter, copie o link de pagamento e mande no WhatsApp do responsável. Avise que o e-mail de convite pode cair no spam.</span>
            </div>
            <Button size="sm" className="w-full gap-2 h-9 text-xs" onClick={() => navigate("/direcao/interessados")}>
              Abrir Interessados <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Etapas 6 e 7 */}
        <AccordionItem value="6" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Etapas 6 e 7 — Responsável Entra e Paga</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Responsável — equipe só entra se houver problema</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 px-2 space-y-3">
            <div className="text-sm text-muted-foreground space-y-1.5">
              <p>O responsável recebe o e-mail de convite, clica no link, cria uma senha e acessa o portal.</p>
              <p>No portal, ele vê o pagamento pendente e pode pagar via PIX ou cartão.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                <p className="font-bold">Pagamento Online</p>
                <p className="text-muted-foreground">PIX ou cartão pelo portal — automático</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1">
                <p className="font-bold">Pagamento Presencial</p>
                <p className="text-muted-foreground">Aceite e confirme manualmente em Cobranças</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs text-orange-700 dark:text-orange-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span><strong>Problema mais comum:</strong> e-mail de convite foi para o spam. Orientar o responsável a verificar a pasta de spam antes de pedir reenvio.</span>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Etapa 8 — TEAM */}
        <AccordionItem value="8" className="bg-primary/[0.03] border border-primary/20 rounded-xl px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">Etapa 8 — Aprovar a Matrícula ← SUA AÇÃO</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Prazo: 24 horas após a solicitação</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 px-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              Acesse <strong>Menu → Matrículas</strong>. Um banner amarelo mostra quantas estão aguardando aprovação.
            </p>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal pl-4">
              <li>Clique no botão <strong>"Aprovar"</strong> na linha do aluno pendente</li>
              <li>Defina o valor da taxa (padrão R$ 25,00 — coloque 0,00 para isentar)</li>
              <li>Clique <strong>"Confirmar e Ativar"</strong></li>
              <li>O sistema gera o link de pagamento e oferece enviar pelo WhatsApp</li>
            </ol>
            <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Após a aprovação, o aluno aparece automaticamente na lista de chamada do professor!</span>
            </div>
            <Button size="sm" className="w-full gap-2 h-9 text-xs" onClick={() => navigate("/direcao/matriculas")}>
              Ir para Matrículas <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Etapa 9 */}
        <AccordionItem value="9" className="bg-green-500/[0.03] border border-green-500/20 rounded-xl px-4 shadow-sm">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-green-500/10 p-2 rounded-lg text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-green-600">Etapa 9 — Aluno Ativo ✅</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Jornada concluída com sucesso</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6 px-2">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { role: "Professor", desc: "Aluno aparece na chamada, pode lançar frequência e avaliações" },
                { role: "Coordenação", desc: "Visível no painel de turmas, pode acompanhar presença" },
                { role: "Direção", desc: "Visível em Alunos, Matrículas e Cobranças" },
                { role: "Responsável", desc: "Acessa o portal: atividades, pagamentos e comunicados" },
              ].map(r => (
                <div key={r.role} className="p-3 bg-card rounded-xl border border-border space-y-1">
                  <p className="font-bold text-foreground">{r.role}</p>
                  <p className="text-muted-foreground">{r.desc}</p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      {/* Prazos Box */}
      <div className="p-5 bg-card border border-border rounded-2xl space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Prazos que Não Podemos Errar
        </h3>
        <div className="space-y-2">
          {[
            { time: "2 horas", label: "Primeiro contato após o lead chegar (horário comercial)" },
            { time: "mesmo dia", label: "Converter o lead após confirmar o interesse" },
            { time: "3 dias", label: "Prazo para o responsável pagar a taxa de matrícula" },
            { time: "24 horas", label: "Aprovar a matrícula após o responsável solicitar" },
          ].map(p => (
            <div key={p.time} className="flex items-center gap-3 text-sm">
              <Badge className="bg-primary/10 text-primary border-none font-bold text-xs shrink-0 min-w-[80px] text-center justify-center">
                {p.time}
              </Badge>
              <span className="text-muted-foreground">{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Casos Especiais */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" /> Casos Especiais
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            {
              title: "E-mail de convite não chegou",
              steps: ["Verificar pasta de spam (90% resolve)", "Se não encontrar: Menu → Convites → Reenviar"],
            },
            {
              title: "Responsável quer pagar presencialmente",
              steps: ["Aceite o pagamento", "Menu → Cobranças → Localize → Marcar como pago"],
            },
            {
              title: "Lead duplicado na lista",
              steps: ["Converta o que tem mais dados", "Delete o duplicado: ··· → Deletar"],
            },
            {
              title: "Aluno que voltou após uma pausa",
              steps: ["O sistema detecta pelo CPF/e-mail", "Marcar 'Isentar Taxa' se já pagou antes"],
            },
          ].map(c => (
            <div key={c.title} className="p-3.5 bg-card border border-border rounded-xl space-y-2">
              <p className="font-bold text-foreground">{c.title}</p>
              <ol className="space-y-1 list-decimal pl-3.5 text-muted-foreground">
                {c.steps.map(s => <li key={s}>{s}</li>)}
              </ol>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
