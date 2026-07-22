import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { users, timeEntries, justifications, workSchedules, settings, dayOccurrences, serverAbsences, timeEntryAdjustments } from '@/db/schema';
import { and, eq, gte, lte, asc } from 'drizzle-orm';
import { getCurrentBrazilDate } from '@/lib/timezone';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const monthParam = searchParams.get('month');

    // Servidor só pode ver seu próprio relatório
    let targetUserId = session.userId;
    if (session.role === 'hr' && userIdParam) {
      targetUserId = parseInt(userIdParam, 10);
    } else if (session.role === 'server' && userIdParam && parseInt(userIdParam, 10) !== session.userId) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Define o mês
    let year: number, month: number;
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      year = y;
      month = m;
    } else {
      const today = getCurrentBrazilDate();
      year = parseInt(today.slice(0, 4));
      month = parseInt(today.slice(5, 7));
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Busca dados do usuário
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .then((rows) => rows[0]);

    if (!user) {
      return NextResponse.json({ error: 'Servidor não encontrado' }, { status: 404 });
    }

    // Busca todos os registros do mês
    const entries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, targetUserId),
          gte(timeEntries.entryDate, startDate),
          lte(timeEntries.entryDate, endDate)
        )
      )
      .orderBy(asc(timeEntries.entryDate));

    // Busca justificativas do mês
    const justificationsList = await db
      .select()
      .from(justifications)
      .where(
        and(
          eq(justifications.userId, targetUserId),
          gte(justifications.justificationDate, startDate),
          lte(justifications.justificationDate, endDate)
        )
      )
      .orderBy(asc(justifications.justificationDate));

    // Busca horários de trabalho
    const schedules = await db
      .select()
      .from(workSchedules)
      .where(eq(workSchedules.userId, targetUserId))
      .orderBy(asc(workSchedules.weekday));

    // Busca configurações (brasão)
    const brasaoSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'brasaoUrl'))
      .then((rows) => rows[0]);
    const brasaoUrl = brasaoSetting?.value || null;

    // Busca feriados/ponto facultativo do mês
    const monthOccurrences = await db
      .select()
      .from(dayOccurrences)
      .where(and(gte(dayOccurrences.occurrenceDate, startDate), lte(dayOccurrences.occurrenceDate, endDate)))
      .orderBy(asc(dayOccurrences.occurrenceDate));

    // Busca ausências (férias, licenças, etc) que se sobrepõem ao mês
    const monthAbsences = await db
      .select()
      .from(serverAbsences)
      .where(
        and(
          eq(serverAbsences.userId, targetUserId),
          lte(serverAbsences.startDate, endDate),
          gte(serverAbsences.endDate, startDate)
        )
      )
      .orderBy(asc(serverAbsences.startDate));

    // Busca retificações aprovadas do mês (para visualização na folha ponto)
    const monthAdjustments = await db
      .select()
      .from(timeEntryAdjustments)
      .where(
        and(
          eq(timeEntryAdjustments.userId, targetUserId),
          eq(timeEntryAdjustments.status, 'approved'),
          gte(timeEntryAdjustments.entryDate, startDate),
          lte(timeEntryAdjustments.entryDate, endDate)
        )
      )
      .orderBy(asc(timeEntryAdjustments.entryDate));

    // Gerar lista completa de dias do mês com status
    type DayType = {
      date: string;
      weekday: number;
      weekdayName: string;
      entry: typeof entries[0] | null;
      hasJustification: boolean;
      justification: typeof justificationsList[0] | null;
      occurrence: typeof monthOccurrences[0] | null;
      absence: {
        type: string;
        name: string;
        startDate: string;
        endDate: string;
      } | null;
    };
    const days: DayType[] = [];

    const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    const absenceNames: Record<string, string> = {
      vacation: 'Férias',
      medical_leave: 'Licença Médica',
      maternity_leave: 'Licença Maternidade',
      paternity_leave: 'Licença Paternidade',
      bereavement_leave: 'Licença Nojo',
      marriage_leave: 'Licença Casamento',
      technical_orientation: 'Orientação Técnica',
      other: 'Afastamento',
    };

    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dt = new Date(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00-03:00`);
      const weekday = dt.getDay();
      const entry = entries.find((e) => e.entryDate === dateStr) || null;
      const justification = justificationsList.find((j) => j.justificationDate === dateStr) || null;
      const occurrence = monthOccurrences.find((o) => o.occurrenceDate === dateStr) || null;

      // Verifica se o dia está dentro de algum período de ausência
      const activeAbsence = monthAbsences.find((a) => dateStr >= a.startDate && dateStr <= a.endDate) || null;

      days.push({
        date: dateStr,
        weekday,
        weekdayName: weekdayNames[weekday],
        entry,
        hasJustification: !!justification,
        justification,
        occurrence,
        absence: activeAbsence ? {
          type: activeAbsence.type,
          name: absenceNames[activeAbsence.type] || 'Afastamento',
          startDate: activeAbsence.startDate,
          endDate: activeAbsence.endDate,
        } : null,
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        position: user.position,
        registration: user.registration,
        department: user.department,
        admissionDate: user.admissionDate,
      },
      month: {
        year,
        month,
        startDate,
        endDate,
        totalDays: lastDay,
      },
      entries,
      justifications: justificationsList,
      schedules,
      days,
      brasaoUrl,
      occurrences: monthOccurrences,
      absences: monthAbsences,
      adjustments: monthAdjustments,
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
