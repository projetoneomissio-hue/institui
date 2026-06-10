-- Fix: profit_growth was hardcoded to 0 in get_financial_kpis
-- Now calculates real month-over-month profit variation

CREATE OR REPLACE FUNCTION public.get_financial_kpis(month_ref DATE, p_unidade_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    prev_start_date DATE;
    prev_end_date DATE;

    revenue_current     NUMERIC := 0;
    locacoes_current    NUMERIC := 0;
    expenses_current    NUMERIC := 0;
    repasse_current     NUMERIC := 0;
    receita_liquida     NUMERIC := 0;
    profit_current      NUMERIC := 0;

    revenue_prev        NUMERIC := 0;
    locacoes_prev       NUMERIC := 0;
    expenses_prev       NUMERIC := 0;
    repasse_prev        NUMERIC := 0;
    receita_liquida_prev NUMERIC := 0;
    profit_prev         NUMERIC := 0;

    delinquency_total   NUMERIC := 0;
    delinquency_count   INTEGER := 0;

    revenue_growth      NUMERIC := 0;
    expenses_growth     NUMERIC := 0;
    profit_growth       NUMERIC := 0;

    salary_total        NUMERIC := 0;
    prof_fixed_salaries NUMERIC := 0;

    u_id UUID;
BEGIN
    u_id := COALESCE(p_unidade_id, '00000000-0000-0000-0000-000000000001');

    start_date      := make_date(extract(year from month_ref)::int, extract(month from month_ref)::int, 1);
    end_date        := (start_date + interval '1 month' - interval '1 day')::date;
    prev_start_date := (start_date - interval '1 month')::date;
    prev_end_date   := (start_date - interval '1 day')::date;

    -- ── Receita corrente ────────────────────────────────────────────────────
    SELECT COALESCE(SUM(valor), 0) INTO revenue_current
    FROM public.pagamentos
    WHERE unidade_id = u_id AND status = 'pago' AND data_pagamento BETWEEN start_date AND end_date;

    SELECT COALESCE(SUM(valor), 0) INTO locacoes_current
    FROM public.locacoes
    WHERE unidade_id = u_id AND data BETWEEN start_date AND end_date;

    revenue_current := revenue_current + locacoes_current;

    -- Repasse professores (corrente)
    SELECT COALESCE(SUM(p.valor * (prof.percentual_comissao / 100.0)), 0)
    INTO repasse_current
    FROM public.pagamentos p
    JOIN public.matriculas m  ON p.matricula_id = m.id
    JOIN public.turmas t      ON m.turma_id = t.id
    JOIN public.professores prof ON t.professor_id = prof.id
    WHERE p.unidade_id = u_id AND p.status = 'pago' AND p.data_pagamento BETWEEN start_date AND end_date;

    receita_liquida := revenue_current - repasse_current;

    -- ── Receita anterior ────────────────────────────────────────────────────
    SELECT COALESCE(SUM(valor), 0) INTO revenue_prev
    FROM public.pagamentos
    WHERE unidade_id = u_id AND status = 'pago' AND data_pagamento BETWEEN prev_start_date AND prev_end_date;

    SELECT COALESCE(SUM(valor), 0) INTO locacoes_prev
    FROM public.locacoes
    WHERE unidade_id = u_id AND data BETWEEN prev_start_date AND prev_end_date;

    revenue_prev := revenue_prev + locacoes_prev;

    SELECT COALESCE(SUM(p.valor * (prof.percentual_comissao / 100.0)), 0)
    INTO repasse_prev
    FROM public.pagamentos p
    JOIN public.matriculas m  ON p.matricula_id = m.id
    JOIN public.turmas t      ON m.turma_id = t.id
    JOIN public.professores prof ON t.professor_id = prof.id
    WHERE p.unidade_id = u_id AND p.status = 'pago' AND p.data_pagamento BETWEEN prev_start_date AND prev_end_date;

    receita_liquida_prev := revenue_prev - repasse_prev;

    -- ── Despesas ────────────────────────────────────────────────────────────
    SELECT COALESCE(SUM(salario), 0) INTO salary_total
    FROM public.funcionarios
    WHERE unidade_id = u_id AND ativo = true;

    BEGIN
        SELECT COALESCE(SUM(valor_fixo), 0) INTO prof_fixed_salaries
        FROM public.professores
        WHERE unidade_id = u_id AND ativo = true AND tipo_contrato = 'fixo';
    EXCEPTION WHEN OTHERS THEN
        prof_fixed_salaries := 0;
    END;

    SELECT COALESCE(SUM(valor), 0) + salary_total + prof_fixed_salaries INTO expenses_current
    FROM public.custos_predio
    WHERE unidade_id = u_id AND data_competencia BETWEEN start_date AND end_date;

    SELECT COALESCE(SUM(valor), 0) + salary_total + prof_fixed_salaries INTO expenses_prev
    FROM public.custos_predio
    WHERE unidade_id = u_id AND data_competencia BETWEEN prev_start_date AND prev_end_date;

    -- ── Lucro ───────────────────────────────────────────────────────────────
    profit_current := receita_liquida - expenses_current;
    profit_prev    := receita_liquida_prev - expenses_prev;

    -- ── Variações (divisão segura) ──────────────────────────────────────────
    IF revenue_prev  = 0 THEN revenue_growth  := 0; ELSE revenue_growth  := ROUND(((revenue_current  - revenue_prev)  / revenue_prev)  * 100, 1); END IF;
    IF expenses_prev = 0 THEN expenses_growth := 0; ELSE expenses_growth := ROUND(((expenses_current - expenses_prev) / expenses_prev) * 100, 1); END IF;
    IF profit_prev   = 0 THEN profit_growth   := 0; ELSE profit_growth   := ROUND(((profit_current   - profit_prev)   / profit_prev)   * 100, 1); END IF;

    -- ── Inadimplência ───────────────────────────────────────────────────────
    SELECT COALESCE(SUM(valor), 0), COUNT(*)
    INTO delinquency_total, delinquency_count
    FROM public.pagamentos
    WHERE unidade_id = u_id AND status = 'pendente' AND data_vencimento < CURRENT_DATE;

    RETURN jsonb_build_object(
        'receita',      jsonb_build_object('total', revenue_current,  'liquida', receita_liquida, 'repasse_professores', repasse_current,  'variacao', revenue_growth),
        'despesas',     jsonb_build_object('total', expenses_current, 'variacao', expenses_growth),
        'lucro',        jsonb_build_object('total', profit_current,   'variacao', profit_growth),
        'inadimplencia',jsonb_build_object('total', delinquency_total,'quantidade', delinquency_count)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_kpis(DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_kpis(DATE, UUID) TO service_role;
