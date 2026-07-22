import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { justifications, users, timeEntries } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { getCurrentBrazilDate, getYesterdayBrazilDate } from '@/lib/timezone';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    // Servidor só vê suas justificativas, RH vê todas
    const whereClauses: ReturnType<typeof eq>[] = [];
    if (session.role === 'server') {
      whereClauses.push(eq(justifications.userId, session.userId));
    } else if (userId) {
      whereClauses.push(eq(justifications.userId, parseInt(userId, 10)));
    }
    if (status && status !== 'all') {
      whereClauses.push(eq(justifications.status, status));
    }

    const query = db
      .select({
        id: justifications.id,
        userId: justifications.userId,
        justificationDate: justifications.justificationDate,
        reason: justifications.reason,
        status: justifications.status,
        reviewNotes: justifications.reviewNotes,
        createdAt: justifications.createdAt,
        updatedAt: justifications.updatedAt,
        userName: users.name,
        userRegistration: users.registration,
        userPosition: users.position,
      })
      .from(justifications)
      .leftJoin(users, eq(justifications.userId, users.id));

    const results = whereClauses.length > 0
      ? await query.where(and(...whereClauses)).orderBy(desc(justifications.justificationDate))
      : await query.orderBy(desc(justifications.justificationDate));

    return NextResponse.json({ justifications: results });
  } catch (error) {
    console.error('Erro ao listar justificativas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (session.role !== 'server') {
      return NextResponse.json({ error: 'Apenas servidores podem solicitar justificativa' }, { status: 403 });
    }

    const { date, reason } = await request.json();

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'A justificativa deve ter pelo menos 10 caracteres' },
        { status: 400 }
      );
    }

    // Normaliza a data recebida (garante formato YYYY-MM-DD)
    const normalizedDate = typeof date === 'string' ? date.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      return NextResponse.json(
        { error: 'Data inválida' },
        { status: 400 }
      );
    }

    // Calcula datas no fuso horário do Brasil (servidor)
    const today = getCurrentBrazilDate();
    const yesterday = getYesterdayBrazilDate();

    // VALIDAÇÃO RIGOROSA: só pode justificar o dia ANTERIOR (ontem no Brasil)
    if (normalizedDate !== yesterday) {
      // Mensagens específicas para cada caso
      if (normalizedDate === today) {
        return NextResponse.json(
          { error: 'Não é possível justificar o dia atual. A justificativa só é permitida para o dia anterior.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Você só pode solicitar justificativa para o dia anterior (${yesterday}). Data enviada: ${normalizedDate}` },
        { status: 400 }
      );
    }

    // VALIDAÇÃO: não pode justificar um dia que JÁ tem registro de ponto
    // (seria contraditório: se registrou o ponto, não é ausência)
    const existingEntry = await db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.userId, session.userId), eq(timeEntries.entryDate, normalizedDate)))
      .then((rows) => rows[0]);

    if (existingEntry) {
      return NextResponse.json(
        { error: 'Já existe registro de ponto para esta data. Não é possível justificar ausência em dia com registro.' },
        { status: 400 }
      );
    }

    // Verifica se já existe justificativa para essa data
    const existing = await db
      .select()
      .from(justifications)
      .where(and(eq(justifications.userId, session.userId), eq(justifications.justificationDate, normalizedDate)))
      .then((rows) => rows[0]);

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe uma justificativa para esta data' },
        { status: 400 }
      );
    }

    const [justification] = await db
      .insert(justifications)
      .values({
        userId: session.userId,
        justificationDate: normalizedDate,
        reason: reason.trim(),
      })
      .returning();

    return NextResponse.json({
      justification,
      message: `Justificativa para ${normalizedDate} enviada com sucesso! Aguardando análise do RH.`,
    });
  } catch (error) {
    console.error('Erro ao criar justificativa:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// RH aprova/rejeita
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id, status, reviewNotes } = await request.json();
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const [updated] = await db
      .update(justifications)
      .set({ status, reviewNotes: reviewNotes || null, updatedAt: new Date() })
      .where(eq(justifications.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Justificativa não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ justification: updated, message: 'Justificativa atualizada' });
  } catch (error) {
    console.error('Erro ao atualizar justificativa:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
