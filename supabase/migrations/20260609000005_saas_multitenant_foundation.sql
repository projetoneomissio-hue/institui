-- SaaS Multi-tenant Foundation
--
-- Problema:
--   invitations não tem unidade_id → handle_new_user() usa UUID fixo da Matriz
--   para TODOS os novos usuários, misturando dados de clientes diferentes.
--
-- Fix:
--   1. Adiciona unidade_id em invitations
--   2. Atualiza handle_new_user() para usar inv.unidade_id
--   3. Policies para super-admin (direção da Matriz) gerenciar todas as unidades

-- ─── 1. unidade_id em invitations ────────────────────────────────────────────

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS unidade_id UUID
    REFERENCES public.unidades(id)
    DEFAULT '00000000-0000-0000-0000-000000000001';

-- Convites existentes ficam na Matriz (correto — foram criados por usuários da Matriz)
UPDATE public.invitations
  SET unidade_id = '00000000-0000-0000-0000-000000000001'
  WHERE unidade_id IS NULL;

ALTER TABLE public.invitations
  ALTER COLUMN unidade_id SET NOT NULL;

-- ─── 2. Trigger corrigido ─────────────────────────────────────────────────────
--   resolved_unidade lê inv.unidade_id; fallback à Matriz apenas para
--   usuários sem convite (cadastro orgânico via /login).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_role    TEXT  := 'responsavel';
  resolved_unidade UUID  := '00000000-0000-0000-0000-000000000001';
  raw_token        TEXT;
  inv              RECORD;
BEGIN
  -- 1. Perfil
  INSERT INTO public.profiles (id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Novo Usuário'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Convite
  raw_token := NEW.raw_user_meta_data->>'invite_token';

  IF raw_token IS NOT NULL THEN
    SELECT * INTO inv
    FROM public.invitations
    WHERE token = raw_token
      AND email = LOWER(TRIM(NEW.email))
    LIMIT 1;

    IF inv.id IS NOT NULL THEN
      resolved_role    := COALESCE(inv.role::text, 'responsavel');
      resolved_unidade := COALESCE(inv.unidade_id, '00000000-0000-0000-0000-000000000001');

      -- 3a. Auto-matrícula: responsável É o aluno
      IF (inv.metadata->>'is_self')::boolean = true THEN
        INSERT INTO public.alunos (
          id, nome_completo, data_nascimento, cpf, responsavel_id, unidade_id
        ) VALUES (
          gen_random_uuid(),
          COALESCE(
            inv.metadata->>'responsavel_nome',
            NEW.raw_user_meta_data->>'nome_completo',
            'Aluno'
          ),
          CASE
            WHEN inv.metadata->>'responsavel_data_nascimento' IS NOT NULL
             AND inv.metadata->>'responsavel_data_nascimento' <> ''
            THEN (inv.metadata->>'responsavel_data_nascimento')::date
            ELSE NULL
          END,
          NULLIF(inv.metadata->>'responsavel_cpf', ''),
          NEW.id,
          resolved_unidade
        )
        ON CONFLICT DO NOTHING;

      -- 3b. Fluxo normal: vincular alunos existentes
      ELSE
        IF inv.metadata IS NOT NULL
          AND inv.metadata ? 'existing_student_ids'
          AND jsonb_array_length(inv.metadata->'existing_student_ids') > 0
        THEN
          UPDATE public.alunos
          SET responsavel_id = NEW.id
          WHERE id = ANY(
            ARRAY(SELECT jsonb_array_elements_text(inv.metadata->'existing_student_ids')::uuid)
          );
        END IF;
      END IF;

      -- 4. Marcar convite usado
      UPDATE public.invitations
      SET used_at = NOW()
      WHERE id = inv.id AND used_at IS NULL;
    END IF;
  END IF;

  -- 5. Role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, resolved_role)
  ON CONFLICT DO NOTHING;

  -- 6. Vínculo com a unidade CORRETA do convite
  INSERT INTO public.user_unidades (user_id, unidade_id, role)
  VALUES (NEW.id, resolved_unidade, resolved_role)
  ON CONFLICT (user_id, unidade_id) DO UPDATE
    SET role = EXCLUDED.role;

  RETURN NEW;
END;
$$;

-- ─── 3. RLS — super-admin (direção da Matriz) vê e gerencia tudo ──────────────

-- Ver todas as unidades
DROP POLICY IF EXISTS "Superadmin ve todas unidades" ON public.unidades;
CREATE POLICY "Superadmin ve todas unidades" ON public.unidades
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_unidades
      WHERE user_id = auth.uid()
        AND unidade_id = '00000000-0000-0000-0000-000000000001'
        AND role = 'direcao'
    )
  );

-- Criar novas unidades
DROP POLICY IF EXISTS "Superadmin cria unidades" ON public.unidades;
CREATE POLICY "Superadmin cria unidades" ON public.unidades
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_unidades
      WHERE user_id = auth.uid()
        AND unidade_id = '00000000-0000-0000-0000-000000000001'
        AND role = 'direcao'
    )
  );

-- Editar qualquer unidade
DROP POLICY IF EXISTS "Superadmin edita unidades" ON public.unidades;
CREATE POLICY "Superadmin edita unidades" ON public.unidades
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_unidades
      WHERE user_id = auth.uid()
        AND unidade_id = '00000000-0000-0000-0000-000000000001'
        AND role = 'direcao'
    )
  );

-- Inserir convites em qualquer unidade (super-admin)
DROP POLICY IF EXISTS "Superadmin cria convites" ON public.invitations;
CREATE POLICY "Superadmin cria convites" ON public.invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_unidades
      WHERE user_id = auth.uid()
        AND unidade_id = '00000000-0000-0000-0000-000000000001'
        AND role = 'direcao'
    )
  );
