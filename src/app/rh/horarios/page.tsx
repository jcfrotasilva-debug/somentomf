'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  ArrowLeft,
  Clock,
  Loader2,
  Save,
  User,
  Users,
  Check,
  Sun,
  Coffee,
  Moon,
  LogIn,
  LogOut,
} from 'lucide-react';

type ServerUser = {
  id: number;
  name: string;
  role: string;
  position: string | null;
  registration: string | null;
  active: boolean;
};

type WorkSchedule = {
  weekday: number;
  checkInTime: string | null;
  lunchOutTime: string | null;
  lunchInTime: string | null;
  checkOutTime: string | null;
  isWorkday: boolean;
};

// Estrutura: horarios[userId][weekday] = WorkSchedule
type SchedulesMap = Record<number, Record<number, WorkSchedule>>;

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAY_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function WorkSchedulesContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [servers, setServers] = useState<ServerUser[]>([]);
  const [schedules, setSchedules] = useState<SchedulesMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'hr')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'hr') {
      fetchAll();
    }
  }, [user]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [serversRes, schedulesRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/work-schedules?userId=all'),
      ]);

      let serversList: ServerUser[] = [];
      if (serversRes.ok) {
        const data = await serversRes.json();
        serversList = data.users.filter((s: ServerUser) => s.role === 'server' && s.active);
        setServers(serversList);
      }

      // Buscar horários de cada servidor
      const schedulesMap: SchedulesMap = {};
      for (const server of serversList) {
        const res = await fetch(`/api/work-schedules?userId=${server.id}`);
        if (res.ok) {
          const data = await res.json();
          const map: Record<number, WorkSchedule> = {};
          (data.schedules || []).forEach((s: WorkSchedule & { weekday: number }) => {
            map[s.weekday] = {
              weekday: s.weekday,
              checkInTime: s.checkInTime,
              lunchOutTime: s.lunchOutTime,
              lunchInTime: s.lunchInTime,
              checkOutTime: s.checkOutTime,
              isWorkday: s.isWorkday,
            };
          });
          schedulesMap[server.id] = map;
        }
      }
      setSchedules(schedulesMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function getSchedule(userId: number, weekday: number): WorkSchedule {
    return schedules[userId]?.[weekday] || {
      weekday,
      checkInTime: null,
      lunchOutTime: null,
      lunchInTime: null,
      checkOutTime: null,
      isWorkday: weekday >= 1 && weekday <= 5, // default: seg-sex
    };
  }

  function updateSchedule(userId: number, weekday: number, field: keyof WorkSchedule, value: unknown) {
    setSchedules((prev) => {
      const userSchedules = prev[userId] || {};
      const existing = userSchedules[weekday] || getSchedule(userId, weekday);
      return {
        ...prev,
        [userId]: {
          ...userSchedules,
          [weekday]: { ...existing, [field]: value },
        },
      };
    });
  }

  function copyScheduleFrom(userId: number, weekday: number, toWeekdays: number[]) {
    const source = getSchedule(userId, weekday);
    setSchedules((prev) => {
      const userSchedules = prev[userId] || {};
      const updated = { ...userSchedules };
      toWeekdays.forEach((targetDay) => {
        if (targetDay !== weekday) {
          updated[targetDay] = { ...source, weekday: targetDay };
        }
      });
      return { ...prev, [userId]: updated };
    });
  }

  async function saveAllSchedules() {
    setSaving(true);
    setMessage(null);
    try {
      const results = await Promise.all(
        servers.map(async (server) => {
          const userSchedules = schedules[server.id] || {};
          const schedulesArray = WEEKDAY_SHORT.map((_, weekday) => {
            const s = userSchedules[weekday] || getSchedule(server.id, weekday);
            return {
              weekday,
              checkInTime: s.checkInTime || null,
              lunchOutTime: s.lunchOutTime || null,
              lunchInTime: s.lunchInTime || null,
              checkOutTime: s.checkOutTime || null,
              isWorkday: s.isWorkday,
            };
          });

          const res = await fetch('/api/work-schedules', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: server.id, schedules: schedulesArray }),
          });
          return res.ok;
        })
      );

      const successCount = results.filter(Boolean).length;
      if (successCount === servers.length) {
        setMessage({ type: 'success', text: `✓ Horários salvos para todos os ${servers.length} servidores!` });
      } else {
        setMessage({ type: 'success', text: `✓ Horários salvos para ${successCount} de ${servers.length} servidores.` });
      }
      setTimeout(() => setMessage(null), 4000);
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao salvar horários' });
    } finally {
      setSaving(false);
    }
  }

  function applyTemplateToAll(templateWeekday: number) {
    if (!confirm(`Aplicar os horários de ${WEEKDAY_FULL[templateWeekday]} para TODOS os servidores em todos os dias úteis (Seg-Sex)?`)) return;

    setSchedules((prev) => {
      const newSchedules = { ...prev };
      servers.forEach((server) => {
        const source = newSchedules[server.id]?.[templateWeekday] || {
          weekday: templateWeekday,
          checkInTime: null,
          lunchOutTime: null,
          lunchInTime: null,
          checkOutTime: null,
          isWorkday: true,
        };
        const userMap = { ...(newSchedules[server.id] || {}) };
        [1, 2, 3, 4, 5].forEach((weekday) => {
          userMap[weekday] = { ...source, weekday };
        });
        newSchedules[server.id] = userMap;
      });
      return newSchedules;
    });
    setMessage({ type: 'success', text: `✓ Horários de ${WEEKDAY_FULL[templateWeekday]} aplicados a todos os servidores (Seg-Sex)` });
    setTimeout(() => setMessage(null), 4000);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredServers = servers.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.registration || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <h1 className="text-white font-bold text-lg sm:text-xl">Jornada de Trabalho - Todos os Servidores</h1>
                <p className="text-slate-400 text-xs sm:text-sm">Cadastre os horários de entrada, almoço e saída de cada servidor</p>
              </div>
            </div>
            <button
              onClick={saveAllSchedules}
              disabled={saving}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">Salvar Tudo</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Mensagem */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <Check className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Barra de filtros e ações */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            <div className="relative flex-1">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar servidor por nome ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <select
                onChange={(e) => {
                  const idx = parseInt(e.target.value);
                  if (!isNaN(idx)) applyTemplateToAll(idx);
                  e.target.value = '';
                }}
                defaultValue=""
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Aplicar modelo a todos...</option>
                {WEEKDAY_FULL.map((name, idx) => (
                  <option key={idx} value={idx}>Copiar {name}</option>
                ))}
              </select>
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                {servers.length} servidor(es)
              </div>
            </div>
          </div>
        </div>

        {/* Lista de servidores com horários */}
        {filteredServers.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-12 text-center">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhum servidor encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredServers.map((server) => {
              const isExpanded = editingUserId === server.id;
              return (
                <div key={server.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Cabeçalho do servidor */}
                  <div
                    onClick={() => setEditingUserId(isExpanded ? null : server.id)}
                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {server.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{server.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        {server.position && <span>{server.position}</span>}
                        {server.registration && <span>Matrícula: {server.registration}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden md:flex items-center gap-2 text-xs">
                        {WEEKDAY_SHORT.map((_, weekday) => {
                          const sch = getSchedule(server.id, weekday);
                          return (
                            <div key={weekday} className={`px-2 py-1 rounded font-mono text-[10px] ${
                              sch.isWorkday && sch.checkInTime ? 'bg-green-100 text-green-700'
                              : sch.isWorkday ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-slate-100 text-slate-400'
                            }`}>
                              {WEEKDAY_SHORT[weekday]}: {sch.isWorkday ? (sch.checkInTime || '?') : '—'}
                            </div>
                          );
                        })}
                      </div>
                      <button
                        className={`bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium transition ${
                          isExpanded ? 'ring-2 ring-blue-300' : ''
                        }`}
                      >
                        {isExpanded ? 'Recolher' : 'Editar Horários'}
                      </button>
                    </div>
                  </div>

                  {/* Tabela de horários expandida */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr>
                              <th className="text-left py-2 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">Dia da Semana</th>
                              <th className="text-center py-2 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <div className="flex items-center justify-center gap-1"><LogIn className="w-3 h-3 text-blue-600" /> Entrada</div>
                              </th>
                              <th className="text-center py-2 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <div className="flex items-center justify-center gap-1"><Coffee className="w-3 h-3 text-amber-600" /> Saída Almoço</div>
                              </th>
                              <th className="text-center py-2 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <div className="flex items-center justify-center gap-1"><Coffee className="w-3 h-3 text-orange-600" /> Retorno</div>
                              </th>
                              <th className="text-center py-2 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <div className="flex items-center justify-center gap-1"><LogOut className="w-3 h-3 text-green-600" /> Saída</div>
                              </th>
                              <th className="text-center py-2 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">Trabalha</th>
                              <th className="text-center py-2 px-2 text-xs font-semibold text-slate-600 uppercase tracking-wider w-36">Copiar de...</th>
                            </tr>
                          </thead>
                          <tbody>
                            {WEEKDAY_SHORT.map((_, weekday) => {
                              const sch = getSchedule(server.id, weekday);
                              return (
                                <tr key={weekday} className={`border-t border-slate-200 ${!sch.isWorkday ? 'bg-slate-100' : 'bg-white'}`}>
                                  <td className="py-2 px-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-slate-900">{WEEKDAY_SHORT[weekday]}</span>
                                      <span className="text-xs text-slate-500 hidden sm:inline">{WEEKDAY_FULL[weekday]}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-2">
                                    <TimeInput
                                      value={sch.checkInTime || ''}
                                      onChange={(v) => updateSchedule(server.id, weekday, 'checkInTime', v || null)}
                                      disabled={!sch.isWorkday}
                                      icon={<Sun className="w-3 h-3" />}
                                    />
                                  </td>
                                  <td className="py-2 px-2">
                                    <TimeInput
                                      value={sch.lunchOutTime || ''}
                                      onChange={(v) => updateSchedule(server.id, weekday, 'lunchOutTime', v || null)}
                                      disabled={!sch.isWorkday}
                                      icon={<Coffee className="w-3 h-3" />}
                                    />
                                  </td>
                                  <td className="py-2 px-2">
                                    <TimeInput
                                      value={sch.lunchInTime || ''}
                                      onChange={(v) => updateSchedule(server.id, weekday, 'lunchInTime', v || null)}
                                      disabled={!sch.isWorkday}
                                      icon={<Coffee className="w-3 h-3" />}
                                    />
                                  </td>
                                  <td className="py-2 px-2">
                                    <TimeInput
                                      value={sch.checkOutTime || ''}
                                      onChange={(v) => updateSchedule(server.id, weekday, 'checkOutTime', v || null)}
                                      disabled={!sch.isWorkday}
                                      icon={<Moon className="w-3 h-3" />}
                                    />
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={sch.isWorkday}
                                      onChange={(e) => updateSchedule(server.id, weekday, 'isWorkday', e.target.checked)}
                                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                  </td>
                                  <td className="py-2 px-2">
                                    <div className="flex items-center gap-1 justify-center">
                                      {WEEKDAY_SHORT.map((name, idx) => {
                                        if (idx === weekday) return null;
                                        return (
                                          <button
                                            key={idx}
                                            onClick={() => copyScheduleFrom(server.id, idx, [weekday])}
                                            title={`Copiar de ${WEEKDAY_FULL[idx]}`}
                                            className="w-7 h-7 bg-slate-200 hover:bg-blue-500 hover:text-white text-slate-600 rounded text-xs font-medium transition"
                                          >
                                            {name.charAt(0)}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Botão salvar deste servidor */}
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={async () => {
                            const userSchedules = schedules[server.id] || {};
                            const schedulesArray = WEEKDAY_SHORT.map((_, weekday) => {
                              const s = userSchedules[weekday] || getSchedule(server.id, weekday);
                              return {
                                weekday,
                                checkInTime: s.checkInTime || null,
                                lunchOutTime: s.lunchOutTime || null,
                                lunchInTime: s.lunchInTime || null,
                                checkOutTime: s.checkOutTime || null,
                                isWorkday: s.isWorkday,
                              };
                            });
                            const res = await fetch('/api/work-schedules', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId: server.id, schedules: schedulesArray }),
                            });
                            if (res.ok) {
                              setMessage({ type: 'success', text: `✓ Horários de ${server.name} salvos!` });
                              setTimeout(() => setMessage(null), 3000);
                            }
                          }}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Salvar {server.name.split(' ')[0]}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Instruções */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Como cadastrar horários
          </h3>
          <ul className="text-sm text-slate-700 space-y-1.5 ml-7 list-disc">
            <li>Clique em <strong>"Editar Horários"</strong> ao lado do servidor para expandir a tabela da semana</li>
            <li>Marque <strong>"Trabalha"</strong> para indicar os dias em que o servidor trabalha</li>
            <li>Preencha os horários: <strong>Entrada, Saída Almoço, Retorno e Saída</strong></li>
            <li>Use os botões <strong>A, T, Q, Q, S</strong> para copiar horários de outro dia da semana rapidamente</li>
            <li>Clique em <strong>"Salvar [Nome]"</strong> para salvar só daquele servidor, ou <strong>"Salvar Tudo"</strong> no topo para salvar de todos</li>
            <li>Use <strong>"Aplicar modelo a todos..."</strong> para copiar um dia (ex: Segunda) para todos os servidores</li>
          </ul>
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
        className={`w-full ${icon ? 'pl-7' : 'pl-2'} pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100`}
      />
    </div>
  );
}

export default function WorkSchedulesPage() {
  return (
    <AuthProvider>
      <WorkSchedulesContent />
    </AuthProvider>
  );
}
