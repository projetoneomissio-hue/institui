-- Cada unidade configura seu próprio gateway de pagamento
-- Evita que todas as ONGs compartilhem as mesmas credenciais InfinitePay

ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS gateway_config JSONB DEFAULT '{"provider": null}'::jsonb;

COMMENT ON COLUMN public.unidades.gateway_config IS
  'Gateway de pagamento da unidade. Ex: {"provider":"infinitepay","handle":"meu_handle"}';
