-- Fix: garante que as colunas valor_fixo e tipo_contrato existem em professores
-- Remove a necessidade do bloco EXCEPTION WHEN OTHERS nas RPCs financeiras

ALTER TABLE public.professores
  ADD COLUMN IF NOT EXISTS tipo_contrato TEXT NOT NULL DEFAULT 'percentual'
    CHECK (tipo_contrato IN ('percentual', 'fixo')),
  ADD COLUMN IF NOT EXISTS valor_fixo NUMERIC NOT NULL DEFAULT 0
    CHECK (valor_fixo >= 0);

COMMENT ON COLUMN public.professores.tipo_contrato IS 'percentual = comissão %; fixo = salário fixo mensal';
COMMENT ON COLUMN public.professores.valor_fixo    IS 'Valor do salário fixo mensal (usado quando tipo_contrato = fixo)';
