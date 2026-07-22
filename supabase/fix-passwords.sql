-- =============================================================================
-- SCRIPT DE CORREÇÃO DE SENHAS - EE Profa. Marlene Frattini
-- =============================================================================
-- 
-- USE ESTE SCRIPT SE AS SENHAS NÃO ESTÃO FUNCIONANDO!
--
-- Este script redefine as senhas de todos os usuários com hashes bcrypt corretos:
-- - RH: senha = admin123
-- - Servidores: senha = 123456
--
-- IMPORTANTE:
-- Os hashes abaixo são gerados com bcrypt (10 rounds), que é o algoritmo usado
-- pelo sistema. Eles correspondem EXATAMENTE às senhas informadas.
--
-- COMO USAR:
-- 1. Acesse o Supabase → SQL Editor
-- 2. Cole este script
-- 3. Clique em "Run"
-- 4. As senhas serão redefinidas!
--
-- =============================================================================

-- Hash bcrypt para "admin123" (10 rounds, gerado com bcryptjs)
UPDATE users 
SET password = '$2b$10$H/SLJvLf18GRsrkSK647Pe3Lo9G1zOH2a/crwCcNwHYsSVlFY0Ck2'
WHERE email = 'rh@eemarlenefrattini.edu.br';

-- Hash bcrypt para "123456" (10 rounds, gerado com bcryptjs) - mesma senha para todos os servidores
UPDATE users 
SET password = '$2b$10$e0GQBd0/hAX3CsfrB1FLN.ggr139xalnzzhilHMiose8ssJBeCqpC'
WHERE role = 'server';

-- =============================================================================
-- VERIFICAÇÃO
-- =============================================================================
-- Após executar, rode esta query para confirmar:
-- SELECT id, name, email, role, LEFT(password, 10) as hash_preview FROM users;
-- =============================================================================
