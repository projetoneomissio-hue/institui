-- Permite que a Direção atualize a unidade a que pertence (nome, logo, cor, feature_flags, etc.)
-- Necessário para o UnitSettingsForm e para a aba Módulos em Configurações.

DO $$ BEGIN
  CREATE POLICY "Direcao atualiza propria unidade"
    ON public.unidades
    FOR UPDATE
    USING (
      id IN (
        SELECT unidade_id FROM public.user_unidades
        WHERE user_id = auth.uid() AND role = 'direcao'
      )
    )
    WITH CHECK (
      id IN (
        SELECT unidade_id FROM public.user_unidades
        WHERE user_id = auth.uid() AND role = 'direcao'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
