-- =============================================================================
-- SCHEMA DO BANCO DE DADOS - SISTEMA DE PONTO
-- EE Profa. Marlene Frattini
-- =============================================================================
-- 
-- EXECUTE ESTE SCRIPT NO SUPABASE:
-- 1. Acesse: https://supabase.com/dashboard/
-- 2. Selecione seu projeto
-- 3. Vá em: SQL Editor (ícone no menu lateral)
-- 4. Clique em "New query"
-- 5. Cole este script e clique em "Run"
--
-- =============================================================================

-- 1. USUÁRIOS (servidores e RH)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'server', -- 'server' ou 'hr'
  position TEXT,
  registration VARCHAR(50),
  department TEXT,
  admission_date DATE,
  phone VARCHAR(20),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. REGISTROS DE PONTO
CREATE TABLE IF NOT EXISTS time_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  lunch_out TIMESTAMPTZ,
  lunch_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

-- 3. JUSTIFICATIVAS DE FALTA
CREATE TABLE IF NOT EXISTS justifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  justification_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, justification_date)
);

-- 4. HORÁRIOS DE TRABALHO POR DIA DA SEMANA
CREATE TABLE IF NOT EXISTS work_schedules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL, -- 0=Domingo, 1=Segunda, ..., 6=Sábado
  check_in_time TIME,
  lunch_out_time TIME,
  lunch_in_time TIME,
  check_out_time TIME,
  is_workday BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, weekday)
);

-- 5. CONFIGURAÇÕES DO SISTEMA
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. OCORRÊNCIAS DE DIAS (feriados, ponto facultativo, etc)
CREATE TABLE IF NOT EXISTS day_occurrences (
  id SERIAL PRIMARY KEY,
  occurrence_date DATE NOT NULL UNIQUE,
  type VARCHAR(30) NOT NULL, -- 'holiday', 'optional_point', 'no_school_day'
  name TEXT NOT NULL,
  scope VARCHAR(30) NOT NULL DEFAULT 'national', -- 'national', 'state', 'municipal', 'school'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AUSENCIAS/BLOQUEIOS DO SERVIDOR (férias, licenças, etc)
CREATE TABLE IF NOT EXISTS server_absences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL, -- 'vacation', 'medical_leave', 'maternity_leave', etc
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  document_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ÍNDICES PARA MELHOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_time_entries_user_date 
  ON time_entries(user_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_time_entries_date 
  ON time_entries(entry_date);

CREATE INDEX IF NOT EXISTS idx_justifications_user_date 
  ON justifications(user_id, justification_date);

CREATE INDEX IF NOT EXISTS idx_justifications_status 
  ON justifications(status);

CREATE INDEX IF NOT EXISTS idx_work_schedules_user 
  ON work_schedules(user_id);

CREATE INDEX IF NOT EXISTS idx_day_occurrences_date 
  ON day_occurrences(occurrence_date);

CREATE INDEX IF NOT EXISTS idx_server_absences_user 
  ON server_absences(user_id);

CREATE INDEX IF NOT EXISTS idx_server_absences_dates 
  ON server_absences(start_date, end_date);

-- =============================================================================
-- ATIVAR ROW LEVEL SECURITY (RLS) - SEGURANÇA DO SUPABASE
-- =============================================================================
-- Importante: Ative RLS para proteger os dados em produção
-- O sistema já usa autenticação via JWT próprio, mas RLS adiciona outra camada

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_absences ENABLE ROW LEVEL SECURITY;

-- Política: Permitir acesso total via service_role (backend)
-- Para isso, o Drizzle ORM deve usar a string de conexão "postgres" (não "anon")
-- O Supabase libera acesso total quando se conecta como "postgres" diretamente

CREATE POLICY "Allow full access to service role" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to service role" ON time_entries
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to service role" ON justifications
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to service role" ON work_schedules
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to service role" ON settings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to service role" ON day_occurrences
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to service role" ON server_absences
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- SCRIPT CONCLUÍDO! ✅
-- Todas as tabelas foram criadas com sucesso.
-- Agora execute o script de seed para criar os usuários iniciais.
-- =============================================================================
