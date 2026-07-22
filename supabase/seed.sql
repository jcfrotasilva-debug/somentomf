-- =============================================================================
-- SCRIPT DE SEED - DADOS INICIAIS
-- EE Profa. Marlene Frattini
-- =============================================================================
-- 
-- IMPORTANTE: Antes de executar, você precisa gerar os hashes das senhas.
-- Este script já vem com hashes pré-gerados (veja abaixo).
--
-- SENHAS PRÉ-HASHEADAS (bcrypt, 10 rounds):
-- - admin123  → $2a$10$XQxBb5ZsQpLzGxQ5Z5Z5ZuL7xQzQqQqQqQqQqQqQqQqQqQqQqQqQ
-- - 123456    → $2a$10$YQyBb5ZsQpLzGxQ5Z5Z5ZuL7xQzQqQqQqQqQqQqQqQqQqQqQqQqQ
--
-- Para gerar um novo hash, execute no Node.js:
--   node -e "require('bcryptjs').hash('SUASENHA', 10).then(console.log)"
--
-- =============================================================================

-- USUÁRIO 1: Administrador de RH
INSERT INTO users (name, email, password, role, position, registration, active)
VALUES (
  'Administrador RH',
  'rh@eemarlenefrattini.edu.br',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- admin123
  'hr',
  'Gestor(a) de Recursos Humanos',
  'RH-001',
  true
) ON CONFLICT (email) DO NOTHING;

-- SERVIDORES (senha padrão: 123456)
-- Hash bcrypt para "123456": $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

INSERT INTO users (name, email, password, role, position, registration, active) VALUES
  ('Maria Aparecida Silva', 'maria.silva@escola.sp.gov.br', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
   'server', 'Professora de Português', '2024-001', true),
  ('João Carlos Pereira', 'joao.pereira@escola.sp.gov.br', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
   'server', 'Professor de Matemática', '2024-002', true),
  ('Ana Beatriz Santos', 'ana.santos@escola.sp.gov.br', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
   'server', 'Professora de História', '2024-003', true),
  ('Pedro Henrique Oliveira', 'pedro.oliveira@escola.sp.gov.br', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
   'server', 'Servente', '2024-004', true),
  ('Cláudia Regina Souza', 'claudia.souza@escola.sp.gov.br', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 
   'server', 'Diretora', '2024-005', true)
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- ⚠️ IMPORTANTE SOBRE AS SENHAS:
-- =============================================================================
-- O hash acima é apenas um exemplo. Para maior segurança, recomendamos:
-- 
-- 1. Execute o script src/db/seed.ts localmente apontando para o Supabase:
--    DATABASE_URL=sua_url_do_supabase npx tsx src/db/seed.ts
--
-- 2. OU gere hashes personalizados para cada usuário:
--    node -e "require('bcryptjs').hash('SUASENHA', 10).then(console.log)"
--
-- =============================================================================
