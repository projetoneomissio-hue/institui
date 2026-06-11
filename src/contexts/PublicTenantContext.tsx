import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PublicTenant {
    id: string;
    nome: string;
    slug: string;
    logo_url?: string;
    custom_domain?: string;
    whatsapp?: string;
    instagram_url?: string;
    cor_primaria?: string;
    email_contato?: string;
    tipo_instituicao?: string;
    feature_flags?: Record<string, boolean>;
    landing_config?: Record<string, any>;
}

interface PublicTenantContextType {
    tenant: PublicTenant | null;
    isLoading: boolean;
    isCustomDomain: boolean;
}

const PublicTenantContext = createContext<PublicTenantContextType>({
    tenant: null,
    isLoading: true,
    isCustomDomain: false,
});

export const usePublicTenant = () => useContext(PublicTenantContext);

// Domínios próprios do Institui — nesses, "/" é a landing da plataforma.
const INSTITUI_DOMAINS = [
    "institui.vercel.app",
    "institui.com.br",
    "www.institui.com.br",
    "localhost",
    "127.0.0.1",
];

function isInstituiDomain(hostname: string): boolean {
    return INSTITUI_DOMAINS.some(
        (d) => hostname === d || hostname.endsWith(`.${d}`)
    );
}

export const PublicTenantProvider = ({ children }: { children: ReactNode }) => {
    const [tenant, setTenant] = useState<PublicTenant | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCustomDomain, setIsCustomDomain] = useState(false);

    useEffect(() => {
        const hostname = window.location.hostname;

        if (isInstituiDomain(hostname)) {
            // Domínio Institui: sem tenant pré-resolvido (landing da plataforma ou /org/:slug)
            setIsLoading(false);
            return;
        }

        // Domínio customizado do cliente: resolver pelo custom_domain
        setIsCustomDomain(true);

        supabase
            .from("unidades")
            .select(
                "id, nome, slug, logo_url, custom_domain, whatsapp, instagram_url, cor_primaria, email_contato, tipo_instituicao, feature_flags, landing_config"
            )
            .eq("custom_domain", hostname)
            .maybeSingle()
            .then(({ data }) => {
                setTenant(data ?? null);
                setIsLoading(false);
            });
    }, []);

    return (
        <PublicTenantContext.Provider value={{ tenant, isLoading, isCustomDomain }}>
            {children}
        </PublicTenantContext.Provider>
    );
};
