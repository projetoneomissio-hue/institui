import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Users, Trophy, Sparkles, Building2,
  LayoutDashboard, CreditCard, GraduationCap, CheckSquare,
  Heart, BarChart3, Award, Calendar, MessageSquare, Globe,
  Shield, Smartphone, ChevronDown, Star, Check, Phone,
  MapPin, Clock, Zap, Lock,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { SeoHead } from "@/components/SeoHead";
import { useUTMTracking } from "@/hooks/useUTMTracking";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicTenant } from "@/contexts/PublicTenantContext";
import TenantLanding from "./public/TenantLanding";
import { cn } from "@/lib/utils";

// ── Dados ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: GraduationCap, title: "Matrículas Online", desc: "Formulário público com link direto. O aluno se cadastra e já entra no sistema automaticamente, aguardando aprovação." },
  { icon: CreditCard, title: "Controle Financeiro", desc: "Mensalidades, cobranças, histórico e relatórios. Integração com InfinitePay para boleto, Pix e cartão." },
  { icon: LayoutDashboard, title: "Multi-perfil", desc: "Direção, coordenação, professor, secretaria e responsável — cada um com seu painel personalizado." },
  { icon: CheckSquare, title: "Presença & Chamada", desc: "Registro de presença por turma e data. Histórico completo para gestão acadêmica e relatórios." },
  { icon: Heart, title: "Saúde & PNE/PCD", desc: "Anamnese dos participantes, laudos médicos, alergias e necessidades especiais com controle total." },
  { icon: BarChart3, title: "Relatórios de Impacto", desc: "Dashboard financeiro e social com métricas em tempo real: receita, inadimplência, ocupação e alunos ativos." },
  { icon: Users, title: "Gestão de Voluntários", desc: "Cadastro, controle de atuação e relatório de horas dos voluntários da sua organização." },
  { icon: Award, title: "Certificados", desc: "Emissão de certificados de participação e conclusão para alunos e voluntários." },
  { icon: Calendar, title: "Calendário Escolar", desc: "Eventos, feriados e datas importantes integrados ao sistema para toda a equipe." },
  { icon: Sparkles, title: "Landing Page Inclusa", desc: "Site público próprio, editável pelo gestor, com SEO configurado e formulário de inscrição embutido." },
  { icon: Globe, title: "Domínio Próprio", desc: "Cada organização opera no seu próprio subdomínio ou domínio customizado. Identidade 100% sua." },
  { icon: Shield, title: "Segurança de Dados", desc: "Row Level Security (RLS) garante isolamento total entre organizações. Dados nunca se misturam." },
];

const PERSONAS = [
  {
    emoji: "🏫",
    title: "Escolas e Cursinhos",
    desc: "Turmas, notas, presença e comunicados para alunos e responsáveis. Grade de avaliações e boletins.",
    features: ["Chamada digital", "Notas e boletins", "Portal do responsável", "Comunicados"],
  },
  {
    emoji: "🤝",
    title: "ONGs e Projetos Sociais",
    desc: "Gestão de beneficiários, voluntários, relatórios de impacto e vagas sociais com controle de vulnerabilidade.",
    features: ["Vagas sociais gratuitas", "Gestão de voluntários", "Anamnese / PNE", "Relatórios de impacto"],
  },
  {
    emoji: "🏃",
    title: "Centros Esportivos",
    desc: "Modalidades, matrículas, agenda de aulas, comissões de professores e controle de turmas por modalidade.",
    features: ["Modalidades e turmas", "Comissões automáticas", "Agenda de aulas", "Controle de vagas"],
  },
];

const STEPS = [
  { num: "01", title: "Crie sua organização", desc: "Cadastro em minutos. Configure nome, logo, cor da marca e domínio. Sem instalar nada." },
  { num: "02", title: "Importe ou cadastre alunos", desc: "Formulário público de matrícula ou importação manual. O aluno recebe acesso automático ao portal." },
  { num: "03", title: "Gerencie tudo em um lugar", desc: "Financeiro, presença, comunicados, relatórios — tudo no dashboard, acessível de qualquer dispositivo." },
];

const TESTIMONIALS = [
  {
    name: "Breno Andrade",
    role: "Diretor · Neo Missio CWB",
    text: "O Institui transformou como gerenciamos nossas atividades. Antes era planilha, agora tenho tudo num painel só. As matrículas online economizaram horas da equipe toda semana.",
    stars: 5,
  },
  {
    name: "Coordenadora de Projeto Social",
    role: "ONG · São Paulo, SP",
    text: "A funcionalidade de vagas sociais é exatamente o que precisávamos. Conseguimos controlar quem tem direito à gratuidade de forma organizada e transparente.",
    stars: 5,
  },
  {
    name: "Gestor de Centro Esportivo",
    role: "Academia · Curitiba, PR",
    text: "O controle de comissões dos professores era um pesadelo. Hoje é automático. O sistema paga junto com a gestão financeira e todos ficam satisfeitos.",
    stars: 5,
  },
];

const PRICING = [
  {
    name: "Social",
    badge: "ONGs & Projetos Sociais",
    price: "Gratuito",
    priceNote: "para organizações sem fins lucrativos",
    cta: "Falar pelo WhatsApp",
    ctaWhatsapp: true,
    highlight: false,
    features: [
      "Até 100 alunos/beneficiários",
      "Matrículas online",
      "Portal do responsável",
      "Presença e chamada",
      "Landing page pública",
      "1 unidade",
    ],
  },
  {
    name: "Profissional",
    badge: "Mais escolhido",
    price: "R$ 97",
    priceNote: "/mês por unidade",
    cta: "Começar agora",
    ctaWhatsapp: false,
    highlight: true,
    features: [
      "Alunos ilimitados",
      "Controle financeiro completo",
      "Integração InfinitePay",
      "Relatórios de impacto",
      "Saúde & PNE/PCD",
      "Domínio customizado",
      "Certificados",
      "Suporte prioritário",
    ],
  },
  {
    name: "Enterprise",
    badge: "Multi-unidade",
    price: "Sob consulta",
    priceNote: "para redes e franquias",
    cta: "Falar com especialista",
    ctaWhatsapp: true,
    highlight: false,
    features: [
      "Múltiplas unidades",
      "Dashboard consolidado",
      "White-label completo",
      "API de integração",
      "SLA garantido",
      "Implantação assistida",
    ],
  },
];

const FAQS = [
  {
    q: "Preciso instalar algum software?",
    a: "Não. O Institui roda 100% no navegador e também funciona como PWA — pode ser adicionado à tela inicial do celular como um app nativo.",
  },
  {
    q: "Posso usar meu próprio domínio?",
    a: "Sim. Cada organização pode ter seu subdomínio (suaorg.institui.com.br) ou apontar um domínio próprio. A landing page pública fica no seu endereço.",
  },
  {
    q: "Como funciona o controle financeiro?",
    a: "Você cadastra as mensalidades por aluno ou turma. O sistema integra com InfinitePay (boleto, Pix, cartão) e atualiza automaticamente o status dos pagamentos.",
  },
  {
    q: "Quantos usuários posso ter?",
    a: "Ilimitado. Você cria perfis para direção, coordenação, professores, secretaria e responsáveis — cada um vê apenas o que é relevante para seu papel.",
  },
  {
    q: "Os dados da minha organização ficam seguros?",
    a: "Sim. Usamos Row Level Security (RLS) no banco de dados, garantindo que os dados de cada organização são completamente isolados — nenhuma org acessa dados de outra.",
  },
  {
    q: "O plano Social é realmente gratuito para ONGs?",
    a: "Sim. Para organizações sem fins lucrativos comprovadas, o plano Social é gratuito. Entre em contato para validação e ativação.",
  },
];

const WHATSAPP_URL = "https://wa.me/5541984406992?text=" + encodeURIComponent("Olá! Tenho interesse no Institui para minha organização. Poderia me contar mais?");

// ── Componente ─────────────────────────────────────────────────────────────────

const Index = () => {
  useUTMTracking();
  const { isAuthenticated } = useAuth();
  const { isCustomDomain } = usePublicTenant();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  if (isCustomDomain) return <TenantLanding />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const PRODUCT_TABS = [
    {
      label: "Dashboard",
      color: "from-primary/80 to-primary",
      content: (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {["42 Alunos", "R$ 3.840", "0,9% Inadimp.", "89% Ocup."].map((s) => (
              <div key={s} className="bg-white/20 rounded-lg p-2 text-white text-xs font-bold text-center">{s}</div>
            ))}
          </div>
          <div className="bg-white/10 rounded-xl h-28 flex items-end gap-1 px-3 pb-3 pt-6">
            {[40, 65, 55, 80, 70, 90, 75].map((h, i) => (
              <div key={i} className="flex-1 bg-white/40 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/10 rounded-lg p-2 text-white text-xs">1 matrícula aguardando</div>
            <div className="bg-white/10 rounded-lg p-2 text-white text-xs">3 pagamentos vencidos</div>
          </div>
        </div>
      ),
    },
    {
      label: "Matrículas",
      color: "from-violet-500 to-indigo-600",
      content: (
        <div className="p-4 space-y-3">
          <div className="bg-white/20 rounded-lg p-3 text-white text-xs font-bold">MATRÍCULAS · 8 este mês</div>
          {["Ana Souza · Jiu-Jitsu · ✅ Aprovada", "Bruno Lima · Ballet · ⏳ Aguardando", "Carla Matos · Inglês · ✅ Aprovada"].map((r) => (
            <div key={r} className="bg-white/10 rounded-lg px-3 py-2 text-white text-xs">{r}</div>
          ))}
          <div className="bg-white/20 rounded-xl p-3 text-center text-white text-xs">+ Formulário público: /matricula/sua-org</div>
        </div>
      ),
    },
    {
      label: "Financeiro",
      color: "from-emerald-500 to-teal-600",
      content: (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {["Receita R$ 3.840", "Repasse R$ 2.100", "Inadimp. R$ 0"].map((s) => (
              <div key={s} className="bg-white/20 rounded-lg p-2 text-white text-xs font-bold text-center">{s}</div>
            ))}
          </div>
          {["Ana Souza · R$ 120 · Pago ✅", "Bruno Lima · R$ 120 · Pendente ⏳", "Carla Matos · R$ 60 · Pago ✅"].map((r) => (
            <div key={r} className="bg-white/10 rounded-lg px-3 py-2 text-white text-xs">{r}</div>
          ))}
        </div>
      ),
    },
    {
      label: "Portal Responsável",
      color: "from-amber-500 to-orange-600",
      content: (
        <div className="p-4 space-y-3">
          <div className="bg-white/20 rounded-lg p-3 text-white text-sm font-bold">Olá, José! 👋</div>
          <div className="grid grid-cols-2 gap-2">
            {["Ana · Jiu-Jitsu · ✅", "Pedro · Ballet · ✅"].map((s) => (
              <div key={s} className="bg-white/20 rounded-lg p-2 text-white text-xs font-bold text-center">{s}</div>
            ))}
          </div>
          <div className="bg-white/10 rounded-lg px-3 py-2 text-white text-xs">Próxima mensalidade: 15/07 · R$ 120</div>
          <div className="bg-white/10 rounded-lg px-3 py-2 text-white text-xs">Presença este mês: 92% ✨</div>
        </div>
      ),
    },
  ];

  return (
    <div className="light min-h-screen bg-white text-gray-900">
      <SeoHead
        title="Institui — Gestão para Organizações Sociais"
        description="Sistema completo de gestão para escolas, ONGs e organizações educacionais. Matrículas, financeiro, presença e portal do responsável em um só lugar."
      />

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full bg-background/95 backdrop-blur-sm border-b border-border z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo-institui.png" alt="Institui" className="h-14 w-auto object-contain" />
          </div>
          <div className="flex gap-6 items-center">
            <a href="#funcionalidades" className="hidden sm:inline text-sm font-medium hover:text-primary transition-colors">Funcionalidades</a>
            <a href="#para-quem" className="hidden md:inline text-sm font-medium hover:text-primary transition-colors">Para quem é</a>
            <a href="#precos" className="hidden md:inline text-sm font-medium hover:text-primary transition-colors">Preços</a>
            <Button size="sm" asChild>
              <Link to="/login">Acessar Sistema</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-violet-500/5" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="w-fit gap-1.5" variant="secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block" />
                Multi-tenant · White-label · PWA
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Gestão completa para
                <span className="text-primary"> sua organização</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                Escolas, ONGs e centros esportivos. Matrículas online, controle financeiro, presença,
                portal do responsável e muito mais — no seu próprio domínio.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Button size="lg" className="gap-2 shadow-lg shadow-primary/20" asChild>
                  <Link to="/login">Acessar Sistema <ArrowRight className="h-5 w-5" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2" asChild>
                  <Link to="/org/neo-missio">Ver Demonstração</Link>
                </Button>
                <Button size="lg" variant="ghost" className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50" asChild>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                    <Phone className="h-5 w-5" /> WhatsApp
                  </a>
                </Button>
              </div>
            </div>

            {/* Product preview mockup */}
            <div className="hidden lg:block">
              <div className="rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
                {/* Browser chrome */}
                <div className="bg-muted/60 px-4 py-2.5 flex items-center gap-2 border-b border-border/50">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
                    suaorg.institui.com.br
                  </div>
                </div>
                {/* Tabs */}
                <div className="flex border-b border-border/50 bg-muted/30">
                  {PRODUCT_TABS.map((tab, i) => (
                    <button
                      key={tab.label}
                      onClick={() => setActiveTab(i)}
                      className={cn(
                        "flex-1 text-xs py-2 font-medium transition-colors",
                        activeTab === i ? "text-primary border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {/* Content */}
                <div className={cn("bg-gradient-to-br h-56", PRODUCT_TABS[activeTab].color)}>
                  {PRODUCT_TABS[activeTab].content}
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2 opacity-60">
                {/* TODO: substituir por screenshot real do sistema */}
                Prévia interativa — dados fictícios para demonstração
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section className="py-10 bg-foreground text-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "12+", label: "Organizações ativas" },
              { value: "800+", label: "Alunos gerenciados" },
              { value: "R$ 40k+", label: "Em mensalidades/mês" },
              { value: "99.9%", label: "Disponibilidade" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-black text-primary">{value}</p>
                <p className="text-sm opacity-70 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features completo ─────────────────────────────────────────────── */}
      <section id="funcionalidades" className="py-20 bg-muted/20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4">Funcionalidades</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">Tudo que sua organização precisa</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              12 módulos integrados. Sem precisar de sistemas separados para cada área.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 rounded-2xl bg-background border border-border/50 hover:border-primary/40 hover:shadow-md transition-all duration-300 space-y-3 group">
                <div className="h-11 w-11 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ─────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4">Como funciona</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">Do zero ao operacional em minutos</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
            <div className="hidden md:block absolute top-8 left-1/3 right-1/3 h-px bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20" />
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="text-center space-y-4 relative">
                <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                  {num}
                </div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button size="lg" className="gap-2 shadow-lg shadow-primary/20" asChild>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <Phone className="h-5 w-5" /> Falar com especialista
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Para quem é ───────────────────────────────────────────────────── */}
      <section id="para-quem" className="py-20 bg-muted/20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4">Para quem é</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">Feito para organizações com propósito</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Adaptado para a realidade de cada tipo de organização social e educacional do Brasil.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PERSONAS.map(({ emoji, title, desc, features }) => (
              <div key={title} className="p-7 rounded-2xl border border-border/50 bg-background hover:border-primary/40 hover:shadow-lg transition-all duration-300 space-y-4">
                <span className="text-5xl">{emoji}</span>
                <h3 className="font-bold text-xl">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                <ul className="space-y-2 pt-2 border-t border-border/40">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Depoimentos ───────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4">Depoimentos</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">Quem já usa, aprova</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, text, stars }) => (
              <div key={name} className="p-6 rounded-2xl border border-border/50 bg-background space-y-4 hover:border-primary/30 hover:shadow-md transition-all">
                <div className="flex gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic">"{text}"</p>
                <div className="pt-2 border-t border-border/40">
                  <p className="font-bold text-sm">{name}</p>
                  <p className="text-xs text-muted-foreground">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Preços ────────────────────────────────────────────────────────── */}
      <section id="precos" className="py-20 bg-muted/20 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4">Preços</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">Planos para cada tamanho</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Sem taxa de setup. Sem contrato de fidelidade. Cancele quando quiser.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PRICING.map(({ name, badge, price, priceNote, cta, ctaWhatsapp, highlight, features }) => (
              <div
                key={name}
                className={cn(
                  "rounded-2xl p-7 space-y-6 border transition-all",
                  highlight
                    ? "border-primary bg-primary text-primary-foreground shadow-2xl shadow-primary/30 scale-[1.03]"
                    : "border-border/50 bg-background hover:border-primary/30 hover:shadow-md"
                )}
              >
                <div>
                  <Badge
                    variant={highlight ? "secondary" : "outline"}
                    className={cn("mb-3 text-[10px]", highlight && "bg-white/20 text-white border-white/20")}
                  >
                    {badge}
                  </Badge>
                  <h3 className="font-black text-2xl">{name}</h3>
                  <div className="mt-3">
                    <span className="text-3xl font-black">{price}</span>
                    <span className={cn("text-xs ml-2", highlight ? "opacity-70" : "text-muted-foreground")}>{priceNote}</span>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className={cn("h-4 w-4 shrink-0 mt-0.5", highlight ? "text-white" : "text-primary")} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="lg"
                  className={cn(
                    "w-full gap-2",
                    highlight ? "bg-white text-primary hover:bg-white/90" : ""
                  )}
                  variant={highlight ? "default" : "outline"}
                  asChild
                >
                  {ctaWhatsapp ? (
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                      <Phone className="h-4 w-4" /> {cta}
                    </a>
                  ) : (
                    <Link to="/login">{cta} <ArrowRight className="h-4 w-4" /></Link>
                  )}
                </Button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8 opacity-60">
            * Preços podem variar. Fale conosco para condições especiais para ONGs e projetos sociais.
          </p>
        </div>
      </section>

      {/* ── Diferenciais ──────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Smartphone, title: "Funciona no celular como app", desc: "PWA instalável: sem precisar de App Store. Alunos, responsáveis e gestores acessam de qualquer dispositivo." },
              { icon: Lock, title: "Dados isolados e seguros", desc: "Arquitetura multi-tenant com Row Level Security. Cada organização tem seu silo de dados. Nenhum dado vaza entre clientes." },
              { icon: Zap, title: "Deploy em menos de 1 hora", desc: "Do cadastro até o sistema operacional em menos de 60 minutos. Sem necessidade de TI ou consultoria." },
              { icon: MapPin, title: "Feito para o Brasil", desc: "CPF, CNPJ, Pix, boleto, notas fiscais, LGPD. Tudo pensado para a realidade jurídica e financeira brasileira." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-5 p-6 rounded-2xl border border-border/50 bg-background hover:border-primary/30 transition-all">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">Perguntas frequentes</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }, i) => (
              <div key={i} className="rounded-2xl border border-border/50 bg-background overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="font-semibold text-sm pr-4">{q}</span>
                  <ChevronDown className={cn("h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300", openFaq === i && "rotate-180")} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-4">
                    {a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-foreground text-background">
        <div className="container mx-auto px-4 text-center max-w-2xl space-y-6">
          <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
            <Clock className="h-3 w-3 mr-1" /> Implantação em menos de 1 hora
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-black leading-tight">
            Pronto para transformar sua gestão?
          </h2>
          <p className="text-lg opacity-70 leading-relaxed">
            Mais de 12 organizações já usam o Institui. Comece hoje, sem contrato e sem taxa de setup.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30" asChild>
              <Link to="/login">Acessar Sistema <ArrowRight className="h-5 w-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10 bg-transparent" asChild>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <Phone className="h-5 w-5" /> Falar pelo WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-10 border-t bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center">
              <img src="/logo-institui.png" alt="Institui" className="h-8 w-auto object-contain" />
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#funcionalidades" className="hover:text-primary transition-colors">Funcionalidades</a>
              <a href="#para-quem" className="hover:text-primary transition-colors">Para quem é</a>
              <a href="#precos" className="hover:text-primary transition-colors">Preços</a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Contato</a>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Institui. Sistema de gestão para organizações sociais.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
