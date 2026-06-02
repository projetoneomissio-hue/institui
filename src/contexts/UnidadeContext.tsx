import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export interface Unidade {
    id: string;
    nome: string;
    slug: string;
    logo_url?: string;
    cnpj?: string;
    endereco?: string;
    bairro?: string;
    whatsapp?: string;
    instagram_url?: string;
    cor_primaria?: string;
    email_contato?: string;
}

interface UnidadeContextType {
    currentUnidade: Unidade | null;
    unidades: Unidade[];
    isLoading: boolean;
    switchUnidade: (unidadeId: string) => void;
    refreshUnidade: () => Promise<void>;
}

const UnidadeContext = createContext<UnidadeContextType | undefined>(undefined);

export const useUnidade = () => {
    const context = useContext(UnidadeContext);
    if (!context) {
        throw new Error("useUnidade must be used within UnidadeProvider");
    }
    return context;
};

export const UnidadeProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [currentUnidade, setCurrentUnidade] = useState<Unidade | null>(null);
    const [unidades, setUnidades] = useState<Unidade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchUnidades = async () => {
        if (!user) return;
        
        setIsLoading(true);
        try {
            // Busca as unidades vinculadas ao usuário
            const { data, error } = await supabase
                .from("user_unidades")
                .select(`
        unidade_id,
        unidade:unidades (
          id,
          nome,
          slug,
          logo_url,
          cnpj,
          endereco,
          bairro,
          whatsapp,
          instagram_url,
          cor_primaria,
          email_contato
        )
      `)
                .eq("user_id", user.id);

            if (error) throw error;

            // Formata o resultado (flat)
            const userUnidades = data
                .map((item: any) => item.unidade)
                .filter(Boolean) as Unidade[];

            setUnidades(userUnidades);

            // Tenta recuperar do localStorage ou define a primeira/matriz
            const storedId = localStorage.getItem("@zafen:unidade_id");
            const found = userUnidades.find((u) => u.id === storedId);

            if (found) {
                setCurrentUnidade(found);
            } else if (userUnidades.length > 0) {
                // Default: pega a primeira (geralmente Matriz se foi a inserida)
                const defaultUnidade = userUnidades[0];
                setCurrentUnidade(defaultUnidade);
                localStorage.setItem("@zafen:unidade_id", defaultUnidade.id);
            }
        } catch (error) {
            console.error("Erro ao buscar unidades:", error);
            toast({
                title: "Erro de Unidade",
                description: "Não foi possível carregar as escolas vinculadas.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!user) {
            setUnidades([]);
            setCurrentUnidade(null);
            setIsLoading(false);
            return;
        }

        fetchUnidades();
    }, [user]);

    const switchUnidade = (unidadeId: string) => {
        const target = unidades.find((u) => u.id === unidadeId);
        if (target) {
            setCurrentUnidade(target);
            localStorage.setItem("@zafen:unidade_id", target.id);
            
            // Limpa o cache para evitar que dados de uma unidade apareçam em outra
            queryClient.clear();

            toast({
                title: "Unidade Alterada",
                description: `Você agora está acessando: ${target.nome}`,
            });
        }
    };

    return (
        <UnidadeContext.Provider
            value={{
                currentUnidade,
                unidades,
                isLoading,
                switchUnidade,
                refreshUnidade: fetchUnidades,
            }}
        >
            {children}
        </UnidadeContext.Provider>
    );
};
