'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import {
  ArrowLeft,
  Printer,
  Loader2,
  Calendar,
} from 'lucide-react';
import { formatTimeInBrazil, formatDateBR, calculateWorkedHours, getCurrentBrazilDate } from '@/lib/timezone';

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function DocumentHeader({ brasaoUrl }: { brasaoUrl: string | null }) {
  return (
    <div className="border-b-4 border-double border-slate-900 pb-3 mb-3">
      <div className="flex items-center">
        {/* Logo/Brasão à esquerda */}
        <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
          {brasaoUrl ? (
            <img src={brasaoUrl} alt="Brasão" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="w-full h-full border-2 border-slate-900 rounded-lg flex items-center justify-center bg-slate-50">
              <div className="text-center px-2">
                <div className="text-[8px] font-bold text-slate-700 leading-tight">BRASÃO<br />DA<br />ESCOLA</div>
              </div>
            </div>
          )}
        </div>

        {/* Textos centralizados */}
        <div className="flex-1 text-center">
          <p className="text-[11px] text-slate-800 font-bold uppercase tracking-wider leading-tight">
            GOVERNO DO ESTADO DE SÃO PAULO
          </p>
          <p className="text-[11px] text-slate-800 font-bold uppercase tracking-wider leading-tight mt-0.5">
            SECRETARIA DE ESTADO DA EDUCAÇÃO
          </p>
          <div className="my-1.5 w-32 h-[2px] bg-slate-900 mx-auto"></div>
          <h1 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider leading-tight">
            EE PROFA. MARLENE FRATTINI
          </h1>
        </div>

        {/* Espaço vazio à direita para balancear visualmente (logo ocupa o mesmo espaço) */}
        <div className="w-24 h-24 flex-shrink-0"></div>
      </div>
    </div>
  );
}

type ReportData = {
  user: {
    id: number;
    name: string;
    position: string | null;
    registration: string | null;
    department: string | null;
    admissionDate: string | null;
  };
  brasaoUrl: string | null;
  month: {
    year: number;
    month: number;
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  entries: Array<{
    id: number;
    entryDate: string;
    checkIn: string | null;
    lunchOut: string | null;
    lunchIn: string | null;
    checkOut: string | null;
  }>;
  justifications: Array<{
    id: number;
    justificationDate: string;
    reason: string;
    status: string;
    reviewNotes: string | null;
    createdAt: string;
  }>;
  occurrences: Array<{
    id: number;
    occurrenceDate: string;
    type: string;
    name: string;
    scope: string;
  }>;
  absences: Array<{
    id: number;
    type: string;
    startDate: string;
    endDate: string;
    reason: string | null;
    documentRef: string | null;
  }>;
  adjustments: Array<{
    id: number;
    entryDate: string;
    fieldAltered: string;
    newValue: string;
    reason: string;
    adjustmentType: string;
    adjustmentDate: string;
  }>;
  days: Array<{
    date: string;
    weekday: number;
    weekdayName: string;
    entry: {
      id: number;
      entryDate: string;
      checkIn: string | null;
      lunchOut: string | null;
      lunchIn: string | null;
      checkOut: string | null;
    } | null;
    hasJustification: boolean;
    justification: {
      id: number;
      justificationDate: string;
      reason: string;
      status: string;
      reviewNotes: string | null;
      createdAt: string;
    } | null;
    occurrence: {
      id: number;
      occurrenceDate: string;
      type: string;
      name: string;
      scope: string;
    } | null;
    absence: {
      type: string;
      name: string;
      startDate: string;
      endDate: string;
    } | null;
  }>;
};

function MonthlyReportContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const serverId = parseInt(params.id as string, 10);

  const [month, setMonth] = useState(() => {
    const m = searchParams.get('month');
    if (m) return m;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchReport();
    }
  }, [user, serverId, month]);

  async function fetchReport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/monthly?userId=${serverId}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Calcular totais
  const totalEntries = report.entries.length;
  let totalWorkedMinutes = 0;
  report.entries.forEach((e) => {
    if (!e.checkIn || !e.checkOut) return;
    const toMin = (iso: string) => {
      const d = new Date(iso);
      const formatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(d);
      const h = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
      const m = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
      return h * 60 + m;
    };
    let mins = toMin(e.checkOut) - toMin(e.checkIn);
    if (e.lunchOut && e.lunchIn) {
      mins -= (toMin(e.lunchIn) - toMin(e.lunchOut));
    }
    if (mins > 0) totalWorkedMinutes += mins;
  });
  const totalHours = Math.floor(totalWorkedMinutes / 60);
  const totalMins = totalWorkedMinutes % 60;

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Barra de controle (não imprime) */}
      <div className="bg-white border-b border-slate-200 shadow-sm print:hidden sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handlePrint}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      {/* ====== FRENTE: Folha Ponto ====== */}
      <div className="max-w-5xl mx-auto p-4 print:p-0">
        <div className="bg-white shadow-lg print:shadow-none print-page print:pb-1">
          {/* Cabeçalho */}
          <DocumentHeader brasaoUrl={report.brasaoUrl} />

          {/* Título do documento */}
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Folha de Ponto Mensal</h2>
            <p className="text-[10px] text-slate-600 mt-0.5">
              Referência: <strong className="text-slate-900">{MONTH_NAMES[report.month.month - 1]} de {report.month.year}</strong>
            </p>
          </div>

          {/* Dados do servidor */}
          <div className="border-2 border-slate-900 rounded-lg p-2 mb-2">
            <h3 className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-1">Dados do Servidor</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <span className="text-slate-600 font-medium">Nome: </span>
                <span className="font-bold text-slate-900 border-b border-slate-300 pb-0.5">{report.user.name}</span>
              </div>
              <div>
                <span className="text-slate-600 font-medium">Matrícula: </span>
                <span className="font-bold text-slate-900">{report.user.registration || '—'}</span>
              </div>
              <div>
                <span className="text-slate-600 font-medium">Cargo/Função: </span>
                <span className="font-bold text-slate-900">{report.user.position || '—'}</span>
              </div>
              <div>
                <span className="text-slate-600 font-medium">Setor: </span>
                <span className="font-bold text-slate-900">{report.user.department || '—'}</span>
              </div>
              <div>
                <span className="text-slate-600 font-medium">Período: </span>
                <span className="font-bold text-slate-900">
                  {formatDateBR(report.month.startDate)} a {formatDateBR(report.month.endDate)}
                </span>
              </div>
              <div>
                <span className="text-slate-600 font-medium">Admissão: </span>
                <span className="font-bold text-slate-900">
                  {report.user.admissionDate ? formatDateBR(report.user.admissionDate) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Tabela de registros */}
          <div className="mb-2">
            <h3 className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
              Registros Diários de Ponto
            </h3>
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border border-slate-700 px-0.5 py-0.5 text-center font-semibold w-6">Dia</th>
                  <th className="border border-slate-700 px-0.5 py-0.5 text-center font-semibold w-8">D.S.</th>
                  <th className="border border-slate-700 px-0.5 py-0.5 text-center font-semibold">Entrada</th>
                  <th className="border border-slate-700 px-0.5 py-0.5 text-center font-semibold">S.Almoço</th>
                  <th className="border border-slate-700 px-0.5 py-0.5 text-center font-semibold">Retorno</th>
                  <th className="border border-slate-700 px-0.5 py-0.5 text-center font-semibold">Saída</th>
                  <th className="border border-slate-700 px-0.5 py-0.5 text-center font-semibold w-32">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {report.days.map((day, idx) => {
                  const isWeekend = day.weekday === 0 || day.weekday === 6;
                  const hasEntry = !!day.entry;
                  const hasJustif = !!day.justification;
                  const hasOccurrence = !!day.occurrence;
                  const hasAbsence = !!day.absence;
                  const dayAdjustments = (report.adjustments || []).filter((adj: any) => adj.entryDate === day.date);
                  const hasAdjustment = dayAdjustments.length > 0;
                  const rowBg = hasOccurrence ? 'bg-orange-50' : hasAbsence ? 'bg-purple-50' : hasAdjustment ? 'bg-cyan-50' : isWeekend ? 'bg-slate-50' : hasEntry ? '' : hasJustif ? 'bg-yellow-50' : 'bg-red-50';

                  let obs = '';
                  if (hasOccurrence) {
                    const occName = day.occurrence?.type === 'holiday' ? '🎉 Feriado' : day.occurrence?.type === 'optional_point' ? '⚠️ Ponto Facultativo' : '🏫 Dia sem Aula';
                    obs = `${occName}: ${day.occurrence?.name}`;
                  } else if (hasAbsence) {
                    obs = `🚫 ${day.absence?.name}`;
                  } else if (hasAdjustment) {
                    const fields = dayAdjustments.map((adj: any) => {
                      const labels: Record<string, string> = {
                        checkIn: 'E',
                        lunchOut: 'SA',
                        lunchIn: 'RA',
                        checkOut: 'S',
                      };
                      return labels[adj.fieldAltered] || adj.fieldAltered;
                    });
                    obs = `📝 Retificado: ${fields.join(', ')}`;
                  } else if (isWeekend) {
                    obs = 'Fim de semana';
                  } else if (hasJustif) {
                    const statusTxt = day.justification?.status === 'approved' ? 'Aprovada' : day.justification?.status === 'rejected' ? 'Rejeitada' : 'Pendente';
                    const requestedAt = day.justification?.createdAt
                      ? new Date(day.justification!.createdAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
                      : '';
                    obs = `Justif. ${statusTxt}${requestedAt ? ` (solic. ${requestedAt})` : ''}`;
                  } else if (!hasEntry) {
                    obs = 'Sem registro';
                  }

                  return (
                    <tr key={day.date} className={rowBg}>
                      <td className="border border-slate-300 px-0.5 py-0.5 text-center font-semibold text-[10px]">{day.date.slice(8, 10)}</td>
                      <td className="border border-slate-300 px-0.5 py-0.5 text-center text-[10px]">{WEEKDAY_SHORT[day.weekday]}</td>
                      <td className="border border-slate-300 px-0.5 py-0.5 text-center font-mono text-[10px]">
                        {hasEntry ? formatTimeInBrazil(day.entry?.checkIn) : '—'}
                      </td>
                      <td className="border border-slate-300 px-0.5 py-0.5 text-center font-mono text-[10px]">
                        {hasEntry ? formatTimeInBrazil(day.entry?.lunchOut) : '—'}
                      </td>
                      <td className="border border-slate-300 px-0.5 py-0.5 text-center font-mono text-[10px]">
                        {hasEntry ? formatTimeInBrazil(day.entry?.lunchIn) : '—'}
                      </td>
                      <td className="border border-slate-300 px-0.5 py-0.5 text-center font-mono text-[10px]">
                        {hasEntry ? formatTimeInBrazil(day.entry?.checkOut) : '—'}
                      </td>
                      <td className="border border-slate-300 px-0.5 py-0.5 text-[8px]">
                        {obs}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={6} className="border border-slate-700 px-1 py-0.5 text-right text-[9px]">
                    TOTAL DE DIAS REGISTRADOS: {totalEntries} · Total de horas trabalhadas no mês: {totalHours}h{String(totalMins).padStart(2, '0')}
                  </td>
                  <td className="border border-slate-700 px-0.5 py-0.5 text-[8px]"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Resumo de ocorrências */}
          <div className="grid grid-cols-4 gap-1 mb-2 text-[10px]">
            <div className="border border-slate-300 rounded p-1 text-center">
              <p className="text-slate-500 font-medium">Dias Trabalhados</p>
              <p className="text-sm font-bold text-green-700">{totalEntries}</p>
            </div>
            <div className="border border-slate-300 rounded p-1 text-center">
              <p className="text-slate-500 font-medium">Feriados</p>
              <p className="text-sm font-bold text-orange-700">{report.occurrences?.length || 0}</p>
            </div>
            <div className="border border-slate-300 rounded p-1 text-center">
              <p className="text-slate-500 font-medium">Dias Afastado</p>
              <p className="text-sm font-bold text-purple-700">{report.days.filter(d => d.absence).length}</p>
            </div>
            <div className="border border-slate-300 rounded p-1 text-center">
              <p className="text-slate-500 font-medium">Justificativas</p>
              <p className="text-sm font-bold text-amber-700">{report.justifications.length}</p>
            </div>
          </div>

          {/* Assinaturas */}
          <div className="grid grid-cols-2 gap-4 mt-4 pt-2">
            <div className="text-center">
              <div className="border-t border-slate-900 pt-1">
                <p className="text-[10px] font-bold text-slate-900">{report.user.name}</p>
                <p className="text-[9px] text-slate-600">{report.user.position || 'Servidor(a)'}</p>
                <p className="text-[9px] text-slate-600">Matrícula: {report.user.registration || '—'}</p>
              </div>
              <p className="text-[9px] text-slate-500 mt-0.5">Servidor(a)</p>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-900 pt-1">
                <p className="text-[10px] font-bold text-slate-900">____________________________________</p>
                <p className="text-[9px] text-slate-600">Responsável pelo RH</p>
                <p className="text-[9px] text-slate-600">EE Profa. Marlene Frattini</p>
              </div>
              <p className="text-[9px] text-slate-500 mt-0.5">Recursos Humanos</p>
            </div>
          </div>

          <div className="mt-2 text-center text-[9px] text-slate-500 border-t border-slate-200 pt-1">
            Documento gerado eletronicamente em {new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · Sistema de Ponto Eletrônico EE Profa. Marlene Frattini
          </div>
        </div>

        {/* ====== VERSO: SEMPRE imprimir página 2 ====== */}
        <div className="bg-white shadow-lg print:shadow-none print-page mt-6 print:mt-0">
            {/* Cabeçalho */}
            <DocumentHeader brasaoUrl={report.brasaoUrl} />

            <div className="text-center mb-5">
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
                {report.justifications.length > 0 ? 'Justificativas de Ausência' : 'Registro de Ocorrências'}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Anexo à Folha de Ponto · {MONTH_NAMES[report.month.month - 1]} de {report.month.year}
              </p>
            </div>

            <div className="border-2 border-slate-900 rounded-lg p-4 mb-5">
              <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Servidor</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-slate-600 font-medium">Nome: </span>
                  <span className="font-bold text-slate-900">{report.user.name}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">Matrícula: </span>
                  <span className="font-bold text-slate-900">{report.user.registration || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">Cargo: </span>
                  <span className="font-bold text-slate-900">{report.user.position || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">Total de justificativas: </span>
                  <span className="font-bold text-slate-900">{report.justifications.length}</span>
                </div>
              </div>
            </div>

            {/* Conteúdo condicional: se há justificativas, mostra elas; se não, mostra declaração */}
            {report.justifications.length > 0 ? (
              <div className="space-y-4">
                {/* Seção de retificações aprovadas */}
                {(report.adjustments || []).length > 0 && (
                  <div className="border-2 border-cyan-300 rounded-lg p-4 mb-5">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      📝 Retificações Aprovadas no Período
                    </h3>
                    <ul className="space-y-2 text-sm">
                      {(report.adjustments || []).map((adj: any) => (
                        <li key={adj.id} className="flex items-start gap-2 pb-2 border-b border-cyan-100 last:border-b-0 last:pb-0">
                          <span className="font-bold">{formatDateBR(adj.entryDate)}</span>
                          <span className="text-slate-500">—</span>
                          <span>
                            {adj.fieldAltered === 'checkIn' && '🟢 Entrada'}
                            {adj.fieldAltered === 'lunchOut' && '🟡 Saída Almoço'}
                            {adj.fieldAltered === 'lunchIn' && '🟠 Retorno Almoço'}
                            {adj.fieldAltered === 'checkOut' && '🔴 Saída'}
                          </span>
                          <span>para</span>
                          <span className="font-mono font-semibold">{formatTimeInBrazil(adj.newValue)}</span>
                          {adj.adjustmentType === 'hr_direct' && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">RH</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.justifications.map((j, idx) => {
                const absenceDate = new Date(`${j.justificationDate}T12:00:00-03:00`);
                const createdAtDate = new Date(j.createdAt);
                return (
                  <div key={j.id} className="border-2 border-slate-300 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3 pb-3 border-b border-slate-200">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900 text-base mb-2">
                            Ausência no dia {formatDateBR(j.justificationDate)} ({['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][absenceDate.getDay()]})
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                              <p className="text-amber-700 font-semibold">📅 Data da AUSÊNCIA</p>
                              <p className="text-amber-900 font-bold">
                                {formatDateBR(j.justificationDate)} (ontem)
                              </p>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
                              <p className="text-blue-700 font-semibold">✍️ Data da SOLICITAÇÃO</p>
                              <p className="text-blue-900 font-bold">
                                {createdAtDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })} (hoje)
                              </p>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1.5 italic">
                            Obs.: A ausência ocorreu no dia {formatDateBR(j.justificationDate)}, mas a solicitação foi feita no dia seguinte (hoje), conforme permitido pelas regras do sistema.
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full border flex-shrink-0 ${
                        j.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300'
                        : j.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                      }`}>
                        {j.status === 'approved' ? '✓ APROVADA' : j.status === 'rejected' ? '✗ REJEITADA' : '⧗ EM ANÁLISE'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase mb-1">Motivo apresentado pelo servidor:</p>
                      <p className="text-sm text-slate-900 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
                        {j.reason}
                      </p>
                    </div>
                    {j.reviewNotes && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-slate-600 uppercase mb-1">Observação do RH:</p>
                        <p className="text-sm text-slate-900 leading-relaxed bg-blue-50 p-3 rounded border border-blue-200">
                          {j.reviewNotes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            ) : (
              /* Não há justificativas - mostrar apenas ocorrências, ausências e retificações */
              <div className="space-y-4">
                {/* Retificações aprovadas */}
                {(report.adjustments || []).length > 0 && (
                  <div className="border-2 border-cyan-300 rounded-lg p-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      📝 Retificações Aprovadas no Período
                    </h3>
                    <ul className="space-y-2 text-sm">
                      {(report.adjustments || []).map((adj: any) => (
                        <li key={adj.id} className="flex items-start gap-2 pb-2 border-b border-cyan-100 last:border-b-0 last:pb-0">
                          <span className="font-bold">{formatDateBR(adj.entryDate)}</span>
                          <span className="text-slate-500">—</span>
                          <span>
                            {adj.fieldAltered === 'checkIn' && '🟢 Entrada'}
                            {adj.fieldAltered === 'lunchOut' && '🟡 Saída Almoço'}
                            {adj.fieldAltered === 'lunchIn' && '🟠 Retorno Almoço'}
                            {adj.fieldAltered === 'checkOut' && '🔴 Saída'}
                          </span>
                          <span>para</span>
                          <span className="font-mono font-semibold">{formatTimeInBrazil(adj.newValue)}</span>
                          {adj.adjustmentType === 'hr_direct' && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">RH</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(report.occurrences.length > 0 || report.absences.length > 0) && (
                  <div className="space-y-3">
                    {report.occurrences.length > 0 && (
                      <div className="border-2 border-orange-300 rounded-lg p-3">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          🎉 Feriados e Ocorrências no Período
                        </h3>
                        <ul className="space-y-1 text-sm">
                          {report.occurrences.map((o) => (
                            <li key={o.id} className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold">{formatDateBR(o.occurrenceDate)}</span>
                              <span className="text-slate-500">—</span>
                              <span>{o.type === 'holiday' ? '🎉 Feriado' : o.type === 'optional_point' ? '⚠️ Ponto Facultativo' : '🏫 Dia sem Aula'}</span>
                              <span className="font-semibold">: {o.name}</span>
                              <span className="text-xs text-slate-500">({o.scope === 'national' ? 'Nacional' : o.scope === 'state' ? 'Estadual' : o.scope === 'municipal' ? 'Municipal' : 'Escolar'})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.absences.length > 0 && (
                      <div className="border-2 border-purple-300 rounded-lg p-3">
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          🚫 Períodos de Afastamento (servidor impedido de registrar ponto)
                        </h3>
                        <ul className="space-y-1 text-sm">
                          {report.absences.map((a) => {
                            const nameMap: Record<string, string> = {
                              vacation: 'Férias',
                              medical_leave: 'Licença Médica',
                              maternity_leave: 'Licença Maternidade',
                              paternity_leave: 'Licença Paternidade',
                              bereavement_leave: 'Licença Nojo',
                              marriage_leave: 'Licença Casamento',
                              technical_orientation: 'Orientação Técnica',
                              other: 'Afastamento',
                            };
                            return (
                              <li key={a.id} className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">🚫 {nameMap[a.type] || 'Afastamento'}</span>
                                <span>de {formatDateBR(a.startDate)} a {formatDateBR(a.endDate)}</span>
                                {a.documentRef && <span className="text-xs text-slate-500">(Doc: {a.documentRef})</span>}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Declaração e assinaturas - apenas quando há justificativas */}
            {report.justifications.length > 0 && (
              <>
                <div className="mt-6 border-2 border-slate-900 rounded-lg p-4 bg-slate-50">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong>DECLARAÇÃO:</strong> Declaro que as justificativas acima foram analisadas pelo setor de Recursos Humanos da EE Profa. Marlene Frattini, conforme documentação apresentada e em conformidade com as normas internas da instituição.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8 mt-12 pt-8">
                  <div className="text-center">
                    <div className="border-t border-slate-900 pt-2">
                      <p className="text-xs font-bold text-slate-900">____________________________________</p>
                      <p className="text-[10px] text-slate-600">Responsável pelo RH</p>
                      <p className="text-[10px] text-slate-600">EE Profa. Marlene Frattini</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t border-slate-900 pt-2">
                      <p className="text-xs font-bold text-slate-900">____________________________________</p>
                      <p className="text-[10px] text-slate-600">Diretor(a) da Unidade Escolar</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-8 text-center text-[10px] text-slate-500 border-t border-slate-200 pt-3">
              Documento gerado eletronicamente em {new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · Sistema de Ponto Eletrônico EE Profa. Marlene Frattini
            </div>
        </div>
      </div>

      {/* CSS de impressão */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            background: white !important;
          }
          .print-page {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default function MonthlyReportPage() {
  return (
    <AuthProvider>
      <MonthlyReportContent />
    </AuthProvider>
  );
}
