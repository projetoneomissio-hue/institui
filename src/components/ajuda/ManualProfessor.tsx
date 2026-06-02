import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UserCheck, GraduationCap, MessageSquare, Coins, BookOpen, Info } from "lucide-react";

export const ManualProfessor = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20">
        <h2 className="text-xl font-bold text-blue-500 flex items-center gap-2 mb-2">
          <BookOpen className="h-6 w-6" />
          Guia de Atividades do Professor
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          Gerencie suas turmas, lance notas e acompanhe o progresso dos seus alunos.
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {/* Frequência */}
        <AccordionItem value="item-1" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-blue-500/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-blue-500 transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Frequência e Chamada</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Como registrar a presença diária.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              Acesse o menu <strong>"Chamada / Frequência"</strong>. Lá você verá suas turmas vinculadas.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Escolha a data no calendário.</li>
              <li>Marque os alunos como <strong>Presente</strong>, <strong>Ausente</strong> ou <strong>Justificado</strong>.</li>
              <li>O sistema salva o estado em tempo real.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Notas */}
        <AccordionItem value="item-2" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-primary/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Lançamento de Notas</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Gestão da Grade de Avaliação.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              No menu <strong>"Grade de Notas"</strong>, selecione a turma e o bimestre.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Insira as notas (0-10) nos campos correspondentes.</li>
              <li>Use o botão de salvar ao final da lista se houver.</li>
              <li>As notas ficam disponíveis para os Pais assim que publicadas.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Observações */}
        <AccordionItem value="item-3" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-orange-500/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-orange-500 transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Observações e Feedbacks</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Registrando o comportamento do aluno.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              Em <strong>"Observações"</strong>, você pode escrever feedbacks específicos sobre o desenvolvimento de cada aluno. 
            </p>
            <div className="mt-4 p-3 bg-muted/30 rounded-lg text-[12px] flex items-start gap-2 border border-border">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Cuidado ao escrever termos técnicos; lembre-se que estas observações podem ser lidas pela Coordenação e Direção para ações assistenciais.</span>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Comissões */}
        <AccordionItem value="item-4" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-emerald-500/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-emerald-500 transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Minhas Comissões</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Financeiro e repasses de aulas.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              Visualize seus ganhos em <strong>"Comissões"</strong>. Lá você terá o extrato de mensalidades pagas e o cálculo automático do seu repasse conforme contrato.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
