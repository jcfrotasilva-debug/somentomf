'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Sun,
  Coffee,
  XCircle,
  Users,
  X,
  Save,
  AlertCircle,
} from 'lucide-react';
import { formatDateBR } from '@/lib/timezone';

type DayOccurrence = {
  id: number;
  occurrenceDate: string;
  type: 'holiday' | 'optional_point' | 'no_school_day';
  name: string;
  scope: string;
  createdAt: string;
};

type ServerUser = {
  id: number;
  name: string;
  role: string;
  position: string | null;
};

type ServerAbsence = {
  id: number;
  userId: number;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  documentRef: string | null;
  createdAt: string;
  userName: string | null;
};

const OCCURRENCE_TYPES = {
  holiday: { label: 'Feriado', color: 'red', icon: '🎉' },
  optional_point: { label: 'Ponto Facultativo', color: 'amber', icon: '⚠️' },
  no_school_day: { label: 'Dia sem Aula', color: 'blue', icon: '🏫' },
};

const ABSENCE_TYPES = {
  vacation: { label: 'Férias', color: 'green', icon: '🏖️' },
  medical_leave: { label: 'Licença Médica', color: 'red', icon: '🏥' },
  maternity_leave: { label: 'Licença Maternidade', color: 'pink', icon: '👶' },
  paternity_leave: { label: 'Licença Paternidade', color: 'blue', icon: '👨‍👶' },
  bereavement_leave: { label: 'Licença Nojo', color: 'slate', icon: '🕯️' },
  marriage_leave: { label: 'Licença Casamento', color: 'purple', icon: '💍' },
  technical_orientation: { label: 'Orientação Técnica', color: 'indigo', icon: '📋' },
  other: { label: 'Outro', color: 'gray', icon: '📝' },
};

function CalendarContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'occurrences' | 'absences'>('occurrences');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [occurrences, setOccurrences] = useState<DayOccurrence[]>([]);
  const [absences, setAbsences] = useState<ServerAbsence[]>([]);
  const [servers, setServers] = useState<ServerUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [editingOccurrence, setEditingOccurrence] = useState<DayOccurrence | null>(null);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<ServerAbsence | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'hr')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'hr') {
      fetchAll();
    }
  }, [user, month]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [occRes, absRes, servRes] = await Promise.all([
        fetch(`/api/day-occurrences?month=${month}`),
        fetch('/api/server-absences'),
        fetch('/api/employees'),
      ]);
      if (occRes.ok) {
        const d = await occRes.json();
        setOccurrences(d.occurrences);
      }
      if (absRes.ok) {
        const d = await absRes.json();
        setAbsences(d.absences);
      }
      if (servRes.ok) {
        const d = await servRes.json();
        setServers(d.users.filter((s: ServerUser) => s.role === 'server'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function deleteOccurrence(id: number) {
    if (!confirm('Remover esta ocorrência?')) return;
    try {
      await fetch(`/api/day-occurrences?id=${id}`, { method: 'DELETE' });
      fetchAll();
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteAbsence(id: number) {
    if (!confirm('Remover esta ausência/bloqueio?')) return;
    try {
      await fetch(`/api/server-absences?id=${id}`, { method: 'DELETE' });
      fetchAll();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 pb-12">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/rh')}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-white font-bold text-lg sm:text-xl">Calendário e Bloqueios</h1>
                <p className="text-slate-400 text-xs sm:text-sm">Feriados, ponto facultativo e ausências de servidores</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 p-1.5 flex gap-1">
          <button
            onClick={() => setActiveTab('occurrences')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
              activeTab === 'occurrences'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Feriados e Ocorrências
          </button>
          <button
            onClick={() => setActiveTab('absences')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
              activeTab === 'absences'
                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <XCircle className="w-4 h-4" />
            Férias e Bloqueios
          </button>
        </div>

        {activeTab === 'occurrences' && (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-amber-500" />
                  Feriados e Ocorrências
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Cadastre feriados nacionais, estaduais, municipais e ponto facultativo
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => { setEditingOccurrence(null); setShowOccurrenceModal(true); }}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nova Ocorrência</span>
                </button>
              </div>
            </div>

            {occurrences.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma ocorrência cadastrada neste mês</p>
              </div>
            ) : (
              <div className="space-y-2">
                {occurrences.map((o) => {
                  const typeInfo = OCCURRENCE_TYPES[o.type as keyof typeof OCCURRENCE_TYPES];
                  const colors: Record<string, string> = {
                    red: 'bg-red-50 border-red-200 text-red-800',
                    amber: 'bg-amber-50 border-amber-200 text-amber-800',
                    blue: 'bg-blue-50 border-blue-200 text-blue-800',
                  };
                  const iconColors: Record<string, string> = {
                    red: 'bg-red-500',
                    amber: 'bg-amber-500',
                    blue: 'bg-blue-500',
                  };
                  return (
                    <div key={o.id} className={`flex items-center gap-4 p-4 border-2 rounded-xl ${colors[typeInfo.color]}`}>
                      <div className={`w-12 h-12 ${iconColors[typeInfo.color]} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
                        {typeInfo.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold">{o.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/70 font-semibold">
                            {typeInfo.label}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/70 font-medium">
                            {o.scope === 'national' ? 'Nacional' : o.scope === 'state' ? 'Estadual' : o.scope === 'municipal' ? 'Municipal' : 'Escolar'}
                          </span>
                        </div>
                        <p className="text-sm mt-0.5">
                          📅 {formatDateBR(o.occurrenceDate)} ({['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][new Date(`${o.occurrenceDate}T12:00:00-03:00`).getDay()]})
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditingOccurrence(o); setShowOccurrenceModal(true); }}
                          className="p-2 bg-white/70 hover:bg-white rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteOccurrence(o.id)}
                          className="p-2 bg-white/70 hover:bg-red-100 text-red-700 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              <strong>Importante:</strong> Os servidores <strong>não poderão registrar ponto</strong> em dias marcados como Feriado ou Ponto Facultativo. Na folha ponto, esses dias aparecerão com a marcação correspondente.
            </div>
          </div>
        )}

        {activeTab === 'absences' && (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <XCircle className="w-6 h-6 text-red-500" />
                  Férias, Licenças e Bloqueios
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Cadastre períodos em que servidores estão impedidos de registrar ponto
                </p>
              </div>
              <button
                onClick={() => { setEditingAbsence(null); setShowAbsenceModal(true); }}
                className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-4 py-2 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Bloqueio</span>
              </button>
            </div>

            {absences.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhum bloqueio cadastrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {absences.map((a) => {
                  const typeInfo = ABSENCE_TYPES[a.type as keyof typeof ABSENCE_TYPES];
                  const today = new Date().toISOString().split('T')[0];
                  const isActive = a.startDate <= today && a.endDate >= today;
                  return (
                    <div key={a.id} className={`flex items-center gap-4 p-4 border-2 rounded-xl ${isActive ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}>
                      <div className={`w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
                        {typeInfo.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900">{a.userName}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white font-semibold text-slate-700">
                            {typeInfo.label}
                          </span>
                          {isActive && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-bold">
                              ● EM ANDAMENTO
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          📅 {formatDateBR(a.startDate)} → {formatDateBR(a.endDate)}
                        </p>
                        {a.reason && <p className="text-xs text-slate-500 mt-1 truncate">📝 {a.reason}</p>}
                        {a.documentRef && <p className="text-xs text-slate-500 truncate">📄 Doc: {a.documentRef}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditingAbsence(a); setShowAbsenceModal(true); }}
                          className="p-2 bg-white hover:bg-slate-100 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteAbsence(a.id)}
                          className="p-2 bg-white hover:bg-red-100 text-red-700 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              <strong>Importante:</strong> Servidores com bloqueio ativo <strong>não poderão registrar ponto</strong>. Na folha ponto mensal, esses períodos aparecerão marcados como "Férias", "Licença Médica", etc.
            </div>
          </div>
        )}
      </main>

      {/* Modal de ocorrência */}
      {showOccurrenceModal && (
        <OccurrenceFormModal
          occurrence={editingOccurrence}
          onClose={() => { setShowOccurrenceModal(false); setEditingOccurrence(null); }}
          onSaved={() => {
            setShowOccurrenceModal(false);
            setEditingOccurrence(null);
            fetchAll();
          }}
        />
      )}

      {/* Modal de ausência */}
      {showAbsenceModal && (
        <AbsenceFormModal
          servers={servers}
          absence={editingAbsence}
          onClose={() => { setShowAbsenceModal(false); setEditingAbsence(null); }}
          onSaved={() => {
            setShowAbsenceModal(false);
            setEditingAbsence(null);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

function OccurrenceFormModal({
  occurrence,
  onClose,
  onSaved,
}: {
  occurrence: DayOccurrence | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<{
    occurrenceDate: string;
    type: 'holiday' | 'optional_point' | 'no_school_day';
    name: string;
    scope: string;
  }>({
    occurrenceDate: occurrence?.occurrenceDate || '',
    type: occurrence?.type || 'holiday',
    name: occurrence?.name || '',
    scope: occurrence?.scope || 'national',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = occurrence ? '/api/day-occurrences' : '/api/day-occurrences';
      const method = occurrence ? 'PUT' : 'POST';
      const body = occurrence ? { id: occurrence.id, ...form } : form;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar');
        setLoading(false);
        return;
      }
      onSaved();
    } catch {
      setError('Erro de conexão');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            {occurrence ? 'Editar Ocorrência' : 'Nova Ocorrência'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data *</label>
            <input
              type="date"
              value={form.occurrenceDate}
              onChange={(e) => setForm({ ...form, occurrenceDate: e.target.value })}
              required
              disabled={!!occurrence}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'holiday' | 'optional_point' | 'no_school_day' })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="holiday">🎉 Feriado</option>
              <option value="optional_point">⚠️ Ponto Facultativo</option>
              <option value="no_school_day">🏫 Dia sem Aula</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Ex: Natal, Carnaval, Recesso Escolar"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Âmbito *</label>
            <select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="national">Nacional</option>
              <option value="state">Estadual</option>
              <option value="municipal">Municipal</option>
              <option value="school">Escolar</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AbsenceFormModal({
  servers,
  absence,
  onClose,
  onSaved,
}: {
  servers: ServerUser[];
  absence: ServerAbsence | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    userId: absence?.userId.toString() || (servers[0]?.id.toString() || ''),
    type: absence?.type || 'vacation',
    startDate: absence?.startDate || '',
    endDate: absence?.endDate || '',
    reason: absence?.reason || '',
    documentRef: absence?.documentRef || '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = absence ? '/api/server-absences' : '/api/server-absences';
      const method = absence ? 'PUT' : 'POST';
      const body = absence
        ? { id: absence.id, ...form, userId: parseInt(form.userId, 10) }
        : { ...form, userId: parseInt(form.userId, 10) };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar');
        setLoading(false);
        return;
      }
      onSaved();
    } catch {
      setError('Erro de conexão');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            {absence ? 'Editar Bloqueio' : 'Novo Bloqueio'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Servidor *</label>
            <select
              value={form.userId}
              onChange={(e) => setForm({ ...form, userId: e.target.value })}
              required
              disabled={!!absence}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Selecione...</option>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.position ? `- ${s.position}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de Afastamento *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(ABSENCE_TYPES).map(([key, val]) => (
                <option key={key} value={key}>{val.icon} {val.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data Inicial *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data Final *</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Motivo / Observação</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={2}
              placeholder="Descreva o motivo..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Documento/Portaria (opcional)</label>
            <input
              type="text"
              value={form.documentRef}
              onChange={(e) => setForm({ ...form, documentRef: e.target.value })}
              placeholder="Nº da portaria, atestado, etc"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-medium py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <AuthProvider>
      <CalendarContent />
    </AuthProvider>
  );
}
