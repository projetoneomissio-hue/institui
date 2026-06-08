-- Bug fix: novos usuários convidados entravam em user_roles mas NÃO em user_unidades.
-- Resultado: currentUnidade = null → RLS bloqueava todos os dados → diretores "não viam nada".
--
-- Solução:
-- 1. Trigger que sincroniza automaticamente user_roles → user_unidades na unidade padrão (Matriz).
-- 2. One-time fix para usuários já existentes que estão em user_roles mas não em user_unidades.

-- ── Trigger function ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_user_role_to_unidade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_unidade_id UUID := '00000000-0000-0000-0000-000000000001'; -- Matriz
BEGIN
  -- Ao inserir um novo role, garante que o usuário está vinculado à Matriz
  INSERT INTO public.user_unidades (user_id, unidade_id, role)
  VALUES (NEW.user_id, default_unidade_id, NEW.role)
  ON CONFLICT (user_id, unidade_id) DO UPDATE
    SET role = EXCLUDED.role; -- atualiza se o role mudar
  RETURN NEW;
END;
$$;

-- ── Trigger ───────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_sync_user_role_to_unidade ON public.user_roles;

CREATE TRIGGER trg_sync_user_role_to_unidade
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_role_to_unidade();

-- ── One-time fix: preenche lacunas para usuários existentes ───────────────────
INSERT INTO public.user_unidades (user_id, unidade_id, role)
SELECT
  ur.user_id,
  '00000000-0000-0000-0000-000000000001',
  ur.role
FROM public.user_roles ur
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_unidades uu
  WHERE uu.user_id = ur.user_id
    AND uu.unidade_id = '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (user_id, unidade_id) DO NOTHING;
