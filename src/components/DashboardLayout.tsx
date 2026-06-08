import { useState, useEffect, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { cn } from "@/lib/utils";
import {
  Home,
  GraduationCap,
  Users,
  UserCircle,
  DollarSign,
  Building2,
  Settings,
  Menu,
  LogOut,
  FileText,
  UserCheck,
  Calendar,
  ClipboardList,
  TrendingUp,
  LayoutDashboard,
  Dumbbell,
  UserCog,
  AlertCircle,
  BarChart,
  Mail,
  CheckCircle2,
  Link as LinkIcon,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trophy,
  UserPlus,
  HelpCircle,
  MessageCircle,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useUnidade } from "@/contexts/UnidadeContext";
import { useAllFeatures, type FeatureKey } from "@/contexts/FeatureContext";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { UnidadeSwitcher } from "@/components/UnidadeSwitcher";
import { InstallPWA } from "@/components/InstallPWA";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProfileSwitcher } from "@/components/ProfileSwitcher";

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  search?: string;
  feature?: FeatureKey;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const getNavigationByRole = (role: string, features: Record<FeatureKey, boolean>): NavGroup[] => {
  const nav: Record<string, NavGroup[]> = {
    direcao: [
      {
        group: "Gestão",
        items: [
          { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ]
      },
      {
        group: "Acadêmico",
        items: [
          { name: "Atividades", href: "/atividades", icon: Dumbbell },
          { name: "Turmas", href: "/direcao/turmas", icon: Users },
          { name: "Matrículas", href: "/direcao/matriculas", icon: FileText },
          { name: "Interessados", href: "/direcao/interessados", icon: MessageCircle },
          { name: "Calendário", href: "/calendario", icon: Calendar, feature: "calendario" },
        ]
      },
      {
        group: "Pessoas",
        items: [
          { name: "Alunos", href: "/alunos", icon: Users },
          { name: "Professores", href: "/professores", icon: GraduationCap },
          { name: "Coordenadores", href: "/direcao/coordenadores", icon: UserCog },
          { name: "Usuários", href: "/direcao/usuarios", icon: UserCog },
          { name: "Convites", href: "/convites", icon: Mail },
          { name: "Pré-Cadastro", href: "/direcao/pre-cadastro", icon: UserPlus },
        ]
      },
      {
        group: "Operacional",
        items: [
          { name: "Cobranças", href: "/direcao/cobrancas", icon: DollarSign },
          { name: "Financeiro (Dash)", href: "/financeiro", icon: BarChart },
          { name: "Prédio", href: "/predio", icon: Building2, feature: "predio" },
        ]
      },
      {
        group: "Comunicação",
        items: [
          { name: "Comunicados", href: "/direcao/comunicados", icon: Megaphone },
          { name: "Notificações", href: "/coordenacao/notificacoes", icon: AlertCircle },
          { name: "Editor do Site", href: "/direcao/landing", icon: Globe, feature: "landing_publica" },
        ]
      },
      {
        group: "Suporte",
        items: [
          { name: "Central de Ajuda", href: "/ajuda", icon: HelpCircle },
        ]
      }
    ],
    coordenacao: [
      {
        group: "Gestão",
        items: [
          { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ]
      },
      {
        group: "Acadêmico",
        items: [
          { name: "Minhas Atividades", href: "/atividades", icon: Dumbbell },
          { name: "Turmas", href: "/coordenacao/turmas", icon: Users },
          { name: "Interessados", href: "/direcao/interessados", icon: MessageCircle },
          { name: "Alunos", href: "/alunos", icon: Users },
          { name: "Calendário", href: "/calendario", icon: Calendar, feature: "calendario" },
        ]
      },
      {
        group: "Operacional",
        items: [
          { name: "Voluntários", href: "/coordenacao/voluntarios", icon: UserCheck, feature: "voluntarios" },
        ]
      },
      {
        group: "Relatórios",
        items: [
          { name: "Notificações", href: "/coordenacao/notificacoes", icon: Mail },
          { name: "Relatórios", href: "/coordenacao/relatorios", icon: BarChart },
        ]
      },
      {
        group: "Suporte",
        items: [
          { name: "Central de Ajuda", href: "/ajuda", icon: HelpCircle },
        ]
      }
    ],
    professor: [
      {
        group: "Gestão",
        items: [
          { name: "Dashboard", href: "/professor/dashboard", icon: LayoutDashboard },
        ]
      },
      {
        group: "Acadêmico",
        items: [
          { name: "Minhas Turmas", href: "/professor/turmas", icon: Users },
          { name: "Grade de Notas", href: "/professor/turmas", icon: Trophy, search: "?mode=grade", feature: "academico" },
          { name: "Chamada / Frequência", href: "/professor/turmas", icon: FileText, search: "?mode=chamada", feature: "academico" },
          { name: "Meus Alunos", href: "/professor/alunos", icon: Users },
          { name: "Observações", href: "/professor/observacoes", icon: FileText },
        ]
      },
      {
        group: "Financeiro",
        items: [
          { name: "Comissões", href: "/professor/comissoes", icon: DollarSign, feature: "comissoes" },
        ]
      },
      {
        group: "Suporte",
        items: [
          { name: "Central de Ajuda", href: "/ajuda", icon: HelpCircle },
        ]
      }
    ],
    responsavel: [
      {
        group: "Gestão",
        items: [
          { name: "Dashboard", href: "/responsavel/dashboard", icon: LayoutDashboard },
        ]
      },
      {
        group: "Acadêmico",
        items: [
          { name: "Cadastrar Aluno", href: "/responsavel/cadastrar-aluno", icon: UserCircle },
          { name: "Nova Matrícula", href: "/responsavel/nova-matricula", icon: FileText },
          { name: "Atividades Matriculadas", href: "/responsavel/atividades-matriculadas", icon: Dumbbell },
          { name: "Anamnese", href: "/responsavel/anamnese", icon: FileText, feature: "saude" },
        ]
      },
      {
        group: "Financeiro",
        items: [
          { name: "Pagamentos", href: "/responsavel/pagamentos", icon: DollarSign },
          { name: "Registrar Pagamento", href: "/responsavel/registrar-pagamento", icon: CheckCircle2 },
        ]
      },
      {
        group: "Relatórios",
        items: [
          { name: "Relatórios do Aluno", href: "/responsavel/relatorios-aluno", icon: BarChart },
        ]
      },
      {
        group: "Suporte",
        items: [
          { name: "Central de Ajuda", href: "/ajuda", icon: HelpCircle },
        ]
      }
    ],
    secretaria: [
      {
        group: "Atendimento",
        items: [
          { name: "Dashboard", href: "/secretaria/dashboard", icon: LayoutDashboard },
          { name: "Cadastrar Aluno", href: "/secretaria/cadastrar-aluno", icon: UserCircle },
          { name: "Pré-Cadastro", href: "/secretaria/pre-cadastro", icon: UserPlus },
          { name: "Nova Matrícula", href: "/secretaria/nova-matricula", icon: FileText },
        ]
      },
      {
        group: "Consulta",
        items: [
          { name: "Alunos", href: "/secretaria/alunos", icon: Users },
        ]
      },
      {
        group: "Suporte",
        items: [
          { name: "Central de Ajuda", href: "/ajuda", icon: HelpCircle },
        ]
      }
    ]
  };

  const groups = nav[role] || [];
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.feature || features[item.feature]),
    }))
    .filter((group) => group.items.length > 0);
};

const getBottomNavItems = (role: string) => {
  const items: Record<string, any[]> = {
    direcao: [
      { name: "Início", href: "/dashboard", icon: LayoutDashboard },
      { name: "Alunos", href: "/alunos", icon: Users },
      { name: "Financeiro", href: "/financeiro", icon: BarChart },
    ],
    professor: [
      { name: "Início", href: "/professor/dashboard", icon: LayoutDashboard },
      { name: "Turmas", href: "/professor/turmas", icon: Users },
      { name: "Chamada", href: "/professor/turmas", icon: FileText, search: "?mode=chamada" },
    ],
    responsavel: [
      { name: "Início", href: "/responsavel/dashboard", icon: LayoutDashboard },
      { name: "Pagamentos", href: "/responsavel/pagamentos", icon: DollarSign },
      { name: "Matrículas", href: "/responsavel/atividades-matriculadas", icon: Dumbbell },
    ],
    secretaria: [
      { name: "Início", href: "/secretaria/dashboard", icon: LayoutDashboard },
      { name: "Alunos", href: "/secretaria/alunos", icon: Users },
      { name: "Novo Aluno", href: "/secretaria/cadastrar-aluno", icon: UserPlus },
    ],
    coordenacao: [
      { name: "Início", href: "/dashboard", icon: LayoutDashboard },
      { name: "Alunos", href: "/alunos", icon: Users },
      { name: "Turmas", href: "/coordenacao/turmas", icon: Users },
    ],
  };
  return items[role] || items.direcao;
};

const Sidebar = ({ isCollapsed, toggleCollapsed }: { isCollapsed: boolean; toggleCollapsed: () => void }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currentUnidade } = useUnidade();
  const navigate = useNavigate();
  const features = useAllFeatures();

  const navigation = user && user.activeRole ? getNavigationByRole(user.activeRole, features) : [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const unitName = currentUnidade?.nome || "Zafen";
  const unitInitial = unitName.charAt(0).toUpperCase();

  return (
    <div className={cn(
      "flex h-full flex-col bg-sidebar border-r border-sidebar-border transition-all duration-500 ease-in-out relative group",
      isCollapsed ? "w-20" : "w-72"
    )}>
      {/* Sidebar Pulse Indicator (Integrated) */}
      <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-primary/30 to-transparent group-hover:via-primary/60 transition-all duration-700" />

      {/* Header */}
      <div className={cn(
        "flex h-20 shrink-0 items-center border-b border-white/5 px-6 transition-all duration-500",
        isCollapsed ? "justify-center px-0" : "justify-between"
      )}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3 group/logo cursor-default flex-1 min-w-0">
            {currentUnidade?.logo_url ? (
              <img 
                src={currentUnidade.logo_url} 
                alt={unitName} 
                className="h-9 w-9 object-contain rounded-lg shadow-md group-hover/logo:scale-105 transition-all flex-shrink-0"
              />
            ) : (
              <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20 flex-shrink-0">
                <span className="text-white font-bold text-sm">{unitInitial}</span>
              </div>
            )}
            <h1 className="text-sm font-semibold text-foreground uppercase leading-tight whitespace-nowrap overflow-hidden pr-4 flex-1">
               {unitName}
            </h1>
          </div>
        ) : (
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 hover:scale-110 transition-all cursor-pointer">
            {currentUnidade?.logo_url ? (
              <img src={currentUnidade.logo_url} alt={unitName} className="h-6 w-6 object-contain" />
            ) : (
              <span className="text-white font-bold">{unitInitial}</span>
            )}
          </div>
        )}
      </div>

      <div className={cn("px-4 mt-6 flex flex-col gap-4 transition-all duration-500", isCollapsed && "px-2")}>
        <ProfileSwitcher isCollapsed={isCollapsed} />

        {!isCollapsed ? (
          <UnidadeSwitcher />
        ) : (
          <div className="flex justify-center">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-accent hover:text-accent-foreground">
                    <Building2 className="h-5 w-5 text-primary/70" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Unidades</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      <div className="relative flex flex-col flex-1 min-h-0 mt-6">
        {/* Fade indicator at bottom to signal more items */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background/80 to-transparent z-10" />
        <nav className="flex flex-1 flex-col px-4 overflow-y-auto custom-scrollbar pb-8">
          <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 3px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--primary) / 0.3); border-radius: 999px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: hsl(var(--primary) / 0.6); }
        `}</style>
          <TooltipProvider delayDuration={0}>
            <ul role="list" className="flex flex-1 flex-col gap-y-6">
              {navigation.map((group) => (
                <li key={group.group}>
                  {!isCollapsed && (
                    <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-2 opacity-60">
                      {group.group}
                    </h3>
                  )}
                  <ul className="space-y-1">
                    {group.items.map((item: any) => {
                      const isActive = location.pathname === item.href &&
                        location.search === (item.search || "");
                      return (
                        <li key={item.name}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                to={item.href + (item.search || "")}
                                className={cn(
                                  "group relative flex gap-x-3 rounded-xl p-2.5 transition-all duration-300",
                                  isActive
                                    ? "bg-primary/10 text-primary dark:bg-primary dark:text-white dark:shadow-[0_8px_16px_-4px_hsl(var(--primary)/0.4)]"
                                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                                  isCollapsed && "justify-center p-3"
                                )}
                              >
                                <item.icon className={cn(
                                  "shrink-0 transition-transform duration-300 group-hover:scale-110",
                                  isCollapsed ? "h-5 w-5" : "h-4 w-4",
                                  isActive ? "text-primary dark:text-white" : "text-primary/70"
                                )} />
                                {!isCollapsed && (
                                  <span className="text-xs font-semibold uppercase tracking-wide truncate">
                                    {item.name}
                                  </span>
                                )}
                                {isActive && !isCollapsed && (
                                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary dark:bg-white rounded-r-full dark:shadow-[0_0_10px_white]" />
                                )}
                              </Link>
                            </TooltipTrigger>
                            {isCollapsed && (
                              <TooltipContent side="right" className="font-semibold text-[10px] uppercase tracking-wide bg-primary text-white border-none">
                                {item.name}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </TooltipProvider>
        </nav>

        <div className={cn("p-4 mt-auto transition-all duration-500", isCollapsed && "p-2")}>
          <div className="space-y-4">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/configuracoes"
                    className={cn(
                      "group flex gap-x-3 rounded-xl p-2.5 text-xs font-semibold uppercase tracking-wide transition-all duration-300",
                      isCollapsed ? "justify-center" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                    )}
                  >
                    <Settings className={cn("shrink-0 text-primary/70", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                    {!isCollapsed && "Configurações"}
                  </Link>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">Configurações</TooltipContent>}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-x-3 rounded-xl p-2.5 text-xs font-semibold uppercase tracking-wide text-primary hover:bg-primary/10 hover:text-primary",
                      isCollapsed && "justify-center"
                    )}
                    onClick={handleLogout}
                  >
                    <LogOut className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                    {!isCollapsed && "Sair"}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">Sair</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className={cn("mt-4 transition-all duration-500", isCollapsed && "scale-0 h-0 overflow-hidden")}>
            <InstallPWA />
            <div className="mt-4 flex justify-center">
              <ModeToggle />
            </div>
          </div>
        </div>

        {/* Toggle Button (Desktop Only) */}
        <button
          onClick={toggleCollapsed}
          className="hidden lg:flex absolute -right-3 top-24 h-6 w-6 items-center justify-center rounded-full bg-primary text-white border border-white/20 shadow-lg hover:scale-110 transition-all z-[100]"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { currentUnidade } = useUnidade();
  const unitName = currentUnidade?.nome || "Zafen";

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const bottomNavItems = user && user.activeRole ? getBottomNavItems(user.activeRole) : [];

  return (
    <div className="flex h-screen bg-background overflow-hidden relative font-sans">
      <Helmet>
        <title>{unitName} | Zafen</title>
      </Helmet>
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-conhecimento/10 rounded-full blur-[100px] translate-x-1/4 translate-y-1/4 pointer-events-none" />

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex lg:flex-col transition-all duration-500 ease-in-out h-full z-50",
        isCollapsed ? "w-20" : "w-72"
      )}>
        <Sidebar isCollapsed={isCollapsed} toggleCollapsed={() => setIsCollapsed(!isCollapsed)} />
      </div>

      {/* Mobile Sidebar Trigger (Top Left) */}
      <div className="lg:hidden fixed top-4 left-4 z-[60]">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="glass rounded-xl shadow-lg border-white/20 hover:scale-110 active:scale-95 transition-all h-10 w-10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0 bg-transparent border-none shadow-none">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu de Navegação</SheetTitle>
              <SheetDescription>Acesso rápido às áreas do sistema</SheetDescription>
            </SheetHeader>
            <Sidebar isCollapsed={false} toggleCollapsed={() => { }} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-hidden relative">
        <div className={cn(
          "h-full overflow-y-auto bg-background/30 backdrop-blur-[2px] transition-all duration-300 hover:bg-background/20 scrollbar-hide pt-16 lg:pt-0",
          "pb-24 lg:pb-0" // Space for Bottom Nav
        )}>
          {children}
        </div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-2 pointer-events-none">
        <div className="mx-auto max-w-sm h-16 bg-background/95 backdrop-blur-2xl rounded-2xl border border-primary/20 shadow-[0_-8px_32px_-4px_rgba(0,0,0,0.5)] flex items-center justify-around pointer-events-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link 
                key={item.name} 
                to={item.href + (item.search || "")}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-300 relative",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-transform duration-300",
                  isActive && "scale-110 -translate-y-0.5"
                )} />
                <span className="text-[10px] font-semibold uppercase truncate max-w-full px-1">
                  {item.name}
                </span>
                {isActive && (
                  <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_hsl(var(--primary))]" />
                )}
              </Link>
            );
          })}
          
          {/* More Menu Toggle Button */}
          <button 
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-semibold uppercase">Mais</span>
          </button>
        </div>
      </div>
    </div>
  );
};
