/**
 * SECURITY DOCUMENTATION: Protected Route Component
 * ==================================================
 * 
 * ⚠️ CRITICAL: CLIENT-SIDE AUTHORIZATION IS FOR UX ONLY
 * 
 * This component provides CLIENT-SIDE route protection for user experience purposes.
 * It prevents users from seeing UI they shouldn't access and provides better UX
 * by redirecting unauthorized users.
 * 
 * HOWEVER, this is NOT a security measure. Client-side code can be bypassed.
 * 
 * ACTUAL SECURITY is enforced at the DATABASE level through:
 * 
 * 1. ROW LEVEL SECURITY (RLS) POLICIES
 *    - All tables have RLS enabled
 *    - Policies check user roles using has_role() function
 *    - Example: "Direção pode gerenciar alunos" policy
 *    - These policies CANNOT be bypassed by client manipulation
 * 
 * 2. SECURITY DEFINER FUNCTIONS
 *    - Functions like has_role() run with elevated privileges
 *    - They securely check user_roles table
 *    - Prevent recursive RLS policy issues
 * 
 * 3. DATABASE-LEVEL ROLE VALIDATION
 *    - User roles stored in user_roles table with RLS
 *    - Only 'direcao' can assign privileged roles
 *    - Public signup restricted to 'responsavel' role only
 * 
 * WHY WE NEED BOTH:
 * - Client-side (this file): Better UX, prevent UI flashing
 * - Server-side (RLS): Actual security, prevent data access
 * 
 * NEVER rely on this component for security decisions.
 * ALWAYS enforce authorization in RLS policies.
 * 
 * See also:
 * - src/hooks/useUserRole.tsx (client-side role checking)
 * - Database RLS policies in Supabase dashboard
 * - has_role() function in database
 */

import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useAllFeatures, FeatureKey } from "@/contexts/FeatureContext";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  allowedFeature?: FeatureKey;
  superAdminOnly?: boolean;
}

export const ProtectedRoute = ({ children, allowedRoles, allowedFeature, superAdminOnly }: ProtectedRouteProps) => {
  const { isAuthenticated, user, loading, isSuperAdmin } = useAuth();
  const features = useAllFeatures();

  // Aguarda session + perfil carregarem antes de decidir qualquer redirect
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // UX: Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // UX: Redirect to home if user doesn't have required role
  // NOTE: This is UX only. Real security is in RLS policies.
  // Check ALL assigned roles (not just activeRole) so multi-role users can access all their routes
  if (allowedRoles && user && !user.roles.some(r => allowedRoles.includes(r))) {
    return <Navigate to="/" replace />;
  }

  // Rotas exclusivas do super-admin (dono da plataforma Institui)
  if (superAdminOnly && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  // UX: Redirect to home if the feature module is disabled for this unit
  if (allowedFeature && !features[allowedFeature]) {
    return <Navigate to="/" replace />;
  }

  return <div className="humanized-theme contents">{children}</div>;
};
