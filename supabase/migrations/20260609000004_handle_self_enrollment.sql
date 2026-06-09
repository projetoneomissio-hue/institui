-- Auto-matrícula: quando o responsável É o próprio aluno (academias, personal, adultos)
--
-- Problema:
--   handle_new_user() linka alunos EXISTENTES via existing_student_ids
--   mas quando is_self = true, nenhum aluno existe ainda — o responsável É o aluno.
--   Resultado: Maria cria conta, entra no portal, não vê nenhum aluno vinculado.
--
-- Fix:
--   Quando inv.metadata->>'is_self' = true → cria registro em alunos
--   usando os dados do próprio responsável (nome, data_nascimento, cpf do metadata).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_role   TEXT  := 'responsavel';
  default_unidade UUID  := '00000000-0000-0000-0000-000000000001';
  raw_token       TEXT;
  inv             RECORD;
BEGIN
  -- 1. Criar perfil
  INSERT INTO public.profiles (id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Novo Usuário'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Processar convite
  raw_token := NEW.raw_user_meta_data->>'invite_token';

  IF raw_token IS NOT NULL THEN
    SELECT * INTO inv
    FROM public.invitations
    WHERE token = raw_token
      AND email = LOWER(TRIM(NEW.email))
    LIMIT 1;

    IF inv.id IS NOT NULL THEN
      resolved_role := COALESCE(inv.role, 'responsavel');

      -- 3a. Auto-matrícula: responsável É o aluno — criar registro
      IF (inv.metadata->>'is_self')::boolean = true THEN
        INSERT INTO public.alunos (
          id,
          nome_completo,
          data_nascimento,
          cpf,
          responsavel_id,
          unidade_id
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
          default_unidade
        )
        ON CONFLICT DO NOTHING;

      -- 3b. Fluxo normal: vincular alunos existentes ao responsável
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

      -- 4. Marcar convite como usado
      UPDATE public.invitations
      SET used_at = NOW()
      WHERE id = inv.id AND used_at IS NULL;
    END IF;
  END IF;

  -- 5. Inserir role correto
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, resolved_role)
  ON CONFLICT DO NOTHING;

  -- 6. Vincular à unidade padrão
  INSERT INTO public.user_unidades (user_id, unidade_id, role)
  VALUES (NEW.id, default_unidade, resolved_role)
  ON CONFLICT (user_id, unidade_id) DO UPDATE
    SET role = EXCLUDED.role;

  RETURN NEW;
END;
$$;
