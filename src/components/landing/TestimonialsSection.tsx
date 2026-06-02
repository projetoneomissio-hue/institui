import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Quote } from "lucide-react";
import { TestimonialItem } from "@/data/landing-data";

interface TestimonialsSectionProps {
    testimonials: TestimonialItem[];
}

export const TestimonialsSection = ({ testimonials }: TestimonialsSectionProps) => {
    return (
        <section id="depoimentos" className="py-20 bg-muted/30 scroll-mt-20">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <Badge variant="outline" className="w-fit mx-auto mb-4">Depoimentos</Badge>
                    <h2 className="text-4xl font-bold mb-4">O que Dizem Sobre Nós</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Veja o impacto que a instituição tem na vida das pessoas da nossa comunidade.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {testimonials.map((testimonial, index) => (
                        <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                            <CardContent className="pt-8 space-y-4">
                                <Quote className="h-8 w-8 text-primary/20 absolute top-4 right-4" />
                                <p className="text-muted-foreground text-sm leading-relaxed italic">
                                    &ldquo;{testimonial.feedback}&rdquo;
                                </p>
                                <div className="flex items-center gap-3 pt-4 border-t border-border">
                                    <div className="h-10 w-10 rounded-full overflow-hidden">
                                        <img
                                            src={testimonial.photo}
                                            alt={testimonial.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{testimonial.name}</p>
                                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};
