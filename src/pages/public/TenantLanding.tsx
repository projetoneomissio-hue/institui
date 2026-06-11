import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, Trophy, Star, Loader2, Quote } from "lucide-react";
import posthog from "posthog-js";
import { hexToHSL } from "@/utils/colors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicTenant, PublicTenant } from "@/contexts/PublicTenantContext";
import { SeoHead } from "@/components/SeoHead";
import { ActivitiesSection } from "@/components/landing/ActivitiesSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { activities as staticActivities, getIconByName, ActivityItem } from "@/data/landing-data";

interface LandingConfig {
    hero?: {
        headline?: string;
        subtitulo?: string;
        badge_texto?: string;
        cta_texto?: string;
        bg_image_url?: string;
    };
    sobre?: {
        titulo?: string;
        texto?: string;
        imagem_url?: string;
    };
    depoimentos?: Array<{ nome: string; texto: string; foto_url?: string }>;
    galeria?: string[];
    secoes_ativas?: {
        sobre?: boolean;
        depoimentos?: boolean;
        galeria?: boolean;
    };
    secao_atividades?: {
        titulo?: string;
        subtitulo?: string;
    };
}

// ── Resolução por slug (rota /org/:slug) ─────────────────────────────────────

async function fetchTenantBySlug(slug: string): Promise<PublicTenant | null> {
    const { data } = await supabase
        .from("unidades")
        .select(
            "id, nome, slug, logo_url, custom_domain, whatsapp, instagram_url, cor_primaria, email_contato, tipo_instituicao, feature_flags, landing_config"
        )
        .eq("slug", slug)
        .maybeSingle();
    return data ?? null;
}

async function fetchActivities(unidadeId: string): Promise<ActivityItem[]> {
    const { data } = await supabase
        .from("landing_atividades" as any)
        .select("*")
        .eq("unidade_id", unidadeId)
        .eq("ativo", true)
        .order("ordem", { ascending: true });

    if (!data?.length) return staticActivities;

    return data.map((a: any) => ({
        id: a.id,
        title: a.titulo,
        description: a.descricao || "",
        price: a.preco || "",
        priceNote: a.preco_nota || undefined,
        frequency: a.frequencia || "",
        schedule: a.horario || "",
        targetAudience: a.publico_alvo || "",
        note: a.nota || undefined,
        image: a.imagem_url || "",
        icon: getIconByName(a.icone),
        gradient: a.gradiente || "from-blue-500 to-cyan-500",
        waitlist: a.lista_espera || false,
        free: a.gratuito || false,
    }));
}

// ── Componente ────────────────────────────────────────────────────────────────

const TenantLanding = () => {
    const { slug } = useParams<{ slug?: string }>();
    const { tenant: domainTenant, isCustomDomain, isLoading: domainLoading } = usePublicTenant();
    const { isAuthenticated } = useAuth();

    const [tenant, setTenant] = useState<PublicTenant | null>(null);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
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

            if (!resolved) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            const acts = await fetchActivities(resolved.id);
            setTenant(resolved);
            setActivities(acts);
            setLoading(false);
        }

        if (!domainLoading) resolve();
    }, [slug, domainTenant, isCustomDomain, domainLoading]);

    useEffect(() => {
        if (tenant) {
            posthog.capture("landing_page_viewed", {
                tenant_slug: tenant.slug,
                tenant_nome: tenant.nome,
            });
        }
    }, [tenant?.id]);

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
                <p className="text-muted-foreground">O endereço acessado não corresponde a nenhuma organização cadastrada.</p>
                <Button asChild variant="outline">
                    <Link to="/">Voltar ao início</Link>
                </Button>
            </div>
        );
    }

    const cfg = (tenant.landing_config || {}) as LandingConfig;
    const hero = cfg.hero || {};
    const sobre = cfg.sobre || {};
    const depoimentos = cfg.depoimentos || [];
    const galeria = cfg.galeria || [];
    const secoes = cfg.secoes_ativas || {};
    const secaoAtividades = cfg.secao_atividades || {};

    const whatsappNumber = (tenant.whatsapp || "").replace(/\D/g, "");
    const heroHeadline = hero.headline || `Bem-vindo à ${tenant.nome}`;
    const heroSubtitulo = hero.subtitulo || "Conheça nossas atividades e faça sua inscrição online. Vagas limitadas.";
    const heroBadge = hero.badge_texto || "Inscrições Abertas";
    const heroCta = hero.cta_texto || "Ver Atividades";

    const activityNames = activities.slice(0, 4).map((a) => a.title).join(", ");
    const seoTitle = `${tenant.nome} — Atividades | Inscrições Abertas`;
    const seoDescription = activityNames
        ? `${tenant.nome} oferece ${activityNames} e mais. Inscrições abertas, vagas limitadas. Faça sua inscrição online.`
        : `Conheça as atividades e serviços de ${tenant.nome}. Inscrições abertas. Vagas limitadas.`;

    return (
        <div className="light min-h-screen bg-white text-gray-900">
            <SeoHead title={seoTitle} description={seoDescription} />

            {/* Banner de preview para admins autenticados */}
            {isAuthenticated && (
                <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 text-xs font-semibold flex items-center justify-between px-4 py-2 shadow-md">
                    <span>Modo Preview — você está vendo o site público como visitante</span>
                    <Link to="/direcao/landing" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
                        ← Voltar ao Editor
                    </Link>
                </div>
            )}

            {/* Nav */}
            <nav className={`fixed w-full bg-background/95 backdrop-blur-sm border-b border-border z-50 ${isAuthenticated ? "top-8" : "top-0"}`}>
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {tenant.logo_url ? (
                            <img src={tenant.logo_url} alt={tenant.nome} className="h-10 sm:h-12 w-auto object-contain" />
                        ) : (
                            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <span className="text-xl font-black text-primary">{tenant.nome.charAt(0)}</span>
                            </div>
                        )}
                        <span className="font-black text-xl tracking-tighter uppercase">{tenant.nome}</span>
                    </div>
                    <div className="flex gap-4 items-center">
                        <a href="#atividades" className="text-sm font-medium hover:text-primary transition-colors">
                            Atividades
                        </a>
                        <Button size="sm" asChild>
                            <Link to={`/matricula/${tenant.slug}`}>Fazer Inscrição</Link>
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative pt-24 pb-20 overflow-hidden">
                {hero.bg_image_url ? (
                    <>
                        <div className="absolute inset-0">
                            <img src={hero.bg_image_url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50" />
                        </div>
                        <div className="container mx-auto px-4 relative z-10 text-white">
                            <div className="max-w-2xl space-y-6">
                                <Badge className="w-fit gap-1.5 bg-white/20 text-white border-white/30">
                                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse inline-block" />
                                    {heroBadge}
                                </Badge>
                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                                    {heroHeadline}
                                </h1>
                                <p className="text-lg text-white/80">{heroSubtitulo}</p>
                                <div className="flex flex-wrap gap-4">
                                    <a href="#atividades">
                                        <Button size="lg" className="gap-2 bg-white text-gray-900 hover:bg-white/90 shadow-lg">
                                            {heroCta}
                                            <ArrowRight className="h-5 w-5" />
                                        </Button>
                                    </a>
                                    {whatsappNumber && (
                                        <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Vi as atividades da ${tenant.nome} e gostaria de saber sobre as vagas disponíveis.`)}`} target="_blank" rel="noopener noreferrer">
                                            <Button size="lg" variant="outline" className="gap-2 border-white/50 text-white bg-transparent hover:bg-white/10">
                                                Falar no WhatsApp
                                            </Button>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
                        <div className="container mx-auto px-4 relative z-10">
                            <div className="max-w-2xl space-y-6">
                                <Badge className="w-fit gap-1.5" variant="secondary">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block" />
                                    {heroBadge}
                                </Badge>
                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                                    {heroHeadline.includes(tenant.nome) ? (
                                        <>
                                            {heroHeadline.replace(tenant.nome, "").trim() || "Bem-vindo à"}
                                            <span className="text-primary"> {tenant.nome}</span>
                                        </>
                                    ) : (
                                        <span>{heroHeadline}</span>
                                    )}
                                </h1>
                                <p className="text-lg text-muted-foreground">{heroSubtitulo}</p>

                                <div className="flex flex-wrap gap-6 pt-2">
                                    {[
                                        { icon: Trophy, value: String(activities.length), label: activities.length === 1 ? "atividade" : "atividades" },
                                        { icon: Users, value: "Vagas", label: "abertas" },
                                        { icon: Star, value: "100%", label: "online" },
                                    ].map(({ icon: Icon, value, label }) => (
                                        <div key={label} className="flex items-center gap-2">
                                            <Icon className="h-4 w-4 text-primary" />
                                            <span className="font-black text-foreground">{value}</span>
                                            <span className="text-sm text-muted-foreground">{label}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <a href="#atividades">
                                        <Button size="lg" className="gap-2 shadow-lg shadow-primary/20">
                                            {heroCta}
                                            <ArrowRight className="h-5 w-5" />
                                        </Button>
                                    </a>
                                    {whatsappNumber && (
                                        <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Vi as atividades da ${tenant.nome} e gostaria de saber sobre as vagas disponíveis.`)}`} target="_blank" rel="noopener noreferrer">
                                            <Button size="lg" variant="outline" className="gap-2">
                                                Falar no WhatsApp
                                            </Button>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {/* Activities */}
            <ActivitiesSection
                activities={activities}
                slug={tenant.slug}
                whatsapp={tenant.whatsapp}
                titulo={secaoAtividades.titulo}
                subtitulo={secaoAtividades.subtitulo}
                unidadeId={tenant.id}
                tenantNome={tenant.nome}
            />

            {/* Sobre Nós — depois das atividades: apresenta o produto primeiro, a história depois */}
            {secoes.sobre && (sobre.texto || sobre.imagem_url) && (
                <section className="py-20 bg-muted/20">
                    <div className="container mx-auto px-4">
                        {sobre.imagem_url && sobre.texto ? (
                            /* imagem + texto: 50/50, imagem com altura flexível */
                            <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-stretch">
                                <div className="relative rounded-2xl overflow-hidden min-h-[300px] lg:min-h-[400px]">
                                    <img
                                        src={sobre.imagem_url}
                                        alt="Sobre nós"
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex flex-col justify-center space-y-5 py-4">
                                    <div>
                                        <h2 className="text-3xl lg:text-4xl font-bold">{sobre.titulo || "Quem Somos"}</h2>
                                        <div className="w-10 h-1 bg-primary rounded-full mt-3" />
                                    </div>
                                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line lg:text-lg">{sobre.texto}</p>
                                </div>
                            </div>
                        ) : sobre.imagem_url ? (
                            /* só imagem: full-width com título sobreposto na parte de baixo */
                            <div className="max-w-4xl mx-auto space-y-4">
                                <div className="relative rounded-2xl overflow-hidden aspect-video">
                                    <img src={sobre.imagem_url} alt="Sobre nós" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                    <div className="absolute bottom-6 left-8">
                                        <h2 className="text-3xl font-bold text-white">{sobre.titulo || "Quem Somos"}</h2>
                                        <div className="w-10 h-1 bg-primary rounded-full mt-2" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* só texto */
                            <div className="max-w-2xl mx-auto space-y-4">
                                <h2 className="text-3xl font-bold">{sobre.titulo || "Quem Somos"}</h2>
                                <div className="w-10 h-1 bg-primary rounded-full" />
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-lg">{sobre.texto}</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Depoimentos */}
            {secoes.depoimentos && depoimentos.length > 0 && (
                <section className="py-16 bg-muted/30">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-bold text-center mb-3">O que dizem nossos alunos</h2>
                        <p className="text-center text-muted-foreground mb-10">Histórias reais de quem já faz parte da nossa comunidade</p>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            {depoimentos.map((d, i) => (
                                <div key={i} className="bg-card rounded-2xl p-6 border shadow-sm">
                                    <Quote className="h-6 w-6 text-primary/30 mb-3" />
                                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">"{d.texto}"</p>
                                    <div className="flex items-center gap-3">
                                        {d.foto_url ? (
                                            <img src={d.foto_url} alt={d.nome} className="h-10 w-10 rounded-full object-cover" />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <span className="font-bold text-primary text-sm">{d.nome.charAt(0)}</span>
                                            </div>
                                        )}
                                        <span className="font-semibold text-sm">{d.nome}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Galeria */}
            {secoes.galeria && galeria.length > 0 && (
                <section className="py-16">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-bold text-center mb-10">Galeria</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-4xl mx-auto">
                            {galeria.map((url, i) => (
                                <img
                                    key={i}
                                    src={url}
                                    alt={`Galeria ${i + 1}`}
                                    className="w-full aspect-square object-cover rounded-xl"
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Final CTA */}
            <section className="py-20 bg-gradient-to-br from-primary to-primary/80 text-white">
                <div className="container mx-auto px-4 text-center space-y-6">
                    <h2 className="text-3xl sm:text-4xl font-bold">Pronto para começar?</h2>
                    <p className="text-white/80 max-w-xl mx-auto text-lg">
                        Faça sua inscrição em minutos. Vagas limitadas — garanta a sua agora.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center pt-2">
                        <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90 font-bold shadow-lg gap-2">
                            <Link to={`/matricula/${tenant.slug}`}>
                                Fazer Inscrição
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                        </Button>
                        {whatsappNumber && (
                            <Button size="lg" asChild variant="outline" className="border-white/50 text-white bg-transparent hover:bg-white/10 gap-2">
                                <a
                                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Vi as atividades da ${tenant.nome} e gostaria de saber sobre as vagas disponíveis.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => posthog.capture("whatsapp_clicked", { location: "cta_final", tenant_nome: tenant.nome })}
                                >
                                    Falar no WhatsApp
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            </section>

            {/* Floating WhatsApp button */}
            {whatsappNumber && (
                <a
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Vi as atividades da ${tenant.nome} e gostaria de saber sobre as vagas disponíveis.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full shadow-lg shadow-green-500/40 bg-green-500 hover:bg-green-600 transition-colors"
                    aria-label="Falar no WhatsApp"
                >
                    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                </a>
            )}

            <LandingFooter tenant={tenant} />
        </div>
    );
};

export default TenantLanding;
