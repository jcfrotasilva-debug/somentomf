'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  ArrowLeft,
  Clock,
  Loader2,
  Printer,
  User,
  IdCard,
  Building2,
  Phone,
  Calendar,
  BadgeCheck,
  Save,
  Sun,
  Moon,
  Coffee,
  LogIn,
  LogOut,
  X,
} from 'lucide-react';
import { formatTimeInBrazil, formatDateBR, calculateWorkedHours } from '@/lib/timezone';

type ServerUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  position: string | null;
  registration: string | null;
  department: string | null;
  admissionDate: string | null;
  phone: string | null;
  active: boolean;
};

type TimeEntry = {
  id: number;
  entryDate: string;
  checkIn: string | null;
  lunchOut: string | null;
  lunchIn: string | null;
  checkOut: string | null;
};

type WorkSchedule = {
  id: number;
  weekday: number;
  checkInTime: string | null;
  lunchOutTime: string | null;
  lunchInTime: string | null;
  checkOutTime: string | null;
  isWorkday: boolean;
};

const WEEKDAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function ServerDetailsContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const serverId = parseInt(params.id as string, 10);

  const [server, setServer] = useState<ServerUser | null>(null);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);

  // Estado temporário dos horários em edição
  const [editSchedules, setEditSchedules] = useState<Record<number, WorkSchedule>>({});

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'hr')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'hr') {
      fetchAll();
    }
  }, [user, serverId, month]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [userRes, schedRes, entriesRes] = await Promise.all([
        fetch(`/api/employees/${serverId}`),
        fetch(`/api/work-schedules?userId=${serverId}`),
        fetch(`/api/time-entries/history?userId=${serverId}&month=${month}`),
      ]);

      if (userRes.ok) {
        const d = await userRes.json();
        setServer(d.user);
      }
      if (schedRes.ok) {
        const d = await schedRes.json();
        setSchedules(d.schedules);
        const map: Record<number, WorkSchedule> = {};
        d.schedules.forEach((s: WorkSchedule) => { map[s.weekday] = s; });
        setEditSchedules(map);
      }
      if (entriesRes.ok) {
        const d = await entriesRes.json();
        setEntries(d.entries);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function saveAllSchedules() {
    setSavingSchedule(true);
    setScheduleMsg(null);
    try {
      const schedulesArray = Object.values(editSchedules).map((s) => ({
        weekday: s.weekday,
        checkInTime: s.checkInTime || null,
        lunchOutTime: s.lunchOutTime || null,
        lunchInTime: s.lunchInTime || null,
        checkOutTime: s.checkOutTime || null,
        isWorkday: s.isWorkday,
      }));

      const res = await fetch('/api/work-schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: serverId, schedules: schedulesArray }),
      });

      if (res.ok) {
        setScheduleMsg('✓ Horários salvos com sucesso!');
        await fetchAll();
        setTimeout(() => setScheduleMsg(null), 3000);
      } else {
        setScheduleMsg('Erro ao salvar horários');
      }
    } catch {
      setScheduleMsg('Erro de conexão');
    } finally {
      setSavingSchedule(false);
    }
  }

  function updateSchedule(weekday: number, field: keyof WorkSchedule, value: unknown) {
    setEditSchedules((prev) => {
      const existing = prev[weekday] || { weekday, isWorkday: weekday >= 1 && weekday <= 5, checkInTime: null, lunchOutTime: null, lunchInTime: null, checkOutTime: null };
      return {
        ...prev,
        [weekday]: { ...existing, [field]: value },
      };
    });
  }

  if (loading || !server) {
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
                <h1 className="text-white font-bold text-lg sm:text-xl">Detalhes do Servidor</h1>
                <p className="text-slate-400 text-xs sm:text-sm">EE Profa. Marlene Frattini</p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/rh/folha-ponto/${serverId}`)}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg transition shadow-lg"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">Folha Ponto</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Card de dados do servidor */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl">
              {server.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-slate-900">{server.name}</h2>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                  server.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {server.active ? '● Ativo' : '● Inativo'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                {server.position && (
                  <div className="flex items-center gap-2 text-sm">
                    <BadgeCheck className="w-4 h-4 text-blue-500" />
                    <span className="text-slate-500">Cargo:</span>
                    <span className="font-medium text-slate-900">{server.position}</span>
                  </div>
                )}
                {server.registration && (
                  <div className="flex items-center gap-2 text-sm">
                    <IdCard className="w-4 h-4 text-blue-500" />
                    <span className="text-slate-500">Matrícula:</span>
                    <span className="font-medium text-slate-900">{server.registration}</span>
                  </div>
                )}
                {server.department && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span className="text-slate-500">Setor:</span>
                    <span className="font-medium text-slate-900">{server.department}</span>
                  </div>
                )}
                {server.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-blue-500" />
                    <span className="text-slate-500">Telefone:</span>
                    <span className="font-medium text-slate-900">{server.phone}</span>
                  </div>
                )}
                {server.admissionDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-slate-500">Admissão:</span>
                    <span className="font-medium text-slate-900">{formatDateBR(server.admissionDate)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm sm:col-span-2">
                  <User className="w-4 h-4 text-blue-500" />
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-900 truncate">{server.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gestão de Horários */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Jornada de Trabalho
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Defina os horários de trabalho para cada dia da semana
              </p>
            </div>
            <button
              onClick={saveAllSchedules}
              disabled={savingSchedule}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Horários
            </button>
          </div>

          {scheduleMsg && (
            <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${
              scheduleMsg.includes('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {scheduleMsg}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Dia</th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1"><LogIn className="w-3 h-3" /> Entrada</div>
                  </th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1"><Coffee className="w-3 h-3" /> Saída Almoço</div>
                  </th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1"><Coffee className="w-3 h-3" /> Retorno</div>
                  </th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1"><LogOut className="w-3 h-3" /> Saída</div>
                  </th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Trabalha</th>
                </tr>
              </thead>
              <tbody>
                {WEEKDAY_NAMES.map((name, idx) => {
                  const sch = editSchedules[idx] || { weekday: idx, isWorkday: idx >= 1 && idx <= 5, checkInTime: null, lunchOutTime: null, lunchInTime: null, checkOutTime: null };
                  return (
                    <tr key={idx} className={`border-b border-slate-100 ${!sch.isWorkday ? 'bg-slate-50 opacity-60' : ''}`}>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">{WEEKDAY_SHORT[idx]}</span>
                          <span className="text-xs text-slate-500 hidden sm:inline">{name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <TimeInput
                          value={sch.checkInTime || ''}
                          onChange={(v) => updateSchedule(idx, 'checkInTime', v || null)}
                          disabled={!sch.isWorkday}
                          icon={<Sun className="w-3 h-3" />}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <TimeInput
                          value={sch.lunchOutTime || ''}
                          onChange={(v) => updateSchedule(idx, 'lunchOutTime', v || null)}
                          disabled={!sch.isWorkday}
                          icon={<Coffee className="w-3 h-3" />}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <TimeInput
                          value={sch.lunchInTime || ''}
                          onChange={(v) => updateSchedule(idx, 'lunchInTime', v || null)}
                          disabled={!sch.isWorkday}
                          icon={<Coffee className="w-3 h-3" />}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <TimeInput
                          value={sch.checkOutTime || ''}
                          onChange={(v) => updateSchedule(idx, 'checkOutTime', v || null)}
                          disabled={!sch.isWorkday}
                          icon={<Moon className="w-3 h-3" />}
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sch.isWorkday}
                            onChange={(e) => updateSchedule(idx, 'isWorkday', e.target.checked)}
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Registros do mês */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Registros de Ponto</h3>
              <p className="text-sm text-slate-500 mt-1">Histórico de registros do servidor</p>
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {entries.length === 0 ? (
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
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Dia</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Entrada</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Saída Almoço</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Retorno</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Saída</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const dt = new Date(`${entry.entryDate}T12:00:00-03:00`);
                    const weekday = dt.getDay();
                    return (
                      <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-2 text-sm font-medium text-slate-900">{formatDateBR(entry.entryDate)}</td>
                        <td className="py-3 px-2 text-sm text-slate-600">{WEEKDAY_SHORT[weekday]}</td>
                        <td className="py-3 px-2 text-sm text-slate-700 text-center">{formatTimeInBrazil(entry.checkIn)}</td>
                        <td className="py-3 px-2 text-sm text-slate-700 text-center">{formatTimeInBrazil(entry.lunchOut)}</td>
                        <td className="py-3 px-2 text-sm text-slate-700 text-center">{formatTimeInBrazil(entry.lunchIn)}</td>
                        <td className="py-3 px-2 text-sm text-slate-700 text-center">{formatTimeInBrazil(entry.checkOut)}</td>
                        <td className="py-3 px-2 text-sm font-semibold text-slate-900 text-right">
                          {calculateWorkedHours(entry)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TimeInput({ value, onChange, disabled, icon }: { value: string; onChange: (v: string) => void; disabled: boolean; icon?: React.ReactNode }) {
  return (
    <div className="relative flex items-center">
      {icon && <span className="absolute left-2 text-slate-400">{icon}</span>}
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full ${icon ? 'pl-7' : 'pl-2'} pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
      />
    </div>
  );
}

export default function ServerDetailsPage() {
  return (
    <AuthProvider>
      <ServerDetailsContent />
    </AuthProvider>
  );
}
