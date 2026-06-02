import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Heart, Users, Trophy, Sparkles, Star, GraduationCap } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { SeoHead } from "@/components/SeoHead";
import { useUTMTracking } from "@/hooks/useUTMTracking";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { activities, testimonials, getIconByName, ActivityItem } from "@/data/landing-data";
import { ActivitiesSection } from "@/components/landing/ActivitiesSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { TherapySection } from "@/components/landing/TherapySection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { useUnidade } from "@/contexts/UnidadeContext";

import heroImage from "@/assets/hero-neo-missio.jpg";

const Index = () => {
  useUTMTracking();
  const { isAuthenticated } = useAuth();
  const { currentUnidade } = useUnidade();
  const unitName = currentUnidade?.nome || "Neo Missio";

  // Lê atividades do Supabase; se a tabela não existir ou estiver vazia, usa as estáticas
  const { data: dbAtividades } = useQuery({
    queryKey: ["landing-atividades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_atividades" as any)
        .select("*")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) return null;
      return data as any[];
    },
  });

  const displayActivities: ActivityItem[] = dbAtividades?.length
    ? dbAtividades.map((a: any) => ({
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
      }))
    : activities;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // A landing page é sempre em modo claro independente do tema do admin
  return (
    <div className="light min-h-screen bg-white text-gray-900">
      <SeoHead
        title="Atividades Extracurriculares"
        description={`Gerenciamento completo para ${unitName}. Atividades, financeiro e portal do responsável.`}
      />

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/95 backdrop-blur-sm border-b border-border z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
             {currentUnidade?.logo_url ? (
               <img src={currentUnidade.logo_url} alt={unitName} className="h-10 sm:h-12 w-auto object-contain" />
             ) : (
               <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                 <span className="text-xl font-black text-primary">{unitName.charAt(0)}</span>
               </div>
             )}
             <span className="font-black text-xl tracking-tighter uppercase">{unitName}</span>
          </div>
          <div className="flex gap-4 items-center">
            <a href="#atividades" className="hidden sm:inline text-sm font-medium hover:text-primary transition-colors">
              Atividades
            </a>
            <a href="#depoimentos" className="hidden md:inline text-sm font-medium hover:text-primary transition-colors">
              Depoimentos
            </a>
            <a href="#terapia" className="hidden md:inline text-sm font-medium hover:text-primary transition-colors">
              Aconselhamento
            </a>
            <Button size="sm" asChild>
              <Link to="/login">Acessar Sistema</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="w-fit gap-1.5" variant="secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block" />
                Inscrições Abertas
              </Badge>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Esporte, arte e educação para
                <span className="text-primary"> toda a comunidade</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                O {unitName} oferece atividades acessíveis para crianças, jovens e adultos.
                Vagas limitadas — garanta a sua e transforme sua história.
              </p>

              {/* Social proof strip */}
              <div className="flex flex-wrap gap-6 pt-2">
                {[
                  { icon: Users, value: "300+", label: "alunos atendidos" },
                  { icon: Trophy, value: "11", label: "modalidades" },
                  { icon: Star, value: "5★", label: "avaliação" },
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
                    Ver Atividades
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </a>
                <a href="https://wa.me/5541984406992" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="gap-2">
                    Tirar dúvidas no WhatsApp
                  </Button>
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border border-border">
                <img
                  src={heroImage}
                  alt={`Crianças e adultos em atividades da unidade ${unitName}`}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-6 -left-6 bg-primary text-primary-foreground p-5 rounded-2xl shadow-xl shadow-primary/30">
                <div className="flex items-center gap-3">
                  <Heart className="h-7 w-7 shrink-0" />
                  <div>
                    <p className="text-2xl font-black leading-none">Gratuito</p>
                    <p className="text-xs opacity-80 mt-0.5">Aconselhamento para famílias</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Numbers Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { icon: Users, value: "300+", label: "Alunos Atendidos" },
              { icon: GraduationCap, value: "11", label: "Modalidades Ativas" },
              { icon: Heart, value: "2", label: "Grupos de Aconselhamento" },
              { icon: Sparkles, value: "100%", label: "Foco em Propósito" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="space-y-2">
                <Icon className="h-8 w-8 mx-auto opacity-80" />
                <p className="text-4xl font-black">{value}</p>
                <p className="text-sm opacity-75 font-medium uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="outline" className="w-fit mx-auto">Sobre o Projeto</Badge>
            <h2 className="text-4xl font-bold">
              Acreditamos que toda criança merece uma chance
            </h2>
            <p className="text-lg text-muted-foreground">
              O {unitName} nasceu para levar esporte, arte e educação a quem mais precisa.
              Aqui, não importa de onde você vem — importa para onde você quer ir.
              Nossos professores são voluntários apaixonados pelo que fazem, e cada matrícula financia a continuidade desse trabalho.
            </p>
            <div className="grid md:grid-cols-3 gap-8 pt-8">
              <div className="space-y-3 p-6 rounded-2xl bg-background border border-border/50 hover:border-primary/30 transition-colors">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg">Inclusão Real</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Mensalidades a partir de R$60 e aconselhamento 100% gratuito para toda a família
                </p>
              </div>
              <div className="space-y-3 p-6 rounded-2xl bg-background border border-border/50 hover:border-primary/30 transition-colors">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg">Desenvolvimento Integral</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Corpo, mente e caráter. Disciplina, respeito e trabalho em equipe em cada aula
                </p>
              </div>
              <div className="space-y-3 p-6 rounded-2xl bg-background border border-border/50 hover:border-primary/30 transition-colors">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg">Raízes na Comunidade</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Atendemos famílias da Vila Lindóia e região há anos. Somos vizinhos, não apenas um serviço
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ActivitiesSection activities={displayActivities} />
      <TestimonialsSection testimonials={testimonials} />
      <TherapySection />
      <LandingFooter />
    </div>
  );
};

export default Index;
