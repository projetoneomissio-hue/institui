-- Configuração de email por unidade (Nível 1: from_name + reply_to)
-- A plataforma envia via Resend, mas cada tenant personaliza o remetente visível.

ALTER TABLE public.unidades
ADD COLUMN IF NOT EXISTS email_config JSONB DEFAULT '{"from_name": "Zafen", "reply_to": null}'::jsonb;
