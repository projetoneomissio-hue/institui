import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UserCheck, Mail, Users, FileSearch, Info, ShieldCheck } from "lucide-react";

export const ManualSecretaria = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-orange-500/10 p-6 rounded-2xl border border-orange-500/20">
        <h2 className="text-xl font-bold text-orange-600 flex items-center gap-2 mb-2">
          <ShieldCheck className="h-6 w-6" />
          Guia de Operações da Secretaria
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          Processamento de matrículas, convites para novos pais e gestão da baselegada.
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {/* Aprovação */}
        <AccordionItem value="item-1" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-orange-500/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-orange-600 transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-orange-500/10 p-2 rounded-lg text-orange-600">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Aprovação de Alunos Novos</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Como processar solicitações de entrada.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              Sempre que um pai cadastra um aluno novo, ele cai em <strong>"Aguardando Aprovação"</strong>. 
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Verifique se os documentos básicos e a anamnese foram preenchidos corretamente.</li>
              <li>Confirme se há vaga na turma pretendida.</li>
              <li>Altere o status para <strong>Ativo</strong> para que o professor veja o nome na chamada.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Convites Legados */}
        <AccordionItem value="item-2" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-primary/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Gestão de Convites Legados</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Trazendo pais da planilha antiga para o app.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              No menu <strong>"Convites Legados"</strong>, você visualiza a lista de 411 alunos antigos importados. 
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Busque pelo e-mail do pai no campo de pesquisa.</li>
              <li>Clique em <strong>"Convidar"</strong>. Isso enviará um e-mail automático com o token de redenção.</li>
              <li>Assim que o pai resgata o convite, os alunos dele são vinculados automaticamente sem intervenção manual.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Transferência */}
        <AccordionItem value="item-3" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-blue-500/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-blue-500 transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Transferência de Turmas</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Movimentando alunos entre níveis e horários.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              Para trocar um aluno de turma, vá na ficha do aluno e utilize a ferramenta de transferência. Lembre-se que isso afeta as pautas futuras dos professores envolvidos.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
