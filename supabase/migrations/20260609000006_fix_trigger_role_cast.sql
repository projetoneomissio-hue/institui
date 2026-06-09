-- Fix: resolved_role é TEXT mas user_roles.role é app_role (enum customizado).
-- PostgreSQL requer cast explícito de TEXT → app_role no INSERT.

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

  -- 5. Role — cast explícito TEXT → app_role obrigatório
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, resolved_role::app_role)
  ON CONFLICT DO NOTHING;

  -- 6. Vínculo com a unidade correta do convite
  INSERT INTO public.user_unidades (user_id, unidade_id, role)
  VALUES (NEW.id, resolved_unidade, resolved_role)
  ON CONFLICT (user_id, unidade_id) DO UPDATE
    SET role = EXCLUDED.role;

  RETURN NEW;
END;
$$;
