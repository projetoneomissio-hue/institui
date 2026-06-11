import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type UserRole = "direcao" | "coordenacao" | "professor" | "responsavel" | "secretaria";

export const SUPER_ADMIN_EMAIL = "breno.albuquerque@gmail.com";

const ACTIVE_ROLE_KEY = "neo-missio-active-role";

interface User {
  id: string;
  name: string;
  email: string;
  /** @deprecated Use activeRole instead. Kept for backward compatibility. */
  role: UserRole;
  roles: UserRole[];
  activeRole: UserRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signup: (email: string, password: string, name: string, role: UserRole, inviteToken?: string, referralCode?: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  setActiveRole: (role: UserRole) => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeRoleOverride, setActiveRoleOverride] = useState<UserRole | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setIsAuthLoading(false);

        if (event === 'SIGNED_OUT') {
          queryClient.clear();
          localStorage.removeItem(ACTIVE_ROLE_KEY);
          setActiveRoleOverride(null);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          queryClient.invalidateQueries({ queryKey: ["user-profile"] });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["user-profile", session?.user?.id],
    enabled: !!session?.user,
    queryFn: async (): Promise<{ name: string; email: string; id: string; roles: UserRole[] } | null> => {
      const supabaseUser = session!.user;

      try {
        // Fetch profile and ALL roles in parallel
        const [profileRes, rolesRes] = await Promise.all([
          supabase.from("profiles").select("nome_completo").eq("id", supabaseUser.id).single(),
          supabase.from("user_roles").select("role").eq("user_id", supabaseUser.id)
        ]);

        if (profileRes.error || rolesRes.error) {
          console.error("Erro ao buscar dados do usuário:", profileRes.error || rolesRes.error);
          return null;
        }

        const roles = (rolesRes.data || []).map((r: any) => r.role as UserRole);

        return {
          id: supabaseUser.id,
          name: profileRes.data.nome_completo,
          email: supabaseUser.email || "",
          roles,
        };
      } catch (error) {
        console.error("Error in user queryFn:", error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos — permite refletir mudança de role sem logout
  });

  // Compute the final user object with activeRole
  const user: User | null = userProfile && userProfile.roles.length > 0
    ? (() => {
      const savedRole = localStorage.getItem(ACTIVE_ROLE_KEY) as UserRole | null;
      const activeRole = activeRoleOverride && userProfile.roles.includes(activeRoleOverride)
        ? activeRoleOverride
        : savedRole && userProfile.roles.includes(savedRole)
          ? savedRole
          : userProfile.roles[0];

      return {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        roles: userProfile.roles,
        activeRole,
        role: activeRole, // backward compat
      };
    })()
    : null;

  const setActiveRole = useCallback((role: UserRole) => {
    if (userProfile?.roles.includes(role)) {
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
      setActiveRoleOverride(role);
    }
  }, [userProfile?.roles]);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signup = async (email: string, password: string, name: string, role: UserRole, inviteToken?: string, referralCode?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome_completo: name,
            invite_token: inviteToken || null,
            referral_code: referralCode || null,
          },
        },
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    queryClient.clear();
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    setActiveRoleOverride(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        session,
        isSuperAdmin: user?.email === SUPER_ADMIN_EMAIL,
        login,
        signup,
        logout,
        setActiveRole,
        isAuthenticated: !!user,
        loading: isAuthLoading || (!!session?.user && isProfileLoading),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
