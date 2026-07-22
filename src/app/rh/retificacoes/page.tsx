'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  ArrowLeft,
  Edit2,
  Check,
  X,
  Clock,
  Calendar,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { formatDateBR, formatBrazilDateTime, formatTimeInBrazil } from '@/lib/timezone';

type Adjustment = {
  id: number;
  timeEntryId: number | null;
  entryDate: string;
  userId: number;
  fieldAltered: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string;
  adjustmentType: string;
  requestedById: number | null;
  approvedById: number | null;
  status: string;
  adjustmentDate: string | null;
  createdAt: string;
  userName: string | null;
  userRegistration: string | null;
  userPosition: string | null;
};

const FIELD_LABELS: Record<string, string> = {
  checkIn: '🟢 Entrada',
  lunchOut: '🟡 Saída Almoço',
  lunchIn: '🟠 Retorno Almoço',
  checkOut: '🔴 Saída',
};

function AdjustmentsContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal para criar retificação direta
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [directForm, setDirectForm] = useState({
    userId: '',
    entryDate: '',
    fieldAltered: 'checkIn',
    newValue: '',
    reason: '',
  });
  const [directLoading, setDirectLoading] = useState(false);

  // Modal para analisar
  const [reviewModal, setReviewModal] = useState<Adjustment | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'hr')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'hr') {
      fetchAdjustments();
    }
  }, [user, month]);

  async function fetchAdjustments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/adjustments?month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setAdjustments(data.adjustments);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(status: 'approved' | 'rejected') {
    if (!reviewModal) return;
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/adjustments/${reviewModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewNotes }),
      });
      if (res.ok) {
        setReviewModal(null);
        setReviewNotes('');
        fetchAdjustments();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleDirectSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDirectLoading(true);
    try {
      const res = await fetch('/api/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...directForm,
          userId: parseInt(directForm.userId, 10),
          adjustmentType: 'hr_direct',
        }),
      });
      if (res.ok) {
        setShowDirectModal(false);
        setDirectForm({ userId: '', entryDate: '', fieldAltered: 'checkIn', newValue: '', reason: '' });
        fetchAdjustments();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDirectLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filtered = adjustments.filter((a) => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const pendingCount = adjustments.filter(a => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 pb-12">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl border-b border-slate-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/rh')}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-white font-bold text-lg sm:text-xl">Retificações de Ponto</h1>
                <p className="text-slate-400 text-xs sm:text-sm">Analisar e gerenciar solicitações dos servidores</p>
              </div>
            </div>
            <button
              onClick={() => setShowDirectModal(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-lg transition flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              <span className="hidden sm:inline">Correção Direta</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total" value={adjustments.length} icon={<Edit2 className="w-5 h-5" />} color="blue" />
          <StatCard label="Pendentes" value={pendingCount} icon={<Clock className="w-5 h-5" />} color="amber" />
          <StatCard label="Aprovadas" value={adjustments.filter(a => a.status === 'approved').length} icon={<CheckCircle2 className="w-5 h-5" />} color="green" />
          <StatCard label="Rejeitadas" value={adjustments.filter(a => a.status === 'rejected').length} icon={<XCircle className="w-5 h-5" />} color="red" />
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  filter === f
                    ? 'bg-white shadow text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f === 'all' && 'Todas'}
                {f === 'pending' && `Pendentes (${pendingCount})`}
                {f === 'approved' && 'Aprovadas'}
                {f === 'rejected' && 'Rejeitadas'}
              </button>
            ))}
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Lista */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Edit2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhuma retificação encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => (
                <div key={a.id} className={`border-2 rounded-2xl p-5 transition ${
                  a.status === 'pending' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {(a.userName || '?').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900">{a.userName}</p>
                        <p className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                          {a.userPosition && <span>📋 {a.userPosition}</span>}
                          {a.userRegistration && <span>🆔 {a.userRegistration}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        a.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300'
                        : a.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                      }`}>
                        {a.status === 'approved' ? '✓ APROVADA' : a.status === 'rejected' ? '✗ REJEITADA' : '⧗ PENDENTE'}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                        a.adjustmentType === 'server_request' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {a.adjustmentType === 'server_request' ? '📨 Solicitação' : '⚡ Correção Direta'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase">Data</p>
                      <p className="text-sm font-bold text-slate-900">{formatDateBR(a.entryDate)}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase">Campo</p>
                      <p className="text-sm font-bold text-slate-900">{FIELD_LABELS[a.fieldAltered]}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase">Novo Horário</p>
                      <p className="text-sm font-bold text-slate-900 font-mono">{formatTimeInBrazil(a.newValue)}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Motivo</p>
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{a.reason}</p>
                  </div>

                  <div className="text-xs text-slate-500 mb-3">
                    Solicitada em {formatBrazilDateTime(a.createdAt)}
                  </div>

                  {a.status === 'pending' && (
                    <div className="flex gap-2 pt-3 border-t border-slate-200">
                      <button
                        onClick={() => { setReviewModal(a); setReviewNotes(''); }}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        Analisar Solicitação
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal de análise */}
      {reviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Analisar Retificação</h3>
              <button
                onClick={() => setReviewModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="font-semibold text-amber-900 mb-1">{reviewModal.userName}</p>
              <p className="text-sm text-amber-800">
                {FIELD_LABELS[reviewModal.fieldAltered]} em {formatDateBR(reviewModal.entryDate)}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Novo horário: <strong className="font-mono">{formatTimeInBrazil(reviewModal.newValue)}</strong>
              </p>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Motivo</p>
              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{reviewModal.reason}</p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                Observação do RH (opcional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                placeholder="Adicione uma observação..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleReview('rejected')}
                disabled={reviewLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Rejeitar
              </button>
              <button
                onClick={() => handleReview('approved')}
                disabled={reviewLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Aprovar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de correção direta */}
      {showDirectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Correção Direta pelo RH</h3>
              <button
                onClick={() => setShowDirectModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-800">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              A correção será aplicada imediatamente. Use esta opção quando o servidor comparecer pessoalmente ao RH.
            </div>

            <form onSubmit={handleDirectSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Servidor *</label>
                <select
                  value={directForm.userId}
                  onChange={(e) => setDirectForm({ ...directForm, userId: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Selecione...</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data *</label>
                <input
                  type="date"
                  value={directForm.entryDate}
                  onChange={(e) => setDirectForm({ ...directForm, entryDate: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Campo *</label>
                <select
                  value={directForm.fieldAltered}
                  onChange={(e) => setDirectForm({ ...directForm, fieldAltered: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="checkIn">🟢 Entrada</option>
                  <option value="lunchOut">🟡 Saída Almoço</option>
                  <option value="lunchIn">🟠 Retorno Almoço</option>
                  <option value="checkOut">🔴 Saída</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Novo Horário *</label>
                <input
                  type="time"
                  value={directForm.newValue}
                  onChange={(e) => setDirectForm({ ...directForm, newValue: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Motivo *</label>
                <textarea
                  value={directForm.reason}
                  onChange={(e) => setDirectForm({ ...directForm, reason: e.target.value })}
                  required
                  minLength={10}
                  rows={3}
                  placeholder="Ex: Servidor compareceu ao RH e relatou esquecimento do registro de saída..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDirectModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={directLoading}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {directLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Aplicar Correção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    green: 'from-green-500 to-emerald-600',
    amber: 'from-amber-500 to-orange-600',
    red: 'from-red-500 to-rose-600',
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className={`w-9 h-9 bg-gradient-to-br ${colors[color]} rounded-xl flex items-center justify-center text-white mb-2 shadow`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
    </div>
  );
}

export default function AdjustmentsPage() {
  return (
    <AuthProvider>
      <AdjustmentsContent />
    </AuthProvider>
  );
}
