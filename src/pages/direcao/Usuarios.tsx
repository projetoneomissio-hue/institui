import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/utils/error-handler";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, UserCog } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

type AppRole = "direcao" | "coordenacao" | "professor" | "responsavel" | "secretaria";

interface UserData {
  id: string;
  name: string;
  email: string;
  roles: AppRole[];
}

const roleLabels: Record<AppRole, string> = {
  direcao: "Direção",
  coordenacao: "Coordenação",
  professor: "Professor",
  responsavel: "Responsável",
  secretaria: "Secretaria",
};

const allRoles: AppRole[] = ["direcao", "coordenacao", "professor", "responsavel", "secretaria"];

const Usuarios = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          nome_completo,
          email,
          user_roles (role)
        `);

      if (error) throw error;

      return (data || []).map((u: any) => ({
        id: u.id,
        name: u.nome_completo,
        email: u.email,
        roles: (u.user_roles || []).map((r: any) => r.role as AppRole),
      })) as UserData[];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRoles, oldRoles }: { userId: string; newRoles: AppRole[], oldRoles: AppRole[] }) => {
      if (newRoles.length === 0) {
        throw new Error("O usuário deve ter pelo menos um papel de acesso.");
      }

      const rolesToAdd = newRoles.filter(r => !oldRoles.includes(r));
      const rolesToRemove = oldRoles.filter(r => !newRoles.includes(r));

      if (rolesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .in("role", rolesToRemove);

        if (deleteError) throw deleteError;
      }

      if (rolesToAdd.length > 0) {
        const insertData = rolesToAdd.map(role => ({ user_id: userId, role }));
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(insertData);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({
        title: "Sucesso",
        description: "Papéis do usuário atualizados com sucesso.",
      });
    },
    onError: (error) => {
      handleError(error, "Erro ao atualizar papéis");
    },
  });

  const handleRoleToggle = (user: UserData, role: AppRole, isChecked: boolean) => {
    let newRoles = [...user.roles];

    if (isChecked && !newRoles.includes(role)) {
      newRoles.push(role);
    } else if (!isChecked && newRoles.includes(role)) {
      newRoles = newRoles.filter(r => r !== role);
    }

    if (newRoles.length === 0) {
      toast({
        title: "Operação não permitida",
        description: "Um usuário não pode ficar sem nenhum papel de acesso.",
        variant: "destructive"
      });
      return;
    }

    updateRoleMutation.mutate({
      userId: user.id,
      newRoles,
      oldRoles: user.roles
    });
  };

  const filteredUsers = usuarios?.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Gerenciar Usuários
            </h1>
            <p className="text-muted-foreground mt-1">
              Controle de níveis de acesso e permissões do sistema
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-card p-4 rounded-lg border shadow-sm">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-none focus-visible:ring-0"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Usuários Registrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 border rounded-lg flex flex-col gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-8 w-full max-w-md" />
                  </div>
                ))}
              </div>
            ) : !filteredUsers || filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <UserCog className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">
                  Nenhum usuário encontrado para "{searchTerm}"
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col md:flex-row md:items-start justify-between p-5 border rounded-xl hover:bg-accent/5 transition-colors gap-6"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-lg">{user.name}</h3>
                        <div className="flex gap-1.5 flex-wrap">
                          {user.roles.length === 0 ? (
                            <Badge variant="destructive">Sem Acesso</Badge>
                          ) : (
                            user.roles.map(role => (
                              <Badge key={`badge-${role}`} variant="secondary" className="text-[10px] uppercase tracking-wide font-medium">
                                {roleLabels[role]}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px] p-4 bg-muted/30 rounded-lg border border-border">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Papéis Atribuídos</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {allRoles.map(role => (
                          <div key={`check-${role}`} className="flex items-center space-x-2">
                            <Checkbox
                              id={`role-${user.id}-${role}`}
                              checked={user.roles.includes(role)}
                              onCheckedChange={(checked) => handleRoleToggle(user, role, checked === true)}
                              disabled={updateRoleMutation.isPending}
                            />
                            <label
                              htmlFor={`role-${user.id}-${role}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {roleLabels[role]}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Usuarios;
