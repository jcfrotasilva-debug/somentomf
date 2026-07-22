import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { workSchedules, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

// GET: listar horários de um servidor (ou do próprio servidor logado)
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let userId = session.userId;

    // Servidor só pode ver seus próprios horários
    if (session.role === 'server') {
      // Mantém o userId do próprio servidor
    } else if (session.role === 'hr') {
      const paramUserId = searchParams.get('userId');
      if (paramUserId) {
        userId = parseInt(paramUserId, 10);
      } else {
        return NextResponse.json({ error: 'userId é obrigatório para RH' }, { status: 400 });
      }
    }

    const schedules = await db
      .select()
      .from(workSchedules)
      .where(eq(workSchedules.userId, userId))
      .orderBy(workSchedules.weekday);

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Erro ao buscar horários:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST: criar/atualizar horário (HR only)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const data = await request.json();
    const { userId, weekday, checkInTime, lunchOutTime, lunchInTime, checkOutTime, isWorkday } = data;

    if (!userId || weekday === undefined) {
      return NextResponse.json({ error: 'userId e weekday são obrigatórios' }, { status: 400 });
    }

    // Verifica se o servidor existe
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .then((rows) => rows[0]);

    if (!user) {
      return NextResponse.json({ error: 'Servidor não encontrado' }, { status: 404 });
    }

    // Verifica se já existe horário para este dia
    const existing = await db
      .select()
      .from(workSchedules)
      .where(and(eq(workSchedules.userId, userId), eq(workSchedules.weekday, weekday)))
      .then((rows) => rows[0]);

    let result;
    if (existing) {
      [result] = await db
        .update(workSchedules)
        .set({
          checkInTime: checkInTime || null,
          lunchOutTime: lunchOutTime || null,
          lunchInTime: lunchInTime || null,
          checkOutTime: checkOutTime || null,
          isWorkday: isWorkday !== undefined ? isWorkday : true,
          updatedAt: new Date(),
        })
        .where(eq(workSchedules.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(workSchedules)
        .values({
          userId,
          weekday,
          checkInTime: checkInTime || null,
          lunchOutTime: lunchOutTime || null,
          lunchInTime: lunchInTime || null,
          checkOutTime: checkOutTime || null,
          isWorkday: isWorkday !== undefined ? isWorkday : true,
        })
        .returning();
    }

    return NextResponse.json({ schedule: result, message: 'Horário salvo com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar horário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST em massa para atualizar todos os dias da semana
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const data = await request.json();
    const { userId, schedules } = data;

    if (!userId || !Array.isArray(schedules)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const results = [];
    for (const s of schedules) {
      const existing = await db
        .select()
        .from(workSchedules)
        .where(and(eq(workSchedules.userId, userId), eq(workSchedules.weekday, s.weekday)))
        .then((rows) => rows[0]);

      if (existing) {
        const [updated] = await db
          .update(workSchedules)
          .set({
            checkInTime: s.checkInTime || null,
            lunchOutTime: s.lunchOutTime || null,
            lunchInTime: s.lunchInTime || null,
            checkOutTime: s.checkOutTime || null,
            isWorkday: s.isWorkday !== undefined ? s.isWorkday : true,
            updatedAt: new Date(),
          })
          .where(eq(workSchedules.id, existing.id))
          .returning();
        results.push(updated);
      } else {
        const [created] = await db
          .insert(workSchedules)
          .values({
            userId,
            weekday: s.weekday,
            checkInTime: s.checkInTime || null,
            lunchOutTime: s.lunchOutTime || null,
            lunchInTime: s.lunchInTime || null,
            checkOutTime: s.checkOutTime || null,
            isWorkday: s.isWorkday !== undefined ? s.isWorkday : true,
          })
          .returning();
        results.push(created);
      }
    }

    return NextResponse.json({ schedules: results, message: 'Horários salvos com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar horários:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
