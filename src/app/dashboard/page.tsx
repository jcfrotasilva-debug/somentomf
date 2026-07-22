'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthProvider,
  useAuth,
} from '@/components/AuthProvider';
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  UtensilsCrossed,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOutIcon,
  History,
  MessageSquare,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Shield,
  Edit2,
  Send,
} from 'lucide-react';
import { formatTimeInBrazil, formatDateBR, getCurrentBrazilDate, getCurrentBrazilTime, calculateWorkedHours, formatBrazilDateTime } from '@/lib/timezone';

type TimeEntry = {
  id: number;
  checkIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  checkOut: string | null;
  entryDate: string;
  status: string;
};

type Justification = {
  id: number;
  justificationDate: string;
  reason: string;
  status: string;
  reviewNotes: string | null;
  createdAt: string;
};

function DashboardContent() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [currentTime, setCurrentTime] = useState(getCurrentBrazilTime());
  const [currentDate, setCurrentDate] = useState(getCurrentBrazilDate());
  const [todayEntry, setTodayEntry] = useState<TimeEntry | null>(null);
  const [loadingEntry, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [history, setHistory] = useState<TimeEntry[]>([]);
  const [historyMonth, setHistoryMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [justificationReason, setJustificationReason] = useState('');
  const [loadingJustification, setLoadingJustification] = useState(false);
  const [activeTab, setActiveTab] = useState<'ponto' | 'historico' | 'justificativas' | 'retificacoes'>('ponto');

  // Estado para modal de alteração de senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // Estados para retificações
  const [myAdjustments, setMyAdjustments] = useState<any[]>([]);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    entryDate: '',
    fieldAltered: 'checkIn',
    newValue: '',
    reason: '',
  });
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    // Validações frontend
    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'A nova senha e a confirmação não coincidem' });
      return;
    }

    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setPasswordMessage({ type: 'error', text: 'A nova senha deve ser diferente da senha atual' });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMessage({ type: 'error', text: data.error || 'Erro ao alterar senha' });
        setChangingPassword(false);
        return;
      }

      setPasswordMessage({ type: 'success', text: data.message || 'Senha alterada com sucesso!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      // Fecha o modal após 2 segundos
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordMessage(null);
      }, 2000);
    } catch {
      setPasswordMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setChangingPassword(false);
    }
  }

  // Relógio ao vivo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentBrazilTime());
      setCurrentDate(getCurrentBrazilDate());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Buscar registro do dia
  useEffect(() => {
    if (user) {
      fetchTodayEntry();
      fetchHistory();
      fetchJustifications();
      fetchMyAdjustments();
    }
  }, [user, historyMonth]);

  async function fetchTodayEntry() {
    try {
      const res = await fetch('/api/time-entries');
      if (res.ok) {
        const data = await res.json();
        setTodayEntry(data.entry);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchHistory() {
    try {
      const res = await fetch(`/api/time-entries/history?month=${historyMonth}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.entries);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchJustifications() {
    try {
      const res = await fetch('/api/justifications');
      if (res.ok) {
        const data = await res.json();
        setJustifications(data.justifications);
      }
    } catch (e) {
      console.error(e);
    }
  }

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

  async function handleRegister(type: string) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao registrar' });
      } else {
        setMessage({ type: 'success', text: data.message || 'Registrado!' });
        setTodayEntry(data.entry);
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  async function handleSubmitJustification(e: FormEvent) {
    e.preventDefault();
    setLoadingJustification(true);
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const y = yesterday.getFullYear();
      const m = String(yesterday.getMonth() + 1).padStart(2, '0');
      const d = String(yesterday.getDate()).padStart(2, '0');
      // Usar cálculo correto no fuso Brasil
      const res = await fetch('/api/justifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: yesterdayDateStr(), reason: justificationReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao enviar justificativa' });
      } else {
        setMessage({ type: 'success', text: data.message });
        setJustificationReason('');
        setShowJustificationModal(false);
        fetchJustifications();
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setLoadingJustification(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

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

  function yesterdayDateStr() {
    // Usa timezone Brasil
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(yesterday);
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Define qual botão está ativo (já registrado?)
  const getButtonStatus = () => {
    return {
      checkIn: !todayEntry,
      lunchOut: !!todayEntry?.checkIn && !todayEntry?.lunchOut,
      lunchIn: !!todayEntry?.lunchOut && !todayEntry?.lunchIn,
      checkOut: !!todayEntry?.lunchIn && !todayEntry?.checkOut,
    };
  };
  const status = getButtonStatus();
  const isComplete = !!todayEntry?.checkOut;

  const formatFullDate = () => {
    const [y, m, d] = currentDate.split('-');
    const dt = new Date(`${y}-${m}-${d}T12:00:00-03:00`);
    return dt.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg sm:text-xl">Registro de Ponto</h1>
                <p className="text-blue-200 text-xs sm:text-sm">EE Profa. Marlene Frattini</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-white text-sm font-medium">{user.name}</p>
                <p className="text-blue-200 text-xs">Servidor(a)</p>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                title="Alterar minha senha"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition border border-white/20"
              >
                <KeyRound className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Senha</span>
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition border border-white/20"
              >
                <LogOutIcon className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Mensagem de feedback */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Relógio ao vivo */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8 mb-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100 to-transparent rounded-full -translate-y-32 translate-x-32 opacity-50"></div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div>
              <p className="text-slate-500 text-xs font-semibold tracking-widest uppercase mb-2">
                Data e Horário Atual
              </p>
              <p className="text-slate-800 text-sm capitalize">{formatFullDate()}</p>
              <p className="text-xs text-slate-500 mt-1">Fuso: Horário de Brasília (GMT-3)</p>
            </div>
            <div className="flex justify-center">
              <div className="text-center">
                <div className="font-mono text-6xl sm:text-7xl font-bold bg-gradient-to-br from-blue-700 to-indigo-800 bg-clip-text text-transparent tracking-tight">
                  {currentTime}
                </div>
                <p className="text-xs text-slate-400 mt-2">Horário oficial do Brasil</p>
              </div>
            </div>
            <div className="flex justify-start md:justify-end">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 w-full max-w-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Servidor</p>
                    <p className="text-slate-900 font-semibold text-sm">{user.name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 p-1.5 flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ponto')}
            className={`flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
              activeTab === 'ponto'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            Registrar Ponto
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
              activeTab === 'historico'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            Histórico
          </button>
          <button
            onClick={() => setActiveTab('justificativas')}
            className={`flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
              activeTab === 'justificativas'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Justificativas
          </button>
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
        </div>

        {/* Conteúdo das tabs */}
        {activeTab === 'ponto' && (
          <div>
            {/* Status do dia */}
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Registros de Hoje</h2>
                  <p className="text-slate-500 text-sm mt-1">{formatDateBR(currentDate)}</p>
                </div>
                {isComplete && (
                  <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Jornada Concluída
                  </span>
                )}
              </div>

              {/* Timeline visual dos 4 registros */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <TimelineItem
                  label="Entrada"
                  time={formatTimeInBrazil(todayEntry?.checkIn)}
                  icon={<LogIn className="w-5 h-5" />}
                  color="blue"
                  active={!!todayEntry?.checkIn}
                />
                <TimelineItem
                  label="Saída Almoço"
                  time={formatTimeInBrazil(todayEntry?.lunchOut)}
                  icon={<Coffee className="w-5 h-5" />}
                  color="amber"
                  active={!!todayEntry?.lunchOut}
                />
                <TimelineItem
                  label="Retorno Almoço"
                  time={formatTimeInBrazil(todayEntry?.lunchIn)}
                  icon={<UtensilsCrossed className="w-5 h-5" />}
                  color="orange"
                  active={!!todayEntry?.lunchIn}
                />
                <TimelineItem
                  label="Saída"
                  time={formatTimeInBrazil(todayEntry?.checkOut)}
                  icon={<LogOut className="w-5 h-5" />}
                  color="green"
                  active={!!todayEntry?.checkOut}
                />
              </div>

              {todayEntry && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Horas trabalhadas hoje</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {calculateWorkedHours({
                        checkIn: todayEntry.checkIn,
                        lunchOut: todayEntry.lunchOut,
                        lunchIn: todayEntry.lunchIn,
                        checkOut: todayEntry.checkOut,
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Botões de registro */}
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Registrar Ponto</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PointButton
                  label="Registrar Entrada"
                  description="Início da jornada"
                  icon={<LogIn className="w-6 h-6" />}
                  color="blue"
                  disabled={!status.checkIn || loading}
                  loading={loading}
                  onClick={() => handleRegister('checkIn')}
                />
                <PointButton
                  label="Saída para Almoço"
                  description="Início do intervalo"
                  icon={<Coffee className="w-6 h-6" />}
                  color="amber"
                  disabled={!status.lunchOut || loading}
                  loading={loading}
                  onClick={() => handleRegister('lunchOut')}
                />
                <PointButton
                  label="Retorno do Almoço"
                  description="Fim do intervalo"
                  icon={<UtensilsCrossed className="w-6 h-6" />}
                  color="orange"
                  disabled={!status.lunchIn || loading}
                  loading={loading}
                  onClick={() => handleRegister('lunchIn')}
                />
                <PointButton
                  label="Fim do Expediente"
                  description="Encerrar jornada"
                  icon={<LogOut className="w-6 h-6" />}
                  color="green"
                  disabled={!status.checkOut || loading}
                  loading={loading}
                  onClick={() => handleRegister('checkOut')}
                />
              </div>
              {!status.checkIn && !isComplete && (
                <p className="text-xs text-slate-500 mt-4 text-center">
                  Os registros devem ser feitos em sequência: Entrada → Saída Almoço → Retorno → Saída
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Histórico de Registros</h2>
                <p className="text-slate-500 text-sm mt-1">Visualize seus registros por mês</p>
              </div>
              <input
                type="month"
                value={historyMonth}
                onChange={(e) => setHistoryMonth(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {history.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhum registro encontrado neste mês</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Data</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Entrada</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Saída Almoço</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Retorno</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Saída</th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-2 text-sm font-medium text-slate-900">{formatDateBR(entry.entryDate)}</td>
                        <td className="py-3 px-2 text-sm text-slate-700 text-center">{formatTimeInBrazil(entry.checkIn)}</td>
                        <td className="py-3 px-2 text-sm text-slate-700 text-center">{formatTimeInBrazil(entry.lunchOut)}</td>
                        <td className="py-3 px-2 text-sm text-slate-700 text-center">{formatTimeInBrazil(entry.lunchIn)}</td>
                        <td className="py-3 px-2 text-sm text-slate-700 text-center">{formatTimeInBrazil(entry.checkOut)}</td>
                        <td className="py-3 px-2 text-sm font-semibold text-slate-900 text-right">
                          {calculateWorkedHours(entry)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'justificativas' && (
          <div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 mb-1">Solicitar Justificativa de Falta</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Você pode solicitar justificativa apenas para o <strong>dia anterior</strong>. Motivos como atestados médicos, compromissos inadiáveis ou force majeure serão analisados pelo RH.
                  </p>
                  <button
                    onClick={() => setShowJustificationModal(true)}
                    className="bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Nova Solicitação
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Minhas Solicitações</h2>
              {justifications.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Nenhuma justificativa enviada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {justifications.map((j) => (
                    <div key={j.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {formatDateBR(j.justificationDate)}
                          </p>
                          <p className="text-xs text-slate-500">
                            Enviada em {formatBrazilDateTime(j.createdAt)}
                          </p>
                        </div>
                        <JustificationBadge status={j.status} />
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{j.reason}</p>
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
          </div>
        )}

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
                        <JustificationBadge status={a.status} />
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
      </main>

      {/* Modal de solicitação de retificação */}
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

      {/* Modal de alteração de senha */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Alterar Minha Senha</h3>
                  <p className="text-xs text-slate-500">Mantenha sua conta segura</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordMessage(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <LogOut className="w-5 h-5 rotate-90" />
              </button>
            </div>

            {/* Aviso de segurança */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-800 flex items-start gap-2">
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Por segurança, você precisa informar sua <strong>senha atual</strong> antes de definir uma nova. A nova senha deve ter pelo menos <strong>6 caracteres</strong>.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Senha atual */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Senha Atual *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    required
                    autoComplete="current-password"
                    placeholder="Digite sua senha atual"
                    className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Nova senha */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nova Senha *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordForm.newPassword && passwordForm.newPassword.length < 6 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Mínimo de 6 caracteres (atual: {passwordForm.newPassword.length})
                  </p>
                )}
              </div>

              {/* Confirmar nova senha */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Confirmar Nova Senha *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                    autoComplete="new-password"
                    placeholder="Digite novamente a nova senha"
                    className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">
                    ❌ As senhas não coincidem
                  </p>
                )}
                {passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.newPassword.length >= 6 && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Senhas coincidem
                  </p>
                )}
              </div>

              {/* Mensagem */}
              {passwordMessage && (
                <div className={`p-3 rounded-xl flex items-start gap-2 text-sm ${
                  passwordMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {passwordMessage.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <p className="flex-1">{passwordMessage.text}</p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordMessage(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-medium py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Alterar Senha
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de justificativa */}
      {showJustificationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Solicitar Justificativa de Falta</h3>
                <p className="text-xs text-slate-500">Atenção: a justificativa é SEMPRE para o dia ANTERIOR</p>
              </div>
            </div>

            {/* Aviso destacando a data */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-bold text-amber-900 mb-1">
                    Data da ausência: <span className="text-lg">{formatDateBR(yesterdayDateStr())}</span>
                  </p>
                  <p className="text-amber-800 text-xs leading-relaxed">
                    Você está solicitando justificativa para <strong>ONTEM</strong> ({formatDateBR(yesterdayDateStr())}).
                    A data da solicitação é HOJE ({formatDateBR(getCurrentBrazilDate())}), mas a ausência é de ONTEM.
                    <br /><br />
                    <strong>Regras do sistema:</strong>
                    <br />• Só é permitido justificar o <strong>dia anterior</strong>
                    <br />• <strong>Não é possível</strong> justificar o dia atual
                    <br />• <strong>Não é possível</strong> justificar dia que já possui registro de ponto
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitJustification}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Motivo da Ausência em {formatDateBR(yesterdayDateStr())}
                </label>
                <textarea
                  value={justificationReason}
                  onChange={(e) => setJustificationReason(e.target.value)}
                  required
                  minLength={10}
                  rows={5}
                  placeholder="Descreva detalhadamente o motivo da ausência no dia anterior..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Mínimo de 10 caracteres. Seja claro e objetivo.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowJustificationModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingJustification || justificationReason.length < 10}
                  className="flex-1 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-medium py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingJustification ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Justificar {formatDateBR(yesterdayDateStr())}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineItem({
  label,
  time,
  icon,
  color,
  active,
}: {
  label: string;
  time: string;
  icon: React.ReactNode;
  color: 'blue' | 'amber' | 'orange' | 'green';
  active: boolean;
}) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    orange: 'from-orange-500 to-orange-600',
    green: 'from-green-500 to-green-600',
  };
  const bgColors = {
    blue: 'bg-blue-50 border-blue-200',
    amber: 'bg-amber-50 border-amber-200',
    orange: 'bg-orange-50 border-orange-200',
    green: 'bg-green-50 border-green-200',
  };

  return (
    <div className={`${active ? bgColors[color] : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4 text-center transition`}>
      <div className={`w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center ${active ? `bg-gradient-to-br ${colors[color]} text-white` : 'bg-slate-200 text-slate-500'}`}>
        {icon}
      </div>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`font-mono text-lg font-bold ${active ? 'text-slate-900' : 'text-slate-400'}`}>
        {time}
      </p>
    </div>
  );
}

function PointButton({
  label,
  description,
  icon,
  color,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: 'blue' | 'amber' | 'orange' | 'green';
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const colors = {
    blue: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-200',
    amber: 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-200',
    orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-orange-200',
    green: 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-green-200',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative bg-gradient-to-br ${colors[color]} disabled:from-slate-200 disabled:to-slate-300 disabled:shadow-none text-white disabled:text-slate-500 font-semibold py-5 px-6 rounded-2xl shadow-lg hover:shadow-xl transition disabled:cursor-not-allowed disabled:hover:shadow-lg text-left group overflow-hidden`}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition">
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-bold text-base sm:text-lg">{label}</p>
          <p className="text-xs opacity-80 mt-0.5">{description}</p>
        </div>
        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
      </div>
      {disabled && (
        <div className="absolute inset-0 bg-slate-500/5 backdrop-blur-[1px] flex items-center justify-center">
          <span className="text-xs font-medium text-slate-600 bg-white/70 px-2 py-0.5 rounded">
            {loading ? 'Processando...' : 'Indisponível'}
          </span>
        </div>
      )}
    </button>
  );
}

function JustificationBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
  };
  const labels = {
    pending: 'Em análise',
    approved: 'Aprovada',
    rejected: 'Rejeitada',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[status as keyof typeof styles]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  );
}

export default function ServerDashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
