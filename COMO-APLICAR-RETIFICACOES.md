# 🔄 Como Aplicar as Alterações de Retificações

## 📋 Resumo das Mudanças

Este guia explica como adicionar o sistema completo de **Retificações de Ponto** ao seu projeto.

---

## 🗄️ PASSO 1: Atualizar o Banco de Dados (Supabase)

### Execute no SQL Editor do Supabase:

```sql
CREATE TABLE IF NOT EXISTS time_entry_adjustments (
  id SERIAL PRIMARY KEY,
  time_entry_id INTEGER REFERENCES time_entries(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_altered VARCHAR(20) NOT NULL CHECK (field_altered IN ('checkIn', 'lunchOut', 'lunchIn', 'checkOut')),
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('server_request', 'hr_direct')),
  requested_by_id INTEGER REFERENCES users(id),
  approved_by_id INTEGER REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  adjustment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adjustments_user_date ON time_entry_adjustments(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_adjustments_entry ON time_entry_adjustments(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_status ON time_entry_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_adjustments_type ON time_entry_adjustments(adjustment_type);

ALTER TABLE time_entry_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to service role" ON time_entry_adjustments
  FOR ALL USING (true) WITH CHECK (true);
```

---

## 📁 PASSO 2: Copiar os Arquivos

### Arquivo 1: `src/db/schema.ts`

**Abra o arquivo `src/db/schema.ts` e adicione NO FINAL (antes da última linha):**

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

export type TimeEntryAdjustment = typeof timeEntryAdjustments.$inferSelect;
export type NewTimeEntryAdjustment = typeof timeEntryAdjustments.$inferInsert;
```

---

### Arquivo 2: Criar `src/app/api/adjustments/route.ts`

**Crie um novo arquivo:** `src/app/api/adjustments/route.ts`

Copie o conteúdo completo do arquivo que está neste sandbox (use o comando abaixo para ver):

```bash
cat src/app/api/adjustments/route.ts
```

---

### Arquivo 3: Criar `src/app/api/adjustments/[id]/route.ts`

**Crie a pasta e o arquivo:**

```bash
mkdir -p src/app/api/adjustments/[id]
```

Depois crie o arquivo `route.ts` dentro dessa pasta, copiando o conteúdo do sandbox.

---

### Arquivo 4: Criar `src/app/rh/retificacoes/page.tsx`

**Crie a pasta e o arquivo:**

```bash
mkdir -p src/app/rh/retificacoes
```

Copie o arquivo `page.tsx` do sandbox para esta pasta.

---

### Arquivo 5: Modificar `src/app/dashboard/page.tsx`

**Abra o arquivo e faça estas alterações:**

1. **Na linha ~70**, adicione 'retificacoes' ao estado:

```typescript
const [activeTab, setActiveTab] = useState<'ponto' | 'historico' | 'justificativas' | 'retificacoes'>('ponto');
```

2. **Na seção de abas (~linha 478)**, adicione a 4ª aba:

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

3. **Adicione estados para retificações (~linha 100):**

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

4. **Adicione função para buscar retificações:**

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

5. **Chame a função no useEffect:**

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

6. **Adicione função para submeter retificação:**

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

7. **Adicione o conteúdo da aba retificações (depois da aba de justificativas):**

Procure por `{activeTab === 'justificativas' && (` e depois do fechamento `)}`, adicione:

```tsx
{activeTab === 'retificacoes' && (
  <div>
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Edit2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 mb-1">Solicitar Retificação de Registro</h3>
          <p className="text-sm text-slate-600 mb-4">
            Esqueceu de registrar algum ponto? Chegou atrasado? Solicite a correção e o RH analisará.
          </p>
          <button
            onClick={() => setShowAdjustmentModal(true)}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Nova Retificação
          </button>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Minhas Retificações</h2>
      {myAdjustments.length === 0 ? (
        <div className="text-center py-12">
          <Edit2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Nenhuma retificação solicitada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myAdjustments.map((a: any) => (
            <div key={a.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold text-slate-900">
                    {formatDateBR(a.entryDate)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.fieldAltered === 'checkIn' && '🟢 Entrada'}
                    {a.fieldAltered === 'lunchOut' && '🟡 Saída Almoço'}
                    {a.fieldAltered === 'lunchIn' && '🟠 Retorno Almoço'}
                    {a.fieldAltered === 'checkOut' && '🔴 Saída'}
                    {' · '}
                    Novo horário: <strong className="font-mono">{formatTimeInBrazil(a.newValue)}</strong>
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  a.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300'
                  : a.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                }`}>
                  {a.status === 'approved' ? '✓ APROVADA' : a.status === 'rejected' ? '✗ REJEITADA' : '⧗ PENDENTE'}
                </span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{a.reason}</p>
              {a.adjustmentDate && a.status !== 'pending' && (
                <p className="text-xs text-slate-500 mt-2">
                  {a.status === 'approved' ? 'Aprovada' : 'Rejeitada'} em {formatBrazilDateTime(a.adjustmentDate)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
```

8. **Adicione o modal de solicitação de retificação (no final, antes do fechamento `</div>`):**

```tsx
{showAdjustmentModal && (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
          <Edit2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900">Solicitar Retificação</h3>
          <p className="text-xs text-slate-500">Informe qual ponto precisa ser corrigido</p>
        </div>
      </div>

      <form onSubmit={handleSubmitAdjustment} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Data do Registro *
          </label>
          <input
            type="date"
            value={adjustmentForm.entryDate}
            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, entryDate: e.target.value })}
            required
            max={getCurrentBrazilDate()}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Informe a data em que o registro deveria ter sido feito
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Qual ponto foi esquecido/alterado? *
          </label>
          <select
            value={adjustmentForm.fieldAltered}
            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, fieldAltered: e.target.value })}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="checkIn">🟢 Entrada</option>
            <option value="lunchOut">🟡 Saída para Almoço</option>
            <option value="lunchIn">🟠 Retorno do Almoço</option>
            <option value="checkOut">🔴 Saída do Expediente</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Horário Correto *
          </label>
          <input
            type="time"
            value={adjustmentForm.newValue}
            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, newValue: e.target.value })}
            required
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            Ex: se chegou às 08:30 em vez das 08:00, digite 08:30
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Motivo da Retificação *
          </label>
          <textarea
            value={adjustmentForm.reason}
            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
            required
            minLength={10}
            rows={4}
            placeholder="Descreva o motivo. Ex: Esqueci de registrar a saída para almoço..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setShowAdjustmentModal(false);
              setAdjustmentForm({ entryDate: '', fieldAltered: 'checkIn', newValue: '', reason: '' });
            }}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={adjustmentLoading}
            className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-medium py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {adjustmentLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar Solicitação
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
```

---

## 📝 PASSO 3: Adicionar Card no Painel do RH

### Arquivo: `src/app/rh/page.tsx`

**Localize a seção de cards (procure por "QuickActionCard") e adicione:**

```tsx
<QuickActionCard
  icon={<Edit2 className="w-5 h-5" />}
  title="📝 Retificações"
  description="Solicitações de correção de ponto"
  onClick={() => router.push('/rh/retificacoes')}
  color="amber"
/>
```

---

## 📝 PASSO 4: Copiar Página do RH

### Arquivo: `src/app/rh/retificacoes/page.tsx`

**Crie a pasta e copie o arquivo completo do sandbox.**

Use este comando para ver o conteúdo:

```bash
cat src/app/rh/retificacoes/page.tsx
```

Depois copie o conteúdo e cole no arquivo novo.

---

## ✅ PASSO 5: Commit e Push

```bash
git add .
git commit -m "Adiciona sistema de retificações com auditoria"
git push
```

---

## 🎯 PASSO 6: Verificar na Vercel

1. Acesse o dashboard da Vercel
2. Aguarde o deploy automático
3. Teste o fluxo completo

---

## 🆘 Precisa de Ajuda?

Se tiver dificuldade em copiar algum arquivo, me avise qual arquivo específico você precisa e eu posso mostrar o conteúdo completo aqui!

**Arquivos que posso mostrar na íntegra:**
- `src/app/api/adjustments/route.ts` (228 linhas)
- `src/app/api/adjustments/[id]/route.ts`
- `src/app/rh/retificacoes/page.tsx`

Basta pedir! 🚀
