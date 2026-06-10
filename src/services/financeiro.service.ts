import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const financeiroService = {
    /** Receita mensal (pagamentos pagos no mês atual) */
    async fetchReceitaMensal(unidadeId?: string) {
        const hoje = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase.rpc("get_financial_kpis", { 
            month_ref: hoje,
            p_unidade_id: unidadeId 
        });
        if (error) throw error;
        // @ts-ignore - RPC types might not be generated yet
        return Number(data?.receita?.total) || 0;
    },

    /** Busca KPIs financeiros com filtro de mês/ano opcional */
    async fetchFinanceiroKPIs(params?: { month?: number; year?: number; unidadeId?: string }) {
        let referenceDate: string;

        if (params?.month && params?.year) {
            // Se passar mês/ano, cria data no dia 10 (vencimento padrão)
            referenceDate = new Date(params.year, params.month - 1, 10).toISOString().split("T")[0];
        } else {
            referenceDate = new Date().toISOString().split("T")[0];
        }

        const { data, error } = await supabase.rpc("get_financial_kpis", { 
            month_ref: referenceDate,
            p_unidade_id: params?.unidadeId
        });
        if (error) throw error;

        // @ts-ignore
        return data;
    },

    /** Receita agregada por atividade (via RPC) */
    async fetchReceitaPorAtividade(unidadeId?: string) {
        const { data, error } = await supabase.rpc("get_receita_por_atividade", {
            p_unidade_id: unidadeId
        });
        if (error) throw error;
        return data || [];
    },

    /** Inadimplência (pendentes vencidos) */
    async fetchInadimplencia(unidadeId?: string) {
        const hoje = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase.rpc("get_financial_kpis", { 
            month_ref: hoje,
            p_unidade_id: unidadeId
        });

        if (error) throw error;

        // @ts-ignore
        return {
            valor: Number(data?.inadimplencia?.total || 0),
            quantidade: Number(data?.inadimplencia?.quantidade || 0),
        };
    },

    /** Fluxo de Caixa (Receita x Despesas) filtrado por ano */
    async fetchFluxoCaixaMeses(year?: number, unidadeId?: string) {
        const yearRef = year || new Date().getFullYear();
        const { data, error } = await supabase.rpc("get_monthly_revenue", { 
            year_ref: yearRef,
            p_unidade_id: unidadeId
        });

        if (error) throw error;

        // Converter para Array [{mes: 'Jan', receita: 100, despesa: 50}, ...]
        // @ts-ignore
        return (data || []).map((item: any) => ({
            mes: item.mes,
            receita: Number(item.receita),
            despesa: Number(item.despesa)
        }));
    },

    /** Despesas por tipo (ex-categoria) */
    async fetchDespesasPorTipo(unidadeId?: string) {
        let query = supabase
            .from("custos_predio")
            .select("tipo, valor");
        
        if (unidadeId) {
            query = query.eq("unidade_id", unidadeId);
        }

        const { data, error } = await query;

        if (error) throw error;

        const summary: Record<string, number> = {};
        data?.forEach((item) => {
            const cat = item.tipo || "Outros";
            summary[cat] = (summary[cat] || 0) + Number(item.valor);
        });

        return Object.entries(summary).map(([name, value]) => ({ name, value }));
    },

    /** Últimos pagamentos recebidos */
    async fetchUltimosPagamentos(limit = 10, unidadeId?: string) {
        let query = supabase
            .from("pagamentos")
            .select(`
                id,
                valor,
                data_pagamento,
                status,
                matricula:matriculas(
                    aluno:alunos(
                        nome_completo,
                        responsavel:profiles(id, nome_completo, email, telefone)
                    ),
                    turma:turmas(
                        id,
                        nome,
                        atividade:atividades(id, nome)
                    )
                )
            `)
            .in("status", ["pago", "migrado"]);
        
        if (unidadeId) {
            query = query.eq("unidade_id", unidadeId);
        }

        const { data, error } = await query
            .order("data_pagamento", { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    },

    /** Custos recentes do prédio */
    async fetchCustosRecentes(limit = 10, unidadeId?: string) {
        let query = supabase
            .from("custos_predio")
            .select("id, item, valor, tipo, data_competencia");
        
        if (unidadeId) {
            query = query.eq("unidade_id", unidadeId);
        }

        const { data, error } = await query
            .order("data_competencia", { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    },

    /** Lista de inadimplentes detalhada (Otimizada) */
    async fetchInadimplentesOtimizado(unidadeId?: string) {
        let query = supabase
            .from("pagamentos")
            .select(`
                id,
                valor,
                data_vencimento,
                status,
                matricula:matriculas(
                    aluno:alunos(
                        id,
                        nome_completo,
                        responsavel:profiles(id, nome_completo, email, telefone)
                    ),
                    turma:turmas(
                        id,
                        nome,
                        atividade:atividades(id, nome)
                    )
                )
            `)
            .eq("status", "pendente")
            .lt("data_vencimento", new Date().toISOString().split("T")[0]);
        
        if (unidadeId) {
            query = query.eq("unidade_id", unidadeId);
        }

        const { data, error } = await query
            .order("data_vencimento", { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /** Dados para exportação PDF/CSV */
    async fetchDadosPDF(unidadeId?: string) {
        const hoje = new Date();
        // Usa campos de competência/negócio (consistente com os KPIs do dashboard)
        const startOfMonth = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0];
        const endOfMonth = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split("T")[0];

        let pagQuery = supabase.from("pagamentos").select("*")
            .gte("data_pagamento", startOfMonth)
            .lte("data_pagamento", endOfMonth);
        let cusQuery = supabase.from("custos_predio").select("*")
            .gte("data_competencia", startOfMonth)
            .lte("data_competencia", endOfMonth);
        let locQuery = supabase.from("locacoes").select("*")
            .gte("data", startOfMonth)
            .lte("data", endOfMonth);

        if (unidadeId) {
            pagQuery = pagQuery.eq("unidade_id", unidadeId);
            cusQuery = cusQuery.eq("unidade_id", unidadeId);
            locQuery = locQuery.eq("unidade_id", unidadeId);
        }

        const [pagamentos, custos, locacoes] = await Promise.all([
            pagQuery,
            cusQuery,
            locQuery
        ]);

        if (pagamentos.error) throw pagamentos.error;
        if (custos.error) throw custos.error;
        if (locacoes.error) throw locacoes.error;

        const merged = [
            ...(pagamentos.data?.map(p => ({ ...p, tipo: 'entrada', categoria: 'Mensalidade', descricao: 'Mensalidade Aluno' })) || []),
            ...(locacoes.data?.map(l => ({ ...l, tipo: 'entrada', categoria: 'Locação', descricao: l.evento || 'Locação de Espaço' })) || []),
            ...(custos.data?.map(c => ({ ...c, tipo: 'saida', categoria: c.tipo, descricao: c.item })) || [])
        ];

        return {
            data: merged,
            periodo: format(hoje, "MMMM yyyy", { locale: ptBR })
        };
    }
};
