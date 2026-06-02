import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UserPlus, UserCheck, CreditCard, HeartPulse, FileText, Info, GraduationCap } from "lucide-react";

export const ManualResponsavel = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2 mb-2">
          <GraduationCap className="h-6 w-6" />
          Guia de Pais e Alunos
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          Dúvidas sobre matrículas, pagamentos e como manter o perfil atualizado.
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {/* Matrícula */}
        <AccordionItem value="item-1" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-primary/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Matricular um Filho (ou Aluno Novo)</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">O primeiro passo na jornada do aluno.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              No seu Dashboard de Responsável, clique no botão <strong>"+ Adicionar Aluno"</strong>.
            </p>
            <ol className="list-decimal pl-5 mt-2 space-y-2">
              <li>Preencha os dados básicos (Nome, Nascimento, Gênero).</li>
              <li>Siga os passos de endereçamento e saúde.</li>
              <li>Aguarde a aprovação da Secretaria para que ele apareça na lista oficial de presença.</li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        {/* Anamnese */}
        <AccordionItem value="item-2" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-red-500/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-red-500 transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-red-500/10 p-2 rounded-lg text-red-500">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Ficha de Saúde e Anamnese</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Garantindo a segurança do aluno nas atividades.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              A anamnese contém informações vitais sobre alergias, uso de medicamentos e condições especiais. 
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Abra o perfil do aluno e procure por <strong>"Ficha de Saúde / Anamnese"</strong>.</li>
              <li>Mantenha estes dados sempre atualizados para que nossos professores saibam como agir em emergências.</li>
              <li>Alunos PNE precisam de dados específicos de CID (caso tenha).</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Pagamentos */}
        <AccordionItem value="item-3" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-emerald-500/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-emerald-500 transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Pagamentos e Mensalidades</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Acesso a boletos e histórico financeiro.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              Em sua área financeira, você pode visualizar as parcelas pagas e as abertas.
            </p>
            <div className="mt-4 p-3 bg-muted/30 rounded-lg text-[12px] flex items-start gap-2 border border-border">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>O status de pagamento é atualizado automaticamente ao realizar a baixa no sistema ou via integração bancária. Caso tenha dúvidas, procure o menu de suporte financeiro.</span>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Perfil */}
        <AccordionItem value="item-4" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-teal-500/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-teal-500 transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-teal-500/10 p-2 rounded-lg text-teal-500">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Completar meu Perfil</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Garantindo que a comunicação chegue até você.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              Certifique-se de que seu telefone, e-mail e endereço (CEP) estejam corretos. Use a barra de progresso no topo do seu Dashboard para saber quais campos ainda estão faltando.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
