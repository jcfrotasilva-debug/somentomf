import { pgTable, text, timestamp, varchar, boolean, integer, date, time } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('server'), // 'server' ou 'hr'
  position: text('position'), // Cargo/função
  registration: varchar('registration', { length: 50 }), // Matrícula
  department: text('department'), // Setor/Departamento
  admissionDate: date('admission_date'), // Data de admissão
  phone: varchar('phone', { length: 20 }), // Telefone
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const timeEntries = pgTable('time_entries', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entryDate: date('entry_date').notNull(), // Data no formato YYYY-MM-DD (timezone Brasil)
  checkIn: timestamp('check_in'),
  lunchOut: timestamp('lunch_out'),
  lunchIn: timestamp('lunch_in'),
  checkOut: timestamp('check_out'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const justifications = pgTable('justifications', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  justificationDate: date('justification_date').notNull(), // Data que está justificando (YYYY-MM-DD)
  reason: text('reason').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Horários de trabalho por servidor e dia da semana
// weekday: 0=Domingo, 1=Segunda, ..., 6=Sábado
export const workSchedules = pgTable('work_schedules', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  weekday: integer('weekday').notNull(), // 0-6
  checkInTime: time('check_in_time'), // HH:MM:SS
  lunchOutTime: time('lunch_out_time'),
  lunchInTime: time('lunch_in_time'),
  checkOutTime: time('check_out_time'),
  isWorkday: boolean('is_workday').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Configurações globais do sistema
export const settings = pgTable('settings', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Ocorrências de dias específicos (feriados, ponto facultativo, etc)
export const dayOccurrences = pgTable('day_occurrences', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  occurrenceDate: date('occurrence_date').notNull().unique(), // YYYY-MM-DD
  type: varchar('type', { length: 30 }).notNull(), // 'holiday' | 'optional_point' | 'no_school_day'
  name: text('name').notNull(), // Ex: "Natal", "Carnaval", "Recesso escolar"
  scope: varchar('scope', { length: 30 }).notNull().default('national'), // 'national', 'state', 'municipal', 'school'
  createdAt: timestamp('created_at').defaultNow(),
});

// Ausências/bloqueios do servidor (férias, licenças, etc)
export const serverAbsences = pgTable('server_absences', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }).notNull(), // 'vacation', 'medical_leave', 'maternity_leave', 'paternity_leave', 'bereavement_leave', 'marriage_leave', 'technical_orientation', 'other'
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  reason: text('reason'),
  documentRef: text('document_ref'), // Número do documento/atestado/portaria
  createdAt: timestamp('created_at').defaultNow(),
});

// Retificações de registros de ponto (auditoria completa)
export const timeEntryAdjustments = pgTable('time_entry_adjustments', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  timeEntryId: integer('time_entry_id').references(() => timeEntries.id, { onDelete: 'cascade' }),
  entryDate: date('entry_date').notNull(), // Data do registro original
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fieldAltered: varchar('field_altered', { length: 20 }).notNull(), // 'checkIn', 'lunchOut', 'lunchIn', 'checkOut'
  oldValue: text('old_value'), // Valor anterior (ISO timestamp ou NULL)
  newValue: text('new_value'), // Novo valor (ISO timestamp)
  reason: text('reason').notNull(), // Motivo da alteração
  adjustmentType: varchar('adjustment_type', { length: 20 }).notNull(), // 'server_request' ou 'hr_direct'
  requestedById: integer('requested_by_id').references(() => users.id), // Servidor que solicitou (se for solicitação)
  approvedById: integer('approved_by_id').references(() => users.id), // RH que aprovou/executou
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected
  adjustmentDate: timestamp('adjustment_date').defaultNow(), // Quando foi aprovado/rejeitado
  createdAt: timestamp('created_at').defaultNow(), // Quando foi solicitada/criada
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
export type Justification = typeof justifications.$inferSelect;
export type NewJustification = typeof justifications.$inferInsert;
export type WorkSchedule = typeof workSchedules.$inferSelect;
export type NewWorkSchedule = typeof workSchedules.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type DayOccurrence = typeof dayOccurrences.$inferSelect;
export type NewDayOccurrence = typeof dayOccurrences.$inferInsert;
export type ServerAbsence = typeof serverAbsences.$inferSelect;
export type NewServerAbsence = typeof serverAbsences.$inferInsert;
export type TimeEntryAdjustment = typeof timeEntryAdjustments.$inferSelect;
export type NewTimeEntryAdjustment = typeof timeEntryAdjustments.$inferInsert;
