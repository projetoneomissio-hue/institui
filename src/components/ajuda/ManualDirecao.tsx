import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LayoutDashboard, BarChart3, Coins, Database, Info, ShieldCheck } from "lucide-react";

export const ManualDirecao = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-success/10 p-6 rounded-2xl border border-success/20">
        <h2 className="text-xl font-bold text-success flex items-center gap-2 mb-2">
          <ShieldCheck className="h-6 w-6" />
          Painel de Liderança Estratégica
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          Interpretação de métricas operacionais, impacto social e saúde financeira da ONG.
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {/* Dashboards */}
        <AccordionItem value="item-1" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-success/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-success transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-success/10 p-2 rounded-lg text-success">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Dashboard Operacional vs Social</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">A visão 360° da sua instituição.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              No topo do Dashboard, você pode alternar entre duas abas principais:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Operacional:</strong> Focado em faturamento, inadimplência e vagas disponíveis.</li>
              <li><strong>Impacto Social:</strong> Focado em dados ESG (Etnia, Gênero, Bairro, Retenção). Use este painel para relatórios a doadores.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Comissões */}
        <AccordionItem value="item-2" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-primary/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Gestão de Comissões</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Auditoria e repasse para equipe profissional.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <p>
              Acesse o menu de <strong>"Gestão de Comissões"</strong> para validar o faturamento bruto vs líquido. O sistema calcula automaticamente quanto cada professor parceiro deve receber com base nas matrículas pagas.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Auditoria */}
        <AccordionItem value="item-3" className="bg-card border border-border/50 rounded-xl px-4 shadow-sm data-[state=open]:border-blue-500/30 transition-colors">
          <AccordionTrigger className="hover:no-underline hover:text-blue-500 transition-colors py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Auditoria de Dados</h3>
                <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Garantindo a integridade da base de dados.</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pt-2 pb-6 px-2">
            <div className="p-3 bg-muted/30 rounded-lg text-[12px] flex items-start gap-2 border border-border">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Sempre confira os "Perfis Fantasmas" na área de Legados para garantir que não existam registros duplicados sem responsável vinculado.</span>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
