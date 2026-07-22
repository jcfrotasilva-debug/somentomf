import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { timeEntries, serverAbsences, dayOccurrences, workSchedules } from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { getCurrentBrazilDate, BRAZIL_TZ } from '@/lib/timezone';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const today = getCurrentBrazilDate();
    const todayEntry = await db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.userId, session.userId), eq(timeEntries.entryDate, today)))
      .then((rows) => rows[0]);

    return NextResponse.json({ entry: todayEntry || null, date: today });
  } catch (error) {
    console.error('Erro ao buscar registro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// type: 'checkIn' | 'lunchOut' | 'lunchIn' | 'checkOut'
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { type } = await request.json();
    const validTypes = ['checkIn', 'lunchOut', 'lunchIn', 'checkOut'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipo de registro inválido' }, { status: 400 });
    }

    const today = getCurrentBrazilDate();
    const now = new Date();

    // ========================================================================
    // VALIDAÇÃO: Verifica se o servidor tem horário cadastrado para hoje
    // Se não tiver horário OU se estiver marcado como "não trabalha", bloqueia
    // ========================================================================
    const currentWeekday = (() => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: BRAZIL_TZ,
        weekday: 'short',
      });
      const dayName = formatter.format(now);
      const dayMap: Record<string, number> = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
      };
      return dayMap[dayName];
    })();

    const weekdayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    const workSchedule = await db
      .select()
      .from(workSchedules)
      .where(and(eq(workSchedules.userId, session.userId), eq(workSchedules.weekday, currentWeekday)))
      .then((rows) => rows[0]);

    // Se não houver horário cadastrado para este dia OU se estiver marcado como "não trabalha"
    if (!workSchedule || !workSchedule.isWorkday) {
      return NextResponse.json(
        { error: `Você não tem horário de trabalho cadastrado para ${weekdayNames[currentWeekday]}. Entre em contato com o RH para regularizar sua jornada.` },
        { status: 403 }
      );
    }

    // Verifica se o servidor está afastado hoje (férias, licença, etc)
    const activeAbsence = await db
      .select()
      .from(serverAbsences)
      .where(
        and(
          eq(serverAbsences.userId, session.userId),
          lte(serverAbsences.startDate, today),
          gte(serverAbsences.endDate, today)
        )
      )
      .then((rows) => rows[0]);

    if (activeAbsence) {
      const typeNames: Record<string, string> = {
        vacation: 'Férias',
        medical_leave: 'Licença Médica',
        maternity_leave: 'Licença Maternidade',
        paternity_leave: 'Licença Paternidade',
        bereavement_leave: 'Licença Nojo (Falecimento)',
        marriage_leave: 'Licença Casamento',
        technical_orientation: 'Orientação Técnica',
        other: 'Outro afastamento',
      };
      return NextResponse.json(
        { error: `Você está em período de ${typeNames[activeAbsence.type] || 'afastamento'} (${activeAbsence.startDate} a ${activeAbsence.endDate}) e não pode registrar ponto.` },
        { status: 403 }
      );
    }

    // Verifica se hoje é feriado ou ponto facultativo
    const occurrence = await db
      .select()
      .from(dayOccurrences)
      .where(eq(dayOccurrences.occurrenceDate, today))
      .then((rows) => rows[0]);

    if (occurrence && (occurrence.type === 'holiday' || occurrence.type === 'optional_point')) {
      return NextResponse.json(
        { error: `Hoje é ${occurrence.type === 'holiday' ? 'Feriado' : 'Ponto Facultativo'}: ${occurrence.name}. Não é permitido registrar ponto.` },
        { status: 403 }
      );
    }

    // Busca o registro do dia atual
    const todayEntry = await db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.userId, session.userId), eq(timeEntries.entryDate, today)))
      .then((rows) => rows[0]);

    // Valida a ordem dos registros
    if (type === 'checkIn') {
      if (todayEntry) {
        return NextResponse.json({ error: 'Você já registrou a entrada hoje' }, { status: 400 });
      }
      // Cria novo registro
      const [entry] = await db
        .insert(timeEntries)
        .values({
          userId: session.userId,
          entryDate: today,
          checkIn: now,
        })
        .returning();
      return NextResponse.json({ entry, message: 'Entrada registrada com sucesso!' });
    }

    if (!todayEntry) {
      return NextResponse.json(
        { error: 'Você precisa registrar a entrada antes' },
        { status: 400 }
      );
    }

    if (type === 'lunchOut') {
      if (todayEntry.lunchOut) {
        return NextResponse.json({ error: 'Você já registrou a saída para o almoço' }, { status: 400 });
      }
      if (!todayEntry.checkIn) {
        return NextResponse.json({ error: 'Registre a entrada primeiro' }, { status: 400 });
      }
      const [entry] = await db
        .update(timeEntries)
        .set({ lunchOut: now, updatedAt: now })
        .where(eq(timeEntries.id, todayEntry.id))
        .returning();
      return NextResponse.json({ entry, message: 'Saída para almoço registrada!' });
    }

    if (type === 'lunchIn') {
      if (todayEntry.lunchIn) {
        return NextResponse.json({ error: 'Você já registrou o retorno do almoço' }, { status: 400 });
      }
      if (!todayEntry.lunchOut) {
        return NextResponse.json({ error: 'Registre a saída para o almoço primeiro' }, { status: 400 });
      }
      const [entry] = await db
        .update(timeEntries)
        .set({ lunchIn: now, updatedAt: now })
        .where(eq(timeEntries.id, todayEntry.id))
        .returning();
      return NextResponse.json({ entry, message: 'Retorno do almoço registrado!' });
    }

    if (type === 'checkOut') {
      if (todayEntry.checkOut) {
        return NextResponse.json({ error: 'Você já registrou a saída hoje' }, { status: 400 });
      }
      if (!todayEntry.lunchIn) {
        return NextResponse.json({ error: 'Registre o retorno do almoço primeiro' }, { status: 400 });
      }
      const [entry] = await db
        .update(timeEntries)
        .set({ checkOut: now, updatedAt: now })
        .where(eq(timeEntries.id, todayEntry.id))
        .returning();
      return NextResponse.json({ entry, message: 'Saída registrada com sucesso!' });
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao registrar ponto:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
