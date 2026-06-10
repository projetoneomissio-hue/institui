-- Migration: Update get_monthly_revenue to include fixed salaries
-- Description: Modifies the get_monthly_revenue RPC to add the sum of professor fixed salaries to the total despesas.

CREATE OR REPLACE FUNCTION public.get_monthly_revenue(year_ref INT)
RETURNS TABLE (mes TEXT, receita NUMERIC, despesa NUMERIC)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    salary_total NUMERIC := 0;
    prof_fixed_salaries NUMERIC := 0;
BEGIN
    -- 1. Employees sum
    SELECT COALESCE(SUM(salario), 0) INTO salary_total
    FROM public.funcionarios
    WHERE ativo = true;

    -- 2. Fixed professors sum
    SELECT COALESCE(SUM(valor_fixo), 0) INTO prof_fixed_salaries
    FROM public.professores
    WHERE ativo = true AND tipo_contrato = 'fixo';

    -- 3. Monthly loop combining predio costs + salary_total + prof_fixed_salaries
    RETURN QUERY
    WITH months AS (
        SELECT generate_series(
            make_date(year_ref, 1, 1),
            make_date(year_ref, 12, 1),
            '1 month'
        )::date AS m
    )
    SELECT 
        to_char(months.m, 'Mon') as mes,
        COALESCE(SUM(p.valor), 0) as receita,
        (COALESCE((
            SELECT SUM(c.valor) 
            FROM public.custos_predio c 
            WHERE to_char(c.data_competencia, 'YYYY-MM') = to_char(months.m, 'YYYY-MM')
        ), 0) + salary_total + prof_fixed_salaries) as despesa
    FROM months
    LEFT JOIN public.pagamentos p ON to_char(p.data_pagamento, 'YYYY-MM') = to_char(months.m, 'YYYY-MM') AND p.status = 'pago'
    GROUP BY months.m
    ORDER BY months.m;
END;
$$;

-- Grant Execution Permissions
GRANT EXECUTE ON FUNCTION public.get_monthly_revenue(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_revenue(INT) TO service_role;

-- Reload Cache (just in case)
NOTIFY pgrst, 'reload schema';
