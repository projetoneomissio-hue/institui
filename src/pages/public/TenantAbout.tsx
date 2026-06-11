import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Instagram, Youtube, Globe, Phone, Heart, Target, Eye, Star } from "lucide-react";
import { hexToHSL } from "@/utils/colors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicTenant, PublicTenant } from "@/contexts/PublicTenantContext";
import { SeoHead } from "@/components/SeoHead";

interface EquipeMembro {
    nome: string;
    cargo: string;
    bio?: string;
    foto_url?: string;
}

interface QuemSomosConfig {
    titulo?: string;
    subtitulo?: string;
    historia?: string;
    missao?: string;
    visao?: string;
    valores?: string;
    equipe?: EquipeMembro[];
    mostrar_nav?: boolean;
}

interface LandingConfig {
    quem_somos?: QuemSomosConfig;
}

async function fetchTenantBySlug(slug: string): Promise<PublicTenant | null> {
    const { data } = await supabase
        .from("unidades")
        .select("id, nome, slug, logo_url, custom_domain, whatsapp, instagram_url, cor_primaria, email_contato, tipo_instituicao, feature_flags, landing_config")
        .eq("slug", slug)
        .maybeSingle();
    return data ?? null;
}

const TenantAbout = () => {
    const { slug } = useParams<{ slug?: string }>();
    const { tenant: domainTenant, isCustomDomain, isLoading: domainLoading } = usePublicTenant();
    const { isAuthenticated } = useAuth();

    const [tenant, setTenant] = useState<PublicTenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        async function resolve() {
            setLoading(true);
            let resolved: PublicTenant | null = null;
            if (slug) {
                resolved = await fetchTenantBySlug(slug);
            } else if (isCustomDomain && !domainLoading) {
                resolved = domainTenant;
            }
            if (!resolved) { setNotFound(true); setLoading(false); return; }
            setTenant(resolved);
            setLoading(false);
        }
        if (!domainLoading) resolve();
    }, [slug, domainTenant, isCustomDomain, domainLoading]);

    useEffect(() => {
        if (tenant?.cor_primaria) {
            const hsl = hexToHSL(tenant.cor_primaria);
            document.documentElement.style.setProperty("--primary", hsl);
            document.documentElement.style.setProperty("--ring", hsl);
        }
        return () => {
            document.documentElement.style.removeProperty("--primary");
            document.documentElement.style.removeProperty("--ring");
        };
    }, [tenant?.cor_primaria]);

    if (loading || domainLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (notFound || !tenant) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
                <h1 className="text-3xl font-bold">Organização não encontrada</h1>
                <Button asChild variant="outline"><Link to="/">Voltar ao início</Link></Button>
            </div>
        );
    }

    const cfg = (tenant.landing_config || {}) as LandingConfig;
    const qs = cfg.quem_somos || {};
    const equipe = qs.equipe || [];
    const landingUrl = slug ? `/org/${slug}` : "/";

    const seoTitle = `Quem Somos — ${tenant.nome}`;
    const seoDesc = qs.subtitulo || `Conheça a história, missão e equipe da ${tenant.nome}.`;

    return (
        <div className="light min-h-screen bg-white text-gray-900">
            <SeoHead title={seoTitle} description={seoDesc} />

            {/* Banner preview admin */}
            {isAuthenticated && (
                <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 text-xs font-semibold flex items-center justify-between px-4 py-2 shadow-md">
                    <span>Modo Preview — Página Quem Somos</span>
                    <Link to="/direcao/landing" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
                        ← Voltar ao Editor
                    </Link>
                </div>
            )}

            {/* Nav */}
            <nav className={`fixed w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 ${isAuthenticated ? "top-8" : "top-0"}`}>
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <Link to={landingUrl} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        {tenant.logo_url ? (
                            <img src={tenant.logo_url} alt={tenant.nome} className="h-10 sm:h-12 w-auto object-contain" />
                        ) : (
                            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <span className="text-xl font-black text-primary">{tenant.nome.charAt(0)}</span>
                            </div>
                        )}
                        <span className="font-black text-xl tracking-tighter uppercase text-gray-900">{tenant.nome}</span>
                    </Link>
                    <div className="flex gap-3 items-center">
                        <Link to={landingUrl} className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-primary transition-colors">
                            <ArrowLeft className="h-3.5 w-3.5" /> Ver Atividades
                        </Link>
                        <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100">
                            Entrar
                        </Link>
                        <Button size="sm" asChild>
                            <Link to={`/matricula/${tenant.slug}`}>Fazer Inscrição</Link>
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero da página */}
            <section className="pt-28 pb-16 bg-gradient-to-br from-primary/8 via-white to-primary/4">
                <div className="container mx-auto px-4 max-w-3xl text-center space-y-4">
                    <Badge variant="outline">Quem Somos</Badge>
                    <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
                        {qs.titulo || `Conheça a ${tenant.nome}`}
                    </h1>
                    {qs.subtitulo && (
                        <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
                            {qs.subtitulo}
                        </p>
                    )}
                </div>
            </section>

            {/* Nossa História */}
            {qs.historia && (
                <section className="py-16">
                    <div className="container mx-auto px-4 max-w-3xl">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <span className="h-8 w-1 bg-primary rounded-full" />
                            Nossa História
                        </h2>
                        <div className="text-gray-600 leading-relaxed whitespace-pre-line text-base space-y-4">
                            {qs.historia}
                        </div>
                    </div>
                </section>
            )}

            {/* Missão / Visão / Valores */}
            {(qs.missao || qs.visao || qs.valores) && (
                <section className="py-16 bg-gray-50">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                            {qs.missao && (
                                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Target className="h-5 w-5 text-primary" />
                                    </div>
                                    <h3 className="font-bold text-lg">Missão</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{qs.missao}</p>
                                </div>
                            )}
                            {qs.visao && (
                                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Eye className="h-5 w-5 text-primary" />
                                    </div>
                                    <h3 className="font-bold text-lg">Visão</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">{qs.visao}</p>
                                </div>
                            )}
                            {qs.valores && (
                                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Heart className="h-5 w-5 text-primary" />
                                    </div>
                                    <h3 className="font-bold text-lg">Valores</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{qs.valores}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* Equipe */}
            {equipe.length > 0 && (
                <section className="py-16">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-12">
                            <Badge variant="outline" className="mb-4">Nossa Equipe</Badge>
                            <h2 className="text-3xl font-bold">As pessoas por trás da {tenant.nome}</h2>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-5xl mx-auto">
                            {equipe.map((membro, i) => (
                                <div key={i} className="text-center space-y-3 p-5 rounded-2xl border border-gray-100 bg-white hover:border-primary/30 hover:shadow-md transition-all">
                                    <div className="h-20 w-20 rounded-full mx-auto overflow-hidden bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                                        {membro.foto_url ? (
                                            <img src={membro.foto_url} alt={membro.nome} className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-2xl font-black text-primary uppercase">{membro.nome.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold">{membro.nome}</p>
                                        <p className="text-xs text-primary font-semibold uppercase tracking-wide">{membro.cargo}</p>
                                    </div>
                                    {membro.bio && (
                                        <p className="text-xs text-gray-500 leading-relaxed">{membro.bio}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Canais / CTA */}
            <section className="py-16 bg-gray-900 text-white">
                <div className="container mx-auto px-4 text-center max-w-xl space-y-6">
                    <h2 className="text-3xl font-bold">Conecte-se com a gente</h2>
                    <p className="text-gray-400">Siga nossas redes, mande uma mensagem ou venha conhecer pessoalmente.</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        {tenant.instagram_url && (
                            <Button variant="outline" className="gap-2 border-white/20 text-white bg-transparent hover:bg-white/10" asChild>
                                <a href={tenant.instagram_url.startsWith("http") ? tenant.instagram_url : `https://instagram.com/${tenant.instagram_url.replace("@","")}`} target="_blank" rel="noopener noreferrer">
                                    <Instagram className="h-4 w-4" /> Instagram
                                </a>
                            </Button>
                        )}
                        {tenant.whatsapp && (
                            <Button variant="outline" className="gap-2 border-white/20 text-white bg-transparent hover:bg-white/10" asChild>
                                <a href={`https://wa.me/${tenant.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer">
                                    <Phone className="h-4 w-4" /> WhatsApp
                                </a>
                            </Button>
                        )}
                        <Button className="gap-2" asChild>
                            <Link to={`/matricula/${tenant.slug}`}>Fazer Inscrição</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer mínimo */}
            <footer className="py-6 border-t text-center text-xs text-gray-400">
                <Link to={landingUrl} className="hover:text-primary transition-colors">
                    ← Voltar para {tenant.nome}
                </Link>
            </footer>
        </div>
    );
};

export default TenantAbout;
