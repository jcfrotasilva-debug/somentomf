'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  ArrowLeft,
  FileText,
  Loader2,
  Check,
  X,
  Calendar,
} from 'lucide-react';
import { formatDateBR, formatBrazilDateTime } from '@/lib/timezone';

type Justification = {
  id: number;
  userId: number;
  justificationDate: string;
  reason: string;
  status: string;
  reviewNotes: string | null;
  createdAt: string;
  userName: string | null;
  userRegistration: string | null;
  userPosition: string | null;
};

function JustificationsContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [reviewModal, setReviewModal] = useState<Justification | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'hr')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'hr') {
      fetchJustifications();
    }
  }, [user]);

  async function fetchJustifications() {
    try {
      const res = await fetch('/api/justifications');
      if (res.ok) {
        const data = await res.json();
        setJustifications(data.justifications);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(status: 'approved' | 'rejected') {
    if (!reviewModal) return;
    try {
      const res = await fetch('/api/justifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reviewModal.id, status, reviewNotes }),
      });
      if (res.ok) {
        setReviewModal(null);
        setReviewNotes('');
        fetchJustifications();
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filtered = justifications.filter((j) => {
    if (filter === 'all') return true;
    return j.status === filter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/rh')}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white font-bold text-lg sm:text-xl">Justificativas de Ausência</h1>
              <p className="text-slate-400 text-xs sm:text-sm">Analise e decida sobre as solicitações dos servidores</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 p-1.5 flex gap-1 overflow-x-auto">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 min-w-max px-4 py-2.5 rounded-xl font-medium text-sm transition ${
                filter === f
                  ? 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f === 'all' && 'Todas'}
              {f === 'pending' && `Pendentes (${justifications.filter(j => j.status === 'pending').length})`}
              {f === 'approved' && `Aprovadas (${justifications.filter(j => j.status === 'approved').length})`}
              {f === 'rejected' && `Rejeitadas (${justifications.filter(j => j.status === 'rejected').length})`}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhuma justificativa encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((j) => (
                <div key={j.id} className="border border-slate-200 rounded-2xl p-5 hover:shadow-md transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {(j.userName || '?').charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{j.userName}</p>
                        <p className="text-xs text-slate-500">
                          {j.userPosition} · Ausência em {formatDateBR(j.justificationDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        j.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300'
                        : j.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                      }`}>
                        {j.status === 'approved' ? '✓ Aprovada' : j.status === 'rejected' ? '✗ Rejeitada' : '⧗ Em análise'}
                      </span>
                      {j.status === 'pending' && (
                        <button
                          onClick={() => { setReviewModal(j); setReviewNotes(''); }}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-medium"
                        >
                          Analisar
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl leading-relaxed">
                    {j.reason}
                  </p>
                  {j.reviewNotes && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Observação do RH:</p>
                      <p className="text-sm text-slate-700">{j.reviewNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {reviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Analisar Justificativa</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {reviewModal.userName} · {formatDateBR(reviewModal.justificationDate)}
                </p>
              </div>
              <button
                onClick={() => setReviewModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                Motivo informado
              </label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
                {reviewModal.reason}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                Observação do RH (opcional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                placeholder="Adicione uma observação..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleReview('rejected')}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Rejeitar
              </button>
              <button
                onClick={() => handleReview('approved')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Aprovar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JustificationsPage() {
  return (
    <AuthProvider>
      <JustificationsContent />
    </AuthProvider>
  );
}
