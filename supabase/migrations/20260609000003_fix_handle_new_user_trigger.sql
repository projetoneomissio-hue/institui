-- Bug fix: handle_new_user() hardcodeia 'responsavel' para TODOS os usuários,
-- ignorando o invite_token no metadata.
--
-- Problema completo:
--   1. Diretor é convidado (invitations.role = 'direcao')
--   2. Diretor acessa /resgatar-convite → token validado → preenche nome+senha
--   3. supabase.auth.signUp() é chamado com invite_token no raw_user_meta_data
--   4. Este trigger dispara → insere 'responsavel' em user_roles (ERRADO!)
--   5. Invitation NÃO é marcada como usada no fluxo new_user
--   6. currentUnidade fica null (sem user_unidades) → RLS bloqueia TUDO
--
-- Esta migration corrige o trigger para:
--   A) Ler o invite_token do metadata → buscar role correto em invitations
--   B) Inserir role correto em user_roles
--   C) Vincular automaticamente à Matriz em user_unidades
--   D) Linkar alunos do metadata da invitation ao novo responsável
--   E) Marcar invitation como usada
--
-- Também faz one-time fix: corrige usuários existentes cujo role está errado.

-- ── 1. Trigger corrigido ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_role  TEXT  := 'responsavel';
  default_unidade UUID := '00000000-0000-0000-0000-000000000001';
  raw_token      TEXT;
  inv            RECORD;
BEGIN
  -- Criar perfil
  INSERT INTO public.profiles (id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Novo Usuário'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- Verificar se veio de convite
  raw_token := NEW.raw_user_meta_data->>'invite_token';

  IF raw_token IS NOT NULL THEN
    SELECT * INTO inv
    FROM public.invitations
    WHERE token = raw_token
      AND email  = LOWER(TRIM(NEW.email))
    LIMIT 1;

    IF inv.id IS NOT NULL THEN
      resolved_role := COALESCE(inv.role, 'responsavel');

      -- Linkar alunos existentes ao novo responsável (se houver)
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

      -- Marcar invitation como usada
      UPDATE public.invitations
      SET used_at = NOW()
      WHERE id = inv.id AND used_at IS NULL;
    END IF;
  END IF;

  -- Inserir role correto
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, resolved_role)
  ON CONFLICT DO NOTHING;

  -- Vincular à Matriz automaticamente
  INSERT INTO public.user_unidades (user_id, unidade_id, role)
  VALUES (NEW.id, default_unidade, resolved_role)
  ON CONFLICT (user_id, unidade_id) DO UPDATE
    SET role = EXCLUDED.role;

  RETURN NEW;
END;
$$;

-- ── 2. One-time fix: corrigir usuários já existentes com role errado ─────────
-- Encontra usuários cujo user_roles.role = 'responsavel' MAS cujo convite
-- diz outro role. Atualiza ambas as tabelas.
-- (invitations.email é UNIQUE, então há no máximo 1 convite por e-mail)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT DISTINCT ON (ur.user_id)
      ur.user_id,
      inv.role::text AS correct_role
    FROM public.user_roles ur
    JOIN auth.users au ON au.id = ur.user_id
    JOIN public.invitations inv
      ON LOWER(TRIM(inv.email)) = LOWER(TRIM(au.email))
    WHERE ur.role = 'responsavel'
      AND inv.role::text IN ('direcao', 'coordenacao', 'professor', 'secretaria')
    ORDER BY ur.user_id, inv.created_at DESC
  LOOP
    -- Atualizar user_roles
    UPDATE public.user_roles
    SET role = rec.correct_role
    WHERE user_id = rec.user_id AND role = 'responsavel';

    -- Vincular ou atualizar na Matriz
    INSERT INTO public.user_unidades (user_id, unidade_id, role)
    VALUES (
      rec.user_id,
      '00000000-0000-0000-0000-000000000001',
      rec.correct_role
    )
    ON CONFLICT (user_id, unidade_id) DO UPDATE
      SET role = EXCLUDED.role;

    RAISE NOTICE 'Corrigido: user_id=%, role responsavel → %', rec.user_id, rec.correct_role;
  END LOOP;
END $$;
