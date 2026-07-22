# 📦 ARQUIVOS PRONTOS - Copie e Cole!

## ⚠️ IMPORTANTE - LEIA PRIMEIRO!

Este arquivo contém **TODOS** os arquivos que você precisa copiar para seu projeto.

**Você precisa fazer 3 coisas:**

1. ✅ Executar um SQL no Supabase (5 minutos)
2. ✅ Criar 3 arquivos novos no seu projeto
3. ✅ Modificar 3 arquivos existentes no seu projeto

Vou te explicar cada passo de forma SUPER SIMPLES!

---

## 🗄️ PARTE 1: EXECUTAR SQL NO SUPABASE

### Passo 1.1: Acesse o Supabase
- Abra: https://supabase.com
- Clique no seu projeto
- No menu lateral, clique em **"SQL Editor"**

### Passo 1.2: Clique em "+ New query"

### Passo 1.3: Copie TODO este código e cole na tela:

```sql
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

CREATE INDEX IF NOT EXISTS idx_adjustments_user_date ON time_entry_adjustments(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_adjustments_entry ON time_entry_adjustments(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_status ON time_entry_adjustments(status);

ALTER TABLE time_entry_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to service role" ON time_entry_adjustments
  FOR ALL USING (true) WITH CHECK (true);
```

### Passo 1.4: Clique no botão **"Run"** (verde)
- Aguarde aparecer "Success"
- Pronto! Banco atualizado!

---

## 📁 PARTE 2: CRIAR 3 ARQUIVOS NOVOS

### ⚠️ IMPORTANTE SOBRE A PASTA `[id]`

A pasta `[id]` tem **COLCHETES** no nome! É assim mesmo: `[id]` com os colchetes.
Não remova os colchetes! Eles são importantes para o Next.js.

---

### 📄 ARQUIVO NOVO 1: `src/app/api/adjustments/route.ts`

**Caminho completo:** `src/app/api/adjustments/route.ts`

**Instruções:**
1. Na pasta `src/app/api/`, crie uma pasta chamada `adjustments`
2. Dentro dela, crie um arquivo chamado `route.ts`
3. Cole este conteúdo dentro do arquivo:

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

### 📄 ARQUIVO NOVO 2: `src/app/api/adjustments/[id]/route.ts`

**Caminho completo:** `src/app/api/adjustments/[id]/route.ts`

**⚠️ ATENÇÃO:** A pasta `[id]` tem colchetes! É assim mesmo!

**Instruções:**
1. Dentro da pasta `adjustments`, crie uma pasta chamada EXATAMENTE `[id]` (com colchetes!)
2. Dentro dela, crie um arquivo chamado `route.ts`
3. Cole este conteúdo:

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

### 📄 ARQUIVO NOVO 3: `src/app/rh/retificacoes/page.tsx`

**Caminho completo:** `src/app/rh/retificacoes/page.tsx`

**Instruções:**
1. Na pasta `src/app/rh/`, crie uma pasta chamada `retificacoes`
2. Dentro dela, crie um arquivo chamado `page.tsx`
3. Cole este conteúdo:

[O conteúdo é muito longo, então vou deixar no arquivo separado abaixo]

---

## 📝 PARTE 3: MODIFICAR 2 ARQUIVOS EXISTENTES

### 📄 ARQUIVO EXISTENTE 1: `src/db/schema.ts`

**Instruções:**
1. Abra o arquivo `src/db/schema.ts`
2. Vá até o **FINAL** do arquivo
3. **ANTES** da linha `export type User = ...`, adicione:

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

4. Nas linhas finais (onde estão os `export type`), adicione:

```typescript
export type TimeEntryAdjustment = typeof timeEntryAdjustments.$inferSelect;
export type NewTimeEntryAdjustment = typeof timeEntryAdjustments.$inferInsert;
```

---

### 📄 ARQUIVO EXISTENTE 2: `src/app/rh/page.tsx`

**Instruções:**
1. Abra o arquivo `src/app/rh/page.tsx`
2. Procure pela seção com os `<QuickActionCard>` (são vários cards)
3. Adicione este card **NO FINAL** da lista:

```tsx
<QuickActionCard
  icon={<Edit2 className="w-5 h-5" />}
  title="📝 Retificações"
  description="Solicitações de correção de ponto"
  onClick={() => router.push('/rh/retificacoes')}
  color="amber"
/>
```

4. No topo do arquivo, nos imports do `lucide-react`, adicione `Edit2` na lista:

```typescript
import {
  Users,
  Clock,
  // ... outros imports existentes ...
  Edit2,
} from 'lucide-react';
```

---

## ✅ PARTE 4: COMMIT E PUSH

Depois de criar/modificar todos os arquivos:

1. Abra o terminal na pasta do projeto
2. Execute:

```bash
git add .
git commit -m "Adiciona sistema de retificações de ponto"
git push
```

3. A Vercel vai fazer o deploy automaticamente!

---

## 🆘 PRECISA DE AJUDA?

Me diga em qual passo você está e o que está vendo na tela. Vou te guiar!

---

## 📊 CHECKLIST

- [ ] SQL executado no Supabase (tabela criada)
- [ ] Arquivo `src/app/api/adjustments/route.ts` criado
- [ ] Arquivo `src/app/api/adjustments/[id]/route.ts` criado
- [ ] Arquivo `src/app/rh/retificacoes/page.tsx` criado
- [ ] Arquivo `src/db/schema.ts` modificado
- [ ] Arquivo `src/app/rh/page.tsx` modificado
- [ ] `git add` e `git commit` feitos
- [ ] `git push` executado
- [ ] Deploy na Vercel concluído
