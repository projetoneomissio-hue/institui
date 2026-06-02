import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    Building2,
    Users,
    GraduationCap,
    UserCircle,
    ClipboardList,
    ArrowLeftRight,
    ChevronDown,
    Check
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const roleConfig: Record<UserRole, { label: string; icon: typeof Building2; dashboardPath: string }> = {
    direcao: { label: "Direção", icon: Building2, dashboardPath: "/dashboard" },
    coordenacao: { label: "Coordenação", icon: Users, dashboardPath: "/dashboard" },
    professor: { label: "Professor", icon: GraduationCap, dashboardPath: "/dashboard" },
    responsavel: { label: "Responsável", icon: UserCircle, dashboardPath: "/responsavel/dashboard" },
    secretaria: { label: "Secretaria", icon: ClipboardList, dashboardPath: "/secretaria/dashboard" },
};

interface ProfileSwitcherProps {
    isCollapsed?: boolean;
}

export const ProfileSwitcher = ({ isCollapsed = false }: ProfileSwitcherProps) => {
    const { user, setActiveRole } = useAuth();
    const navigate = useNavigate();

    // Se não tiver usuário logado
    if (!user) return null;

    const activeConfig = roleConfig[user.activeRole];

    const handleSwitch = (role: string) => {
        const newRole = role as UserRole;
        if (newRole !== user.activeRole) {
            setActiveRole(newRole);
            const config = roleConfig[newRole];
            navigate(config.dashboardPath);
        }
    };

    if (isCollapsed) {
        return (
            <button
                onClick={() => {
                    const currentIndex = user.roles.indexOf(user.activeRole);
                    const nextIndex = (currentIndex + 1) % user.roles.length;
                    handleSwitch(user.roles[nextIndex]);
                }}
                className="flex items-center justify-center w-full p-2 rounded-xl bg-card border border-border/50 shadow-sm hover:scale-105 transition-all duration-300 group"
                title={`Trocar perfil (${activeConfig.label})`}
            >
                <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-[11px] uppercase shadow-sm group-hover:shadow-primary/20 transition-all">
                    {user.name?.[0] || "?"}
                </div>
            </button>
        );
    }

    // Se ele só tem 1 role, exibe só as info sem dropdown
    if (user.roles.length <= 1) {
        return (
            <div className="p-3 rounded-2xl bg-card border border-border/50 flex items-center gap-3 shadow-sm cursor-default">
                <div className="h-10 w-10 shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shadow-lg shadow-primary/20 uppercase">
                    {user.name?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-foreground truncate uppercase tracking-wide">{user.name}</p>
                    <p className="text-[9px] font-bold text-muted-foreground truncate uppercase opacity-70 mt-0.5">{activeConfig.label}</p>
                </div>
            </div>
        );
    }

    // Se tem mais de 1 role, exibe c/ dropdown
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="p-2.5 rounded-2xl bg-card border border-border/50 flex items-center gap-3 cursor-pointer hover:bg-accent hover:border-accent transition-all shadow-sm group outline-none">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shadow-lg shadow-primary/20 uppercase transition-transform group-hover:scale-105">
                        {user.name?.[0] || "?"}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col items-start text-left">
                        <p className="text-[11px] w-full font-bold text-foreground truncate uppercase tracking-wide leading-tight">{user.name}</p>
                        <p className="text-[9px] font-bold text-muted-foreground truncate uppercase flex items-center gap-1 mt-0.5">
                            <ArrowLeftRight className="h-3 w-3 inline text-primary/70" /> {activeConfig.label}
                        </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 opacity-50 group-hover:opacity-100 transition-transform" />
                </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-[240px] rounded-xl border border-border/50 bg-popover shadow-2xl p-2 mt-2" align="center" side="bottom">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">Alternar Visão</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />

                {user.roles.map((role) => {
                    const config = roleConfig[role];
                    const Icon = config.icon;
                    const isActive = role === user.activeRole;
                    return (
                        <DropdownMenuItem
                            key={role}
                            onClick={() => handleSwitch(role)}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-all outline-none mt-1",
                                isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 text-[11px] font-bold uppercase tracking-wide">
                                {config.label}
                            </div>
                            {isActive && <Check className="h-4 w-4 shrink-0" />}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
