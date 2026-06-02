import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useUnidade } from "@/contexts/UnidadeContext";

export const LandingFooter = () => {
    const { currentUnidade } = useUnidade();
    const unitName = currentUnidade?.nome || "Neo Missio";
    return (
        <>
            {/* CTA Section */}
            <section className="py-20 bg-foreground text-background">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto space-y-6">
                        <p className="text-sm font-bold uppercase tracking-[0.3em] opacity-60">Vagas Limitadas</p>
                        <h2 className="text-4xl sm:text-5xl font-black leading-tight">
                            Sua vaga pode estar
                            <span className="text-primary"> esperando por você</span>
                        </h2>
                        <p className="text-lg opacity-75 max-w-xl mx-auto">
                            Inscreva-se agora e garanta sua vaga em uma das atividades do {unitName}.
                            Algumas turmas têm lista de espera.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center pt-2">
                            <Button asChild size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/30 h-14 px-8 text-base font-bold">
                                <a href="#atividades">
                                    Garantir Minha Vaga
                                    <ArrowRight className="h-5 w-5" />
                                </a>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="gap-2 bg-transparent border-background/30 text-background hover:bg-background/10 h-14 px-8 text-base">
                                <a href="https://wa.me/5541984406992" target="_blank" rel="noopener noreferrer">
                                    Falar no WhatsApp
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-muted/30 py-12">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div>
                            {currentUnidade?.logo_url ? (
                                <img src={currentUnidade.logo_url} alt={unitName} className="h-12 w-auto mb-4 object-contain" />
                            ) : (
                                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                                    <span className="text-2xl font-black text-primary">{unitName.charAt(0)}</span>
                                </div>
                            )}
                            <span className="font-black text-2xl tracking-tighter uppercase mb-4">{unitName}</span>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Gerenciamento escolar inteligente e humanizado.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-4">Links Rápidos</h3>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#atividades" className="text-muted-foreground hover:text-primary transition-colors">Atividades</a></li>
                                <li><a href="#depoimentos" className="text-muted-foreground hover:text-primary transition-colors">Depoimentos</a></li>
                                <li><a href="#terapia" className="text-muted-foreground hover:text-primary transition-colors">Aconselhamento</a></li>
                                <li><Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">Sistema</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-4 text-foreground/80 lowercase tracking-widest font-mono text-xs uppercase">Contato Direto</h3>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="hover:text-primary transition-colors">
                                    {currentUnidade?.endereco || "Rua Camilo Castelo Branco, 523"}
                                </li>
                                <li className="hover:text-primary transition-colors">
                                    {currentUnidade?.bairro || "Vila Lindóia"}
                                </li>
                                <li className="font-bold text-foreground hover:text-green-500 transition-colors">
                                    <a href={`https://wa.me/${(currentUnidade?.whatsapp || "41984406992").replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                        <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                        WhatsApp: {currentUnidade?.whatsapp || "(41) 98440-6992"}
                                    </a>
                                </li>
                                {currentUnidade?.instagram_url && (
                                    <li className="text-pink-500 font-medium">
                                        <a href={`https://instagram.com/${currentUnidade.instagram_url.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                                            Instagram: {currentUnidade.instagram_url}
                                        </a>
                                    </li>
                                )}
                                {currentUnidade?.email_contato && (
                                    <li className="italic opacity-80">
                                        {currentUnidade.email_contato}
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                    <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
                        <p>&copy; {new Date().getFullYear()} {unitName}. Todos os direitos reservados.</p>
                    </div>
                </div>
            </footer>
        </>
    );
};
