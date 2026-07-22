import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { serverAbsences, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET: listar ausências
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (session.role === 'server') {
      // Servidor só vê suas ausências
      const list = await db
        .select()
        .from(serverAbsences)
        .where(eq(serverAbsences.userId, session.userId))
        .orderBy(desc(serverAbsences.startDate));
      return NextResponse.json({ absences: list });
    } else if (userId) {
      const list = await db
        .select()
        .from(serverAbsences)
        .where(eq(serverAbsences.userId, parseInt(userId, 10)))
        .orderBy(desc(serverAbsences.startDate));
      return NextResponse.json({ absences: list });
    } else {
      // RH: lista todas
      const list = await db
        .select({
          id: serverAbsences.id,
          userId: serverAbsences.userId,
          type: serverAbsences.type,
          startDate: serverAbsences.startDate,
          endDate: serverAbsences.endDate,
          reason: serverAbsences.reason,
          documentRef: serverAbsences.documentRef,
          createdAt: serverAbsences.createdAt,
          userName: users.name,
        })
        .from(serverAbsences)
        .leftJoin(users, eq(serverAbsences.userId, users.id))
        .orderBy(desc(serverAbsences.startDate));
      return NextResponse.json({ absences: list });
    }
  } catch (error) {
    console.error('Erro ao listar ausências:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST: criar ausência (HR only)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const data = await request.json();
    const { userId, type, startDate, endDate, reason, documentRef } = data;

    if (!userId || !type || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Servidor, tipo, data inicial e final são obrigatórios' },
        { status: 400 }
      );
    }

    const validTypes = ['vacation', 'medical_leave', 'maternity_leave', 'paternity_leave', 'bereavement_leave', 'marriage_leave', 'technical_orientation', 'other'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json({ error: 'Data final deve ser posterior à data inicial' }, { status: 400 });
    }

    // Verifica se o usuário existe
    const user = await db.select().from(users).where(eq(users.id, userId)).then((rows) => rows[0]);
    if (!user) {
      return NextResponse.json({ error: 'Servidor não encontrado' }, { status: 404 });
    }

    const [absence] = await db
      .insert(serverAbsences)
      .values({
        userId,
        type,
        startDate,
        endDate,
        reason: reason || null,
        documentRef: documentRef || null,
      })
      .returning();

    return NextResponse.json({ absence, message: 'Ausência cadastrada com sucesso!' }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar ausência:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT: atualizar ausência (HR only)
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const data = await request.json();
    const { id, type, startDate, endDate, reason, documentRef } = data;

    const [updated] = await db
      .update(serverAbsences)
      .set({
        type,
        startDate,
        endDate,
        reason: reason || null,
        documentRef: documentRef || null,
      })
      .where(eq(serverAbsences.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Ausência não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ absence: updated, message: 'Ausência atualizada!' });
  } catch (error) {
    console.error('Erro ao atualizar ausência:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE: remover ausência (HR only)
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    await db.delete(serverAbsences).where(eq(serverAbsences.id, parseInt(id, 10)));
    return NextResponse.json({ message: 'Ausência removida!' });
  } catch (error) {
    console.error('Erro ao remover ausência:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
