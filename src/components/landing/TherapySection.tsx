import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Users, Star, Scissors } from "lucide-react";
import therapyImage from "@/assets/therapy-counseling.jpg";

const programs = [
    {
        icon: Heart,
        title: "Escuta Terapêutica Cristã",
        description: "Atendimento individual presencial ou online. R$ 70/mês + R$ 25 manutenção. Horários a combinar.",
        badge: "Individual",
        badgeColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    },
    {
        icon: Users,
        title: "Aconselhamento – Homens",
        description: "4 sessões presenciais, 1h por semana. Crescimento emocional e espiritual com base cristã. Conforme agenda.",
        badge: "Gratuito",
        badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    },
    {
        icon: Scissors,
        title: "Tecendo Afetos",
        description: "Grupo de mulheres que tecem peças para doação. Toda Segunda-feira das 15h às 17h.",
        badge: "Gratuito",
        badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    },
    {
        icon: Star,
        title: "Série Alpha",
        description: "Roda de conversa sobre o sentido da vida. Ambiente acolhedor e sem julgamentos. Segundas-feiras às 19h30.",
        badge: "Gratuito",
        badgeColor: "bg-green-500/10 text-green-600 border-green-500/20",
    },
];

export const TherapySection = () => {
    return (
        <section id="terapia" className="py-20 scroll-mt-20 bg-muted/20">
            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div className="order-2 lg:order-1 rounded-2xl overflow-hidden shadow-xl border border-border aspect-[4/3]">
                        <img
                            src={therapyImage}
                            alt="Programas comunitários e de saúde mental"
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="space-y-8 order-1 lg:order-2">
                        <div className="space-y-4">
                            <Badge variant="outline" className="w-fit">Programas Comunitários</Badge>
                            <h2 className="text-4xl font-bold leading-tight">
                                Cuidado que vai além do esporte
                            </h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                Além das atividades, oferecemos programas de apoio emocional, espiritual e social.
                                Três deles são completamente gratuitos — porque acreditamos que todo mundo merece suporte.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {programs.map((program) => {
                                const Icon = program.icon;
                                return (
                                    <div key={program.title} className="flex gap-4 p-4 rounded-xl bg-background border border-border/50 hover:border-primary/30 transition-colors">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <Icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="font-bold text-sm">{program.title}</h3>
                                                <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0 h-5 ${program.badgeColor}`}>
                                                    {program.badge}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">{program.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/20">
                            <a href="https://wa.me/5541984406992" target="_blank" rel="noopener noreferrer">
                                Saber mais pelo WhatsApp
                                <ArrowRight className="h-5 w-5" />
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
};
