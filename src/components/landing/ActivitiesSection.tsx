import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bell, Clock, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import posthog from "posthog-js";
import { ActivityItem } from "@/data/landing-data";
import { LeadCaptureModal } from "./LeadCaptureModal";

interface ActivitiesSectionProps {
    activities: ActivityItem[];
    slug?: string;
    whatsapp?: string;
    titulo?: string;
    subtitulo?: string;
    unidadeId?: string;
    tenantNome?: string;
}

export const ActivitiesSection = ({
    activities,
    slug,
    whatsapp,
    titulo,
    subtitulo,
    unidadeId,
    tenantNome = "",
}: ActivitiesSectionProps) => {
    const [leadModal, setLeadModal] = useState<{ open: boolean; atividadeTitulo: string }>({
        open: false,
        atividadeTitulo: "",
    });

    const openLead = (atividadeTitulo: string) => {
        setLeadModal({ open: true, atividadeTitulo });
    };

    return (
        <section id="atividades" className="py-20 scroll-mt-20">
            <div className="container mx-auto px-4">
                <div className="text-center space-y-4 mb-16">
                    <Badge variant="outline" className="w-fit mx-auto">Nossas Atividades</Badge>
                    <h2 className="text-4xl font-bold tracking-tight">
                        {titulo || `${activities.length} atividades para todas as idades`}
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                        {subtitulo || "Do esporte à arte, do aprendizado ao aconselhamento. Encontre a atividade certa para você ou seu filho."}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {activities.map((activity, index) => {
                        const Icon = activity.icon;
                        return (
                            <Card key={index} className="flex flex-col h-full overflow-hidden group hover:shadow-xl transition-all duration-500 border-border/50">
                                {/* 16:9 image area */}
                                <div className="relative aspect-video overflow-hidden">
                                    <div className={`absolute inset-0 bg-gradient-to-br ${activity.gradient} ${activity.image ? 'opacity-20 group-hover:opacity-40' : 'opacity-90 group-hover:opacity-100'} transition-opacity duration-500 z-10`} />
                                    {activity.image ? (
                                        <img
                                            src={activity.image}
                                            alt={activity.title}
                                            className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Icon className="h-16 w-16 text-white/25" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 bg-background/95 backdrop-blur-sm p-2 rounded-xl shadow-sm z-20">
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="absolute bottom-3 left-3 z-20 flex gap-2 flex-wrap">
                                        {activity.free ? (
                                            <Badge className="bg-green-600 text-white border-none shadow-sm text-sm py-1 font-bold">
                                                Gratuito
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-background/95 backdrop-blur-sm text-foreground hover:bg-background border-none shadow-sm text-sm py-1">
                                                {activity.price.split("|")[0].trim()}
                                            </Badge>
                                        )}
                                        {activity.waitlist && (
                                            <Badge className="bg-amber-500 text-white border-none shadow-sm text-xs py-1 font-bold">
                                                ⏳ Lista de espera
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <CardHeader className="pb-3">
                                    <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">{activity.title}</CardTitle>
                                    <CardDescription className="line-clamp-2 text-sm leading-relaxed min-h-[40px]">
                                        {activity.description}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-4 flex-grow pb-6">
                                    <div className="grid grid-cols-1 gap-2 py-3 border-y border-border/50 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Público:</span>
                                            <span className="font-semibold text-right max-w-[180px]">{activity.targetAudience}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Frequência:</span>
                                            <span className="font-semibold">{activity.frequency}</span>
                                        </div>
                                        {activity.priceNote && (
                                            <div className="flex items-start justify-between">
                                                <span className="text-muted-foreground text-xs">Obs.:</span>
                                                <span className="font-medium text-xs text-right max-w-[190px] text-muted-foreground">{activity.priceNote}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-muted/40 rounded-xl p-3">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> Horários
                                            </p>
                                            <p className="text-xs font-medium leading-relaxed whitespace-pre-line">{activity.schedule}</p>
                                        </div>

                                        {activity.note && (
                                            <p className="text-[11px] text-muted-foreground italic leading-relaxed border-l-2 border-primary/30 pl-3">
                                                {activity.note}
                                            </p>
                                        )}

                                        {activity.waitlist && unidadeId ? (
                                            <Button
                                                className="w-full h-11 font-bold shadow-md hover:shadow-lg transition-all gap-2"
                                                size="lg"
                                                variant="outline"
                                                onClick={() => {
                                                    posthog.capture("activity_waitlist_clicked", {
                                                        atividade: activity.title,
                                                        tenant_nome: tenantNome,
                                                    });
                                                    openLead(activity.title);
                                                }}
                                            >
                                                <Bell className="h-4 w-4" />
                                                Avise-me quando tiver vaga
                                            </Button>
                                        ) : (
                                            <Button
                                                asChild
                                                className="w-full h-11 font-bold shadow-md hover:shadow-lg transition-all gap-2"
                                                size="lg"
                                                variant={activity.free ? "outline" : "default"}
                                                onClick={() => posthog.capture("activity_cta_clicked", {
                                                    atividade: activity.title,
                                                    tenant_nome: tenantNome,
                                                })}
                                            >
                                                <Link to={`/matricula/${slug || 'matriz'}?atividade=${encodeURIComponent(activity.title)}`}>
                                                    {activity.free ? "Quero Participar" : "Quero me inscrever"}
                                                    <ArrowRight className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Vagas Sociais Banner */}
                <div className="mt-16 p-6 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Heart className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <p className="font-bold text-lg text-foreground">Vagas Sociais Gratuitas</p>
                        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                            Oferecemos vagas gratuitas em <strong>todas as atividades</strong> para pessoas e famílias em situação de vulnerabilidade social.
                            Entre em contato pelo WhatsApp para mais informações.
                        </p>
                    </div>
                    {whatsapp && (
                        <Button
                            asChild
                            variant="outline"
                            className="shrink-0 gap-2 font-bold"
                            onClick={() => posthog.capture("whatsapp_vagas_sociais_clicked", { tenant_nome: tenantNome })}
                        >
                            <a
                                href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre as vagas sociais gratuitas.")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Falar no WhatsApp
                                <ArrowRight className="h-4 w-4" />
                            </a>
                        </Button>
                    )}
                </div>
            </div>

            {unidadeId && (
                <LeadCaptureModal
                    open={leadModal.open}
                    onClose={() => setLeadModal({ open: false, atividadeTitulo: "" })}
                    atividadeTitulo={leadModal.atividadeTitulo}
                    unidadeId={unidadeId}
                    tenantNome={tenantNome}
                />
            )}
        </section>
    );
};
