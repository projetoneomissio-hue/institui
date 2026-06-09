import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type SolicitacaoInsert = Database["public"]["Tables"]["solicitacoes_matricula"]["Insert"];
export type SolicitacaoUpdate = Database["public"]["Tables"]["solicitacoes_matricula"]["Update"];

export const solicitacoesService = {
  /** 
   * Salva ou atualiza uma solicitação. 
   * Usado para o Passo 1 (Criar Lead) e Passo 2 (Completar Ficha).
   */
  async upsert(payload: SolicitacaoInsert | SolicitacaoUpdate) {
    const { data, error } = await supabase
      .from("solicitacoes_matricula")
      .upsert(payload as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Busca todas as solicitações (Leads e Pendentes) */
  async fetchAll() {
    const { data, error } = await supabase
      .from("solicitacoes_matricula")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  /** Busca solicitações por status */
  async fetchByStatus(status: Database["public"]["Enums"]["status_solicitacao"]) {
    const { data, error } = await supabase
      .from("solicitacoes_matricula")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  /** Atualiza o status de uma solicitação */
  async updateStatus(id: string, status: Database["public"]["Enums"]["status_solicitacao"]) {
    const { data, error } = await supabase
      .from("solicitacoes_matricula")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Retorna o id de um lead ativo (interessado ou pendente) com o mesmo WhatsApp
   * na mesma unidade. Usado para evitar duplicatas no formulário público.
   */
  async findActiveByWhatsapp(whatsapp: string, unidadeId: string): Promise<string | null> {
    const { data } = await supabase
      .from("solicitacoes_matricula")
      .select("id")
      .eq("whatsapp", whatsapp)
      .eq("unidade_id", unidadeId)
      .in("status", ["interessado", "pendente"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.id ?? null;
  },

  /** Busca contagem de solicitações por status para o dashboard */
  async fetchCounts() {
    const { data, error } = await supabase
      .from("solicitacoes_matricula")
      .select("status");

    if (error) throw error;

    const counts = {
      interessado: 0,
      pendente: 0,
      total: data.length
    };

    data.forEach(item => {
      if (item.status === "interessado") counts.interessado++;
      if (item.status === "pendente") counts.pendente++;
    });

    return counts;
  }
};
