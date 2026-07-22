import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { timeEntryAdjustments, timeEntries, users } from '@/db/schema';
import { and, eq, desc, gte, lte, or } from 'drizzle-orm';
import { getCurrentBrazilDate } from '@/lib/timezone';

const VALID_FIELDS = ['checkIn', 'lunchOut', 'lunchIn', 'checkOut'];

// GET: listar retificações
// - Servidor: só suas próprias
// - RH: todas ou filtradas por userId
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const statusParam = searchParams.get('status');
    const monthParam = searchParams.get('month');

    const whereClauses = [];

    // Servidor só vê suas retificações
    if (session.role === 'server') {
      whereClauses.push(eq(timeEntryAdjustments.userId, session.userId));
    } else if (userIdParam) {
      whereClauses.push(eq(timeEntryAdjustments.userId, parseInt(userIdParam, 10)));
    }

    if (statusParam && statusParam !== 'all') {
      whereClauses.push(eq(timeEntryAdjustments.status, statusParam));
    }

    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      whereClauses.push(gte(timeEntryAdjustments.entryDate, startDate));
      whereClauses.push(lte(timeEntryAdjustments.entryDate, endDate));
    }

    const query = db
      .select({
        id: timeEntryAdjustments.id,
        timeEntryId: timeEntryAdjustments.timeEntryId,
        entryDate: timeEntryAdjustments.entryDate,
        userId: timeEntryAdjustments.userId,
        fieldAltered: timeEntryAdjustments.fieldAltered,
        oldValue: timeEntryAdjustments.oldValue,
        newValue: timeEntryAdjustments.newValue,
        reason: timeEntryAdjustments.reason,
        adjustmentType: timeEntryAdjustments.adjustmentType,
        requestedById: timeEntryAdjustments.requestedById,
        approvedById: timeEntryAdjustments.approvedById,
        status: timeEntryAdjustments.status,
        adjustmentDate: timeEntryAdjustments.adjustmentDate,
        createdAt: timeEntryAdjustments.createdAt,
        userName: users.name,
        userRegistration: users.registration,
        userPosition: users.position,
      })
      .from(timeEntryAdjustments)
      .leftJoin(users, eq(timeEntryAdjustments.userId, users.id));

    const results = whereClauses.length > 0
      ? await query.where(and(...whereClauses)).orderBy(desc(timeEntryAdjustments.createdAt))
      : await query.orderBy(desc(timeEntryAdjustments.createdAt));

    return NextResponse.json({ adjustments: results });
  } catch (error) {
    console.error('Erro ao listar retificações:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST: criar retificação (servidor solicita OU RH cria direto)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { entryDate, fieldAltered, oldValue, newValue, reason, userId, adjustmentType } = body;

    // Validações
    if (!entryDate || !fieldAltered || !reason) {
      return NextResponse.json(
        { error: 'Data, campo e motivo são obrigatórios' },
        { status: 400 }
      );
    }

    if (!VALID_FIELDS.includes(fieldAltered)) {
      return NextResponse.json(
        { error: 'Campo inválido. Deve ser: checkIn, lunchOut, lunchIn ou checkOut' },
        { status: 400 }
      );
    }

    if (reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'O motivo deve ter pelo menos 10 caracteres' },
        { status: 400 }
      );
    }

    // Validar data
    const today = getCurrentBrazilDate();
    if (entryDate > today) {
      return NextResponse.json(
        { error: 'Não é possível solicitar retificação para data futura' },
        { status: 400 }
      );
    }

    // Servidor só pode solicitar para si mesmo
    let targetUserId = session.userId;
    if (session.role === 'server') {
      // Servidor só pode solicitar ajustes (não pode ser direto)
      const adjType = 'server_request';
    } else if (session.role === 'hr' && userId) {
      targetUserId = parseInt(userId, 10);
    }

    // Buscar o registro do dia
    const existingEntry = await db
      .select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.userId, targetUserId),
        eq(timeEntries.entryDate, entryDate)
      ))
      .then((rows) => rows[0]);

    // Se não existe registro, criar um primeiro
    let timeEntryId = existingEntry?.id;
    if (!existingEntry) {
      const [newEntry] = await db
        .insert(timeEntries)
        .values({
          userId: targetUserId,
          entryDate,
        })
        .returning();
      timeEntryId = newEntry.id;
    }

    // Verifica se já existe solicitação pendente para este campo
    const existingPending = await db
      .select()
      .from(timeEntryAdjustments)
      .where(and(
        eq(timeEntryAdjustments.timeEntryId, timeEntryId!),
        eq(timeEntryAdjustments.fieldAltered, fieldAltered),
        eq(timeEntryAdjustments.status, 'pending')
      ))
      .then((rows) => rows[0]);

    if (existingPending) {
      return NextResponse.json(
        { error: 'Já existe uma solicitação pendente para este campo' },
        { status: 400 }
      );
    }

    // Determinar o tipo
    let finalType = 'server_request';
    let status: 'pending' | 'approved' = 'pending';
    let approvedById: number | null = null;
    let adjustmentDate: Date | null = null;

    if (session.role === 'hr' && adjustmentType === 'hr_direct') {
      finalType = 'hr_direct';
      status = 'approved';
      approvedById = session.userId;
      adjustmentDate = new Date();

      // Aplicar a alteração diretamente no registro
      const updateData: Record<string, unknown> = {};
      if (newValue) {
        updateData[fieldAltered] = newValue;
      } else {
        updateData[fieldAltered] = null;
      }
      updateData.updatedAt = new Date();

      await db
        .update(timeEntries)
        .set(updateData)
        .where(eq(timeEntries.id, timeEntryId!));
    }

    const [adjustment] = await db
      .insert(timeEntryAdjustments)
      .values({
        timeEntryId: timeEntryId!,
        entryDate,
        userId: targetUserId,
        fieldAltered,
        oldValue: oldValue || null,
        newValue: newValue || null,
        reason: reason.trim(),
        adjustmentType: finalType,
        requestedById: session.role === 'server' ? session.userId : null,
        approvedById,
        status,
        adjustmentDate,
      })
      .returning();

    const message = session.role === 'hr' && adjustmentType === 'hr_direct'
      ? 'Retificação aplicada diretamente com sucesso!'
      : 'Solicitação de retificação enviada! Aguardando análise do RH.';

    return NextResponse.json({ adjustment, message }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar retificação:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
