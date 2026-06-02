-- ================================================================
-- NEOMISSIO — LIMPEZA COMPLETA DE DADOS LEGADOS
-- ================================================================
-- Mantém: diretoria, professores, coordenação, turmas,
--         atividades, unidades, configurações, calendário
-- Remove: alunos, responsáveis, matrículas, pagamentos,
--         frequência, presenças, anamneses, certificados,
--         observações, contact_logs, convites, pré-cadastros
-- ================================================================
-- COMO USAR:
--   1. Acesse: Supabase Dashboard → SQL Editor
--   2. Execute primeiro o bloco PREVIEW para conferir os números
--   3. Só então execute o bloco CLEANUP
-- ================================================================



-- ================================================================
-- PASSO 1 — PREVIEW (execute primeiro, confira os números)
-- ================================================================

SELECT 'alunos'                 AS tabela, COUNT(*) AS total FROM alunos
UNION ALL
SELECT 'matriculas',                        COUNT(*)         FROM matriculas
UNION ALL
SELECT 'pagamentos',                        COUNT(*)         FROM pagamentos
UNION ALL
SELECT 'frequencia',                        COUNT(*)         FROM frequencia
UNION ALL
SELECT 'presencas',                         COUNT(*)         FROM presencas
UNION ALL
SELECT 'anamneses',                         COUNT(*)         FROM anamneses
UNION ALL
SELECT 'certificados',                      COUNT(*)         FROM certificados
UNION ALL
SELECT 'observacoes',                       COUNT(*)         FROM observacoes
UNION ALL
SELECT 'contact_logs',                      COUNT(*)         FROM contact_logs
UNION ALL
SELECT 'solicitacoes_matricula',            COUNT(*)         FROM solicitacoes_matricula
UNION ALL
SELECT 'invitations (responsavel)',         COUNT(*)         FROM invitations WHERE role = 'responsavel'
UNION ALL
SELECT 'profiles (so responsavel/secret)', COUNT(*)         FROM profiles
  WHERE id NOT IN (
    SELECT user_id FROM user_roles
    WHERE role IN ('direcao', 'professor', 'coordenacao')
  )
UNION ALL
SELECT 'profiles a manter (staff)',         COUNT(*)         FROM profiles
  WHERE id IN (
    SELECT user_id FROM user_roles
    WHERE role IN ('direcao', 'professor', 'coordenacao')
  );



-- ================================================================
-- PASSO 2 — CLEANUP (execute após confirmar o preview acima)
-- ================================================================

BEGIN;

-- Envios de comunicados (referencia responsaveis via responsavel_id)
DELETE FROM comunicado_envios;

-- Pagamentos (referencia matriculas)
DELETE FROM pagamentos;

-- Frequência (referencia matriculas)
DELETE FROM frequencia;

-- Presenças (referencia matriculas — tabela alternativa de presença)
DELETE FROM presencas;

-- Certificados (referencia alunos + matriculas)
DELETE FROM certificados;

-- Observações de alunos (referencia alunos + turmas + professores)
DELETE FROM observacoes;

-- Anamneses / ficha de saúde (referencia alunos)
DELETE FROM anamneses;

-- Log de contatos (referencia alunos + profiles)
DELETE FROM contact_logs;

-- Matrículas (referencia alunos + turmas)
DELETE FROM matriculas;

-- Alunos
DELETE FROM alunos;

-- Pré-cadastros e solicitações de matrícula
DELETE FROM solicitacoes_matricula;

-- Convites de responsáveis pendentes (os 255 + quaisquer outros)
DELETE FROM invitations WHERE role = 'responsavel';

-- Audit logs — limpa histórico de operações da migração
DELETE FROM audit_logs;

-- Remove referência de destinatário em comunicados que apontavam
-- para responsáveis que serão excluídos
UPDATE comunicados
SET destinatario_id = NULL
WHERE destinatario_id IS NOT NULL
  AND destinatario_id NOT IN (
    SELECT user_id FROM user_roles
    WHERE role IN ('direcao', 'professor', 'coordenacao')
  );

-- Roles de responsável e secretaria
-- Preserva usuários que também tenham role operacional (direcao/professor/coordenacao)
DELETE FROM user_roles
WHERE role IN ('responsavel', 'secretaria')
AND user_id NOT IN (
  SELECT user_id FROM user_roles
  WHERE role IN ('direcao', 'professor', 'coordenacao')
);

-- Vínculos de unidade para usuários sem nenhuma role restante
DELETE FROM user_unidades
WHERE user_id NOT IN (
  SELECT user_id FROM user_roles
);

-- Profiles sem nenhuma role restante (responsáveis/secretaria puros)
DELETE FROM profiles
WHERE id NOT IN (
  SELECT user_id FROM user_roles
);

COMMIT;



-- ================================================================
-- PASSO 3 — VERIFICAÇÃO PÓS-LIMPEZA (execute após o COMMIT)
-- ================================================================

SELECT 'alunos'              AS tabela, COUNT(*) AS deve_ser_zero FROM alunos
UNION ALL
SELECT 'matriculas',                    COUNT(*)                  FROM matriculas
UNION ALL
SELECT 'pagamentos',                    COUNT(*)                  FROM pagamentos
UNION ALL
SELECT 'profiles restantes',            COUNT(*)                  FROM profiles
UNION ALL
SELECT 'user_roles restantes',          COUNT(*)                  FROM user_roles
UNION ALL
SELECT 'professores',                   COUNT(*)                  FROM professores
UNION ALL
SELECT 'turmas',                        COUNT(*)                  FROM turmas
UNION ALL
SELECT 'atividades',                    COUNT(*)                  FROM atividades;
