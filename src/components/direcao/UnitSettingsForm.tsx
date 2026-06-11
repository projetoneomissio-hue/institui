import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUnidade } from "@/contexts/UnidadeContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const unitSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  cnpj: z.string().optional(),
  logo_url: z.string().optional(),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram_url: z.string().optional(),
  email_contato: z.string().optional(),
  cor_primaria: z.string().optional(),
});

type UnitFormValues = z.infer<typeof unitSchema>;

export const UnitSettingsForm = () => {
  const { currentUnidade, refreshUnidade } = useUnidade();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      nome: "",
      cnpj: "",
      logo_url: "",
      endereco: "",
      bairro: "",
      whatsapp: "",
      instagram_url: "",
      email_contato: "",
      cor_primaria: "#D4AF37", // Default gold/premium
    },
  });

  useEffect(() => {
    if (currentUnidade) {
      form.reset({
        nome: currentUnidade.nome,
        cnpj: currentUnidade.cnpj || "",
        logo_url: currentUnidade.logo_url || "",
        endereco: (currentUnidade as any).endereco || "",
        bairro: (currentUnidade as any).bairro || "",
        whatsapp: (currentUnidade as any).whatsapp || "",
        instagram_url: (currentUnidade as any).instagram_url || "",
        email_contato: (currentUnidade as any).email_contato || "",
        cor_primaria: (currentUnidade as any).cor_primaria || "#D4AF37",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUnidade?.id]);

  const onUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !currentUnidade) return;

    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `logos/${currentUnidade.id}-${Date.now()}.${fileExt}`;

    setIsUploading(true);
    try {
      // Usando o bucket 'unidades' dedicado para identidades visuais
      const { error: uploadError } = await supabase.storage
        .from("unidades")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("unidades").getPublicUrl(fileName);
      console.log("Logo URL Gerada:", data.publicUrl);
      form.setValue("logo_url", data.publicUrl, { shouldDirty: true, shouldValidate: true });
      
      toast({ title: "Logo carregada!", description: "Clique em salvar para confirmar." });
    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };
  const onSubmit = async (data: UnitFormValues) => {
    if (!currentUnidade) return;
    if (isUploading) {
      toast({ title: "Aguarde", description: "O upload da logo ainda está em processamento.", variant: "destructive" });
      return;
    }

    console.log("Enviando dados da Unidade:", data);
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("unidades")
        .update({
          nome: data.nome,
          cnpj: data.cnpj,
          logo_url: data.logo_url,
          endereco: data.endereco,
          bairro: data.bairro,
          whatsapp: data.whatsapp,
          instagram_url: data.instagram_url,
          email_contato: data.email_contato,
          cor_primaria: data.cor_primaria,
        })
        .eq("id", currentUnidade.id);

      if (error) throw error;

      toast({ title: "Configurações salvas!", description: "Os dados da sua organização foram atualizados." });
      
      // Atualiza o contexto global sem recarregar a página
      await refreshUnidade();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex flex-col items-center gap-4">
            <div className="h-32 w-32 rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50 group relative">
              {isUploading ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground animate-pulse">Enviando...</span>
                </div>
              ) : form.watch("logo_url") ? (
                <>
                  <img src={form.watch("logo_url")} alt="Logo" className="h-full w-full object-contain p-2" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => form.setValue("logo_url", "", { shouldDirty: true })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Logo</span>
                </div>
              )}
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="w-full gap-2 font-medium uppercase text-[10px]"
              disabled={isUploading}
              onClick={() => document.getElementById("logo-upload")?.click()}
            >
              {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Subir Logo
            </Button>
            <input 
              id="logo-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={onUploadLogo} 
            />
          </div>

          <div className="flex-1 space-y-4 w-full">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium uppercase text-[10px] text-primary">Nome da Unidade/ONG</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Escola Institui" {...field} className="h-12 border-border focus:border-primary font-semibold text-lg" />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Este nome será exibido em todos os cabeçalhos, e-mails e rodapés.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium uppercase text-[10px] opacity-70">CNPJ</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000/0000-00" {...field} className="h-10 border-border/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cor_primaria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium uppercase text-[10px] opacity-70">Cor da Marca (Principal)</FormLabel>
                    <div className="flex items-center gap-3">
                        <FormControl>
                            <div className="relative flex-1">
                                <Input 
                                  placeholder="#D4AF37" 
                                  {...field} 
                                  className="h-10 font-mono pl-10 border-border/50" 
                                />
                                <div 
                                    className="absolute left-3 top-2.5 w-5 h-5 rounded-full border border-white/20 shadow-sm transition-transform hover:scale-110 cursor-pointer overflow-hidden"
                                    onClick={() => document.getElementById('color-picker')?.click()}
                                >
                                  <input 
                                    id="color-picker"
                                    type="color" 
                                    value={field.value || '#D4AF37'} 
                                    onChange={(e) => field.onChange(e.target.value)}
                                    className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                                  />
                                </div>
                            </div>
                        </FormControl>
                        <div 
                            className="w-10 h-10 rounded-xl border border-border shadow-inner flex-shrink-0" 
                            style={{ backgroundColor: field.value || '#D4AF37' }}
                        />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Localização */}
        <div className="space-y-4 pt-4 border-t border-border/30">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
            <span className="w-1 h-4 bg-primary rounded-full" />
            Localização Institucional
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
                <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="font-medium uppercase text-[10px] opacity-70">Endereço Completo</FormLabel>
                    <FormControl>
                        <Input placeholder="Rua Camilo Castelo Branco, 523" {...field} className="h-10 border-border/50" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="bairro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium uppercase text-[10px] opacity-70">Bairro</FormLabel>
                  <FormControl>
                    <Input placeholder="Vila Lindóia" {...field} className="h-10 border-border/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Contatos Sociais */}
        <div className="space-y-4 pt-4 border-t border-border/30">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
            <span className="w-1 h-4 bg-secondary rounded-full" />
            Canais de Atendimento e Redes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium uppercase text-[10px] opacity-70">WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="(41) 98440-6992" {...field} className="h-10 border-border/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email_contato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium uppercase text-[10px] opacity-70">E-mail Público</FormLabel>
                  <FormControl>
                    <Input placeholder="contato@ong.org" {...field} className="h-10 border-border/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instagram_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium uppercase text-[10px] opacity-70">Instagram (URL)</FormLabel>
                  <FormControl>
                    <Input placeholder="@ong_exemplo" {...field} className="h-10 border-border/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border/50 flex justify-end">
          <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/90 min-w-[150px]">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Configurações"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
