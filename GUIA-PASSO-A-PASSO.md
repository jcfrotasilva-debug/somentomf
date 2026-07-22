# 🚀 GUIA PASSO A PASSO - Sistema de Retificações

## ⚠️ LEIA PRIMEIRO!

Este guia vai te ajudar a adicionar o sistema de **Retificações de Ponto** ao seu projeto. Siga EXATAMENTE os passos na ordem.

---

## 📋 O QUE VAI SER ADICIONADO

✅ Servidor pode solicitar correção de ponto esquecido/atrasado  
✅ RH pode aprovar/rejeitar solicitações  
✅ RH pode fazer correções diretas  
✅ Auditoria completa de todas as alterações  
✅ Visualização na folha ponto mensal  

---

## 🗄️ PASSO 1: ATUALIZAR O BANCO DE DADOS (SUPABASE)

### 1.1 Acesse o Supabase
- Abra: https://supabase.com
- Clique no seu projeto
- No menu lateral, clique em **"SQL Editor"** (ícone de código)

### 1.2 Crie uma Nova Query
- Clique no botão **"+ New query"** (canto superior direito)

### 1.3 Cole Este Código SQL

```sql
-- Criar tabela de retificações
CREATE TABLE IF NOT EXISTS time_entry_adjustments (
  id SERIAL PRIMARY KEY,
  time_entry_id INTEGER REFERENCES time_entries(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_altered VARCHAR(20) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  adjustment_type VARCHAR(20) NOT NULL,
  requested_by_id INTEGER REFERENCES users(id),
  approved_by_id INTEGER REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  adjustment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_adjustments_user_date ON time_entry_adjustments(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_adjustments_entry ON time_entry_adjustments(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_status ON time_entry_adjustments(status);

-- Habilitar segurança
ALTER TABLE time_entry_adjustments ENABLE ROW LEVEL SECURITY;

-- Permitir acesso
CREATE POLICY "Allow full access to service role" ON time_entry_adjustments
  FOR ALL USING (true) WITH CHECK (true);
```

### 1.4 Execute
- Clique no botão **"Run"** (verde, canto inferior direito)
- Aguarde aparecer "Success. No rows returned"

### 1.5 Verifique
- No menu lateral, clique em **"Table Editor"**
- Você deve ver a tabela `time_entry_adjustments` na lista

✅ **BANCO ATUALIZADO!**

---

## 💻 PASSO 2: COPIAR OS ARQUIVOS DO CÓDIGO

Você precisa copiar **3 arquivos novos** e **modificar 2 arquivos existentes**.

### 📁 ARQUIVO 1: Criar `src/app/api/adjustments/route.ts`

#### 2.1 No seu projeto, crie esta estrutura de pastas:
```
src/
  app/
    api/
      adjustments/          ← CRIE ESTA PASTA
        route.ts            ← CRIE ESTE ARQUIVO
```

#### 2.2 Cole este conteúdo no arquivo `route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { timeEntryAdjustments, timeEntries, users } from '@/db/schema';
import { and, eq, desc, gte, lte } from 'drizzle-orm';
import { getCurrentBrazilDate } from '@/lib/timezone';

const VALID_FIELDS = ['checkIn', 'lunchOut', 'lunchIn', 'checkOut'];

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const statusParam = searchParams.get('status');
    const monthParam = searchParams.get('month');

    const whereClauses = [];

    if (session.role === 'server') {
      whereClauses.push(eq(timeEntryAdjustments.userId, session.userId));
    } else if (userIdParam) {
      whereClauses.push(eq(timeEntryAdjustments.userId, parseInt(userIdParam, 10)));
    }

    if (statusParam && statusParam !== 'all') {
      whereClauses.push(eq(timeEntryAdjustments.status, statusParam));
    }

    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      whereClauses.push(gte(timeEntryAdjustments.entryDate, startDate));
      whereClauses.push(lte(timeEntryAdjustments.entryDate, endDate));
    }

    const query = db
      .select({
        id: timeEntryAdjustments.id,
        timeEntryId: timeEntryAdjustments.timeEntryId,
        entryDate: timeEntryAdjustments.entryDate,
        userId: timeEntryAdjustments.userId,
        fieldAltered: timeEntryAdjustments.fieldAltered,
        oldValue: timeEntryAdjustments.oldValue,
        newValue: timeEntryAdjustments.newValue,
        reason: timeEntryAdjustments.reason,
        adjustmentType: timeEntryAdjustments.adjustmentType,
        requestedById: timeEntryAdjustments.requestedById,
        approvedById: timeEntryAdjustments.approvedById,
        status: timeEntryAdjustments.status,
        adjustmentDate: timeEntryAdjustments.adjustmentDate,
        createdAt: timeEntryAdjustments.createdAt,
        userName: users.name,
        userRegistration: users.registration,
        userPosition: users.position,
      })
      .from(timeEntryAdjustments)
      .leftJoin(users, eq(timeEntryAdjustments.userId, users.id));

    const results = whereClauses.length > 0
      ? await query.where(and(...whereClauses)).orderBy(desc(timeEntryAdjustments.createdAt))
      : await query.orderBy(desc(timeEntryAdjustments.createdAt));

    return NextResponse.json({ adjustments: results });
  } catch (error) {
    console.error('Erro ao listar retificações:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { entryDate, fieldAltered, oldValue, newValue, reason, userId, adjustmentType } = body;

    if (!entryDate || !fieldAltered || !reason) {
      return NextResponse.json(
        { error: 'Data, campo e motivo são obrigatórios' },
        { status: 400 }
      );
    }

    if (!VALID_FIELDS.includes(fieldAltered)) {
      return NextResponse.json(
        { error: 'Campo inválido' },
        { status: 400 }
      );
    }

    if (reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'O motivo deve ter pelo menos 10 caracteres' },
        { status: 400 }
      );
    }

    const today = getCurrentBrazilDate();
    if (entryDate > today) {
      return NextResponse.json(
        { error: 'Não é possível solicitar retificação para data futura' },
        { status: 400 }
      );
    }

    let targetUserId = session.userId;
    if (session.role === 'hr' && userId) {
      targetUserId = parseInt(userId, 10);
    }

    const existingEntry = await db
      .select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.userId, targetUserId),
        eq(timeEntries.entryDate, entryDate)
      ))
      .then((rows) => rows[0]);

    let timeEntryId = existingEntry?.id;
    if (!existingEntry) {
      const [newEntry] = await db
        .insert(timeEntries)
        .values({
          userId: targetUserId,
          entryDate,
        })
        .returning();
      timeEntryId = newEntry.id;
    }

    const existingPending = await db
      .select()
      .from(timeEntryAdjustments)
      .where(and(
        eq(timeEntryAdjustments.timeEntryId, timeEntryId!),
        eq(timeEntryAdjustments.fieldAltered, fieldAltered),
        eq(timeEntryAdjustments.status, 'pending')
      ))
      .then((rows) => rows[0]);

    if (existingPending) {
      return NextResponse.json(
        { error: 'Já existe uma solicitação pendente para este campo' },
        { status: 400 }
      );
    }

    let finalType = 'server_request';
    let status: 'pending' | 'approved' = 'pending';
    let approvedById: number | null = null;
    let adjustmentDate: Date | null = null;

    if (session.role === 'hr' && adjustmentType === 'hr_direct') {
      finalType = 'hr_direct';
      status = 'approved';
      approvedById = session.userId;
      adjustmentDate = new Date();

      const updateData: Record<string, unknown> = {};
      if (newValue) {
        updateData[fieldAltered] = newValue;
      } else {
        updateData[fieldAltered] = null;
      }
      updateData.updatedAt = new Date();

      await db
        .update(timeEntries)
        .set(updateData)
        .where(eq(timeEntries.id, timeEntryId!));
    }

    const [adjustment] = await db
      .insert(timeEntryAdjustments)
      .values({
        timeEntryId: timeEntryId!,
        entryDate,
        userId: targetUserId,
        fieldAltered,
        oldValue: oldValue || null,
        newValue: newValue || null,
        reason: reason.trim(),
        adjustmentType: finalType,
        requestedById: session.role === 'server' ? session.userId : null,
        approvedById,
        status,
        adjustmentDate,
      })
      .returning();

    const message = session.role === 'hr' && adjustmentType === 'hr_direct'
      ? 'Retificação aplicada diretamente com sucesso!'
      : 'Solicitação de retificação enviada! Aguardando análise do RH.';

    return NextResponse.json({ adjustment, message }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar retificação:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
```

---

### 📁 ARQUIVO 2: Criar pasta `src/app/api/adjustments/[id]/`

#### 2.3 Crie a pasta `[id]` dentro de `adjustments`:
```
src/
  app/
    api/
      adjustments/
        [id]/          ← CRIE ESTA PASTA (com colchetes!)
          route.ts     ← CRIE ESTE ARQUIVO
```

#### 2.4 Cole este conteúdo no arquivo `route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { timeEntryAdjustments, timeEntries } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Context) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id } = await params;
    const adjustmentId = parseInt(id, 10);

    const body = await _req.json();
    const { status, reviewNotes } = body;

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      );
    }

    const adjustment = await db
      .select()
      .from(timeEntryAdjustments)
      .where(eq(timeEntryAdjustments.id, adjustmentId))
      .then((rows) => rows[0]);

    if (!adjustment) {
      return NextResponse.json({ error: 'Retificação não encontrada' }, { status: 404 });
    }

    if (adjustment.status !== 'pending') {
      return NextResponse.json(
        { error: 'Esta retificação já foi processada' },
        { status: 400 }
      );
    }

    if (status === 'approved') {
      const updateData: Record<string, unknown> = {};
      if (adjustment.newValue) {
        updateData[adjustment.fieldAltered] = adjustment.newValue;
      } else {
        updateData[adjustment.fieldAltered] = null;
      }
      updateData.updatedAt = new Date();

      await db
        .update(timeEntries)
        .set(updateData)
        .where(eq(timeEntries.id, adjustment.timeEntryId!));
    }

    const [updated] = await db
      .update(timeEntryAdjustments)
      .set({
        status,
        approvedById: session.userId,
        adjustmentDate: new Date(),
        reason: reviewNotes
          ? `${adjustment.reason} | OBS RH: ${reviewNotes}`
          : adjustment.reason,
      })
      .where(eq(timeEntryAdjustments.id, adjustmentId))
      .returning();

    return NextResponse.json({
      adjustment: updated,
      message: status === 'approved' ? 'Retificação aprovada!' : 'Retificação rejeitada.',
    });
  } catch (error) {
    console.error('Erro ao analisar retificação:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
```

---

## 📝 PASSO 3: MODIFICAR ARQUIVOS EXISTENTES

### 📄 ARQUIVO 3: `src/db/schema.ts`

#### 3.1 Abra o arquivo `src/db/schema.ts`

#### 3.2 Role até o FINAL do arquivo (últimas linhas)

#### 3.3 ANTES das linhas `export type User = ...`, adicione:

```typescript
// Retificações de registros de ponto (auditoria completa)
export const timeEntryAdjustments = pgTable('time_entry_adjustments', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  timeEntryId: integer('time_entry_id').references(() => timeEntries.id, { onDelete: 'cascade' }),
  entryDate: date('entry_date').notNull(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fieldAltered: varchar('field_altered', { length: 20 }).notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  reason: text('reason').notNull(),
  adjustmentType: varchar('adjustment_type', { length: 20 }).notNull(),
  requestedById: integer('requested_by_id').references(() => users.id),
  approvedById: integer('approved_by_id').references(() => users.id),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  adjustmentDate: timestamp('adjustment_date').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

#### 3.4 NAS LINHAS DE EXPORT (final do arquivo), adicione:

```typescript
export type TimeEntryAdjustment = typeof timeEntryAdjustments.$inferSelect;
export type NewTimeEntryAdjustment = typeof timeEntryAdjustments.$inferInsert;
```

---

## 📄 ARQUIVO 4: `src/app/rh/page.tsx`

#### 4.1 Abra o arquivo `src/app/rh/page.tsx`

#### 4.2 Procure pela seção de cards (procure por `QuickActionCard`)

#### 4.3 Adicione este card NO FINAL da lista de cards:

```tsx
<QuickActionCard
  icon={<Edit2 className="w-5 h-5" />}
  title="📝 Retificações"
  description="Solicitações de correção de ponto"
  onClick={() => router.push('/rh/retificacoes')}
  color="amber"
/>
```

#### 4.4 No topo do arquivo, nos imports do lucide-react, adicione `Edit2`:

```typescript
import {
  // ... outros imports
  Edit2,  // ← ADICIONE ESTA LINHA
} from 'lucide-react';
```

---

## 📄 ARQUIVO 5: `src/app/dashboard/page.tsx`

#### 5.1 Abra o arquivo `src/app/dashboard/page.tsx`

#### 5.2 Procure pela linha ~70 com `useState<'ponto'` e modifique para:

```typescript
const [activeTab, setActiveTab] = useState<'ponto' | 'historico' | 'justificativas' | 'retificacoes'>('ponto');
```

#### 5.3 Procure pela seção de abas (com os botões "Registrar Ponto", "Histórico", "Justificativas")

#### 5.4 Adicione esta 4ª aba DEPOIS da aba de Justificativas:

```tsx
<button
  onClick={() => setActiveTab('retificacoes')}
  className={`flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
    activeTab === 'retificacoes'
      ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow'
      : 'text-slate-600 hover:bg-slate-100'
  }`}
>
  <Edit2 className="w-4 h-4" />
  Retificações
</button>
```

#### 5.5 Adicione estes estados (~linha 100):

```typescript
const [myAdjustments, setMyAdjustments] = useState<any[]>([]);
const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
const [adjustmentForm, setAdjustmentForm] = useState({
  entryDate: '',
  fieldAltered: 'checkIn',
  newValue: '',
  reason: '',
});
const [adjustmentLoading, setAdjustmentLoading] = useState(false);
```

#### 5.6 Adicione esta função:

```typescript
async function fetchMyAdjustments() {
  try {
    const res = await fetch('/api/adjustments');
    if (res.ok) {
      const data = await res.json();
      setMyAdjustments(data.adjustments);
    }
  } catch (e) {
    console.error(e);
  }
}
```

#### 5.7 No useEffect, adicione a chamada:

```typescript
useEffect(() => {
  if (user) {
    fetchTodayEntry();
    fetchHistory();
    fetchJustifications();
    fetchMyAdjustments(); // ← ADICIONE ESTA LINHA
  }
}, [user, historyMonth]);
```

#### 5.8 Adicione esta função para submeter:

```typescript
async function handleSubmitAdjustment(e: FormEvent) {
  e.preventDefault();
  setAdjustmentLoading(true);
  setMessage(null);
  try {
    const res = await fetch('/api/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adjustmentForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: 'error', text: data.error || 'Erro ao solicitar retificação' });
    } else {
      setMessage({ type: 'success', text: data.message });
      setAdjustmentForm({ entryDate: '', fieldAltered: 'checkIn', newValue: '', reason: '' });
      setShowAdjustmentModal(false);
      fetchMyAdjustments();
    }
  } catch {
    setMessage({ type: 'error', text: 'Erro de conexão' });
  } finally {
    setAdjustmentLoading(false);
    setTimeout(() => setMessage(null), 4000);
  }
}
```

#### 5.9 Adicione o conteúdo da aba (depois da aba de justificativas):

[Conteúdo muito longo - copie do arquivo original no sandbox]

---

## ✅ PASSO 4: COMMIT E PUSH

### 6.1 Abra o terminal na pasta do seu projeto

### 6.2 Execute:

```bash
git add .
git commit -m "Adiciona sistema completo de retificações com auditoria"
git push
```

---

## 🎉 PRONTO!

A Vercel vai fazer o deploy automaticamente e o sistema estará funcionando!

---

## 🆘 PRECISA DE AJUDA?

Se tiver dúvida em algum passo específico, me avise:
- Em qual passo você está?
- O que está aparecendo na tela?
- Qual arquivo você está tentando modificar?

Estou aqui para ajudar! 🚀
