import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Info, LayoutDashboard, ClipboardList, ShieldCheck, Heart, UserSearch } from "lucide-react";

export const ManualCoordenacao = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2 mb-2">
          <ShieldCheck className="h-6 w-6" />
          Guia da Coordenação Acadêmica
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          Gerenciamento de turmas, acompanhamento de professores e análise de relatórios pedagógicos.
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {/* Visão de Turmas */}
        <AccordionItem value="item-1" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-primary/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Visão de Turmas e Ocupação</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Como monitorar a saúde das atividades.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              No seu Dashboard de Coordenação, você tem uma visão direta da taxa de ocupação de cada modalidade. 
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Alerta de Lotação:</strong> Turmas que atingem 100% da capacidade aparecerão com destaque.</li>
              <li><strong>Frequência Média:</strong> Acompanhe se os alunos de uma turma específica estão faltando muito para intervir junto aos pais.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Feedback Pedagógico */}
        <AccordionItem value="item-2" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-orange-500/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-orange-500 transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Feedback Pedagógico e Social</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Acompanhamento das observações do professor.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              Em <strong>"Relatórios de Alunos"</strong>, você pode filtrar as observações lançadas pelos professores. 
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Identifique alunos que precisam de apoio psicológico ou assistencial.</li>
              <li>Crie planos de ação junto à Direção para casos críticos.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Voluntários */}
        <AccordionItem value="item-3" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-success/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-success transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-success/10 p-2 rounded-lg text-success">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Relatórios de Voluntários</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Gestão de horas e presença da equipe.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              Acesse <strong>"Relatórios &gt; Voluntários"</strong> para extrair planilhas de horas trabalhadas da sua equipe. Isso é essencial para certificados de horas complementares e controle de escala.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
