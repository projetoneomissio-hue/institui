import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import posthog from "posthog-js";

interface LeadCaptureModalProps {
    open: boolean;
    onClose: () => void;
    atividadeTitulo: string;
    unidadeId: string;
    tenantNome: string;
}

export function LeadCaptureModal({ open, onClose, atividadeTitulo, unidadeId, tenantNome }: LeadCaptureModalProps) {
    const [nome, setNome] = useState("");
    const [contato, setContato] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim() || !contato.trim()) return;
        setLoading(true);
        try {
            await supabase.from("landing_leads" as any).insert({
                unidade_id: unidadeId,
                nome: nome.trim(),
                contato: contato.trim(),
                atividade_titulo: atividadeTitulo,
            });
            posthog.capture("lead_form_submitted", {
                atividade: atividadeTitulo,
                tenant_nome: tenantNome,
            });
            setSuccess(true);
        } catch {
            // falha silenciosa — não interrompe o fluxo do visitante
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setNome("");
        setContato("");
        setSuccess(false);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Avise-me quando tiver vaga
                    </DialogTitle>
                </DialogHeader>

                {success ? (
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                        <div>
                            <p className="font-bold text-lg">Cadastrado com sucesso!</p>
                            <p className="text-muted-foreground text-sm mt-1">
                                Vamos te avisar assim que houver uma vaga em{" "}
                                <strong>{atividadeTitulo}</strong>.
                            </p>
                        </div>
                        <Button onClick={handleClose} className="w-full">Fechar</Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                        <p className="text-sm text-muted-foreground">
                            Deixe seus dados e te avisamos assim que abrir uma vaga em{" "}
                            <strong>{atividadeTitulo}</strong>.
                        </p>
                        <div className="space-y-1.5">
                            <Label htmlFor="lead-nome">Nome</Label>
                            <Input
                                id="lead-nome"
                                value={nome}
                                onChange={e => setNome(e.target.value)}
                                placeholder="Seu nome completo"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="lead-contato">WhatsApp ou E-mail</Label>
                            <Input
                                id="lead-contato"
                                value={contato}
                                onChange={e => setContato(e.target.value)}
                                placeholder="(41) 99999-9999 ou email@exemplo.com"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full gap-2" disabled={loading}>
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Quero ser avisado
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
