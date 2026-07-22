import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { dayOccurrences } from '@/db/schema';
import { eq, gte, lte, and, asc } from 'drizzle-orm';

// GET: listar ocorrências (todos ou por mês)
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM

    if (month) {
      const [y, m] = month.split('-').map(Number);
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const list = await db
        .select()
        .from(dayOccurrences)
        .where(and(gte(dayOccurrences.occurrenceDate, startDate), lte(dayOccurrences.occurrenceDate, endDate)))
        .orderBy(asc(dayOccurrences.occurrenceDate));

      return NextResponse.json({ occurrences: list });
    }

    const list = await db.select().from(dayOccurrences).orderBy(asc(dayOccurrences.occurrenceDate));
    return NextResponse.json({ occurrences: list });
  } catch (error) {
    console.error('Erro ao listar ocorrências:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST: criar ocorrência (HR only)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const data = await request.json();
    const { occurrenceDate, type, name, scope } = data;

    if (!occurrenceDate || !type || !name) {
      return NextResponse.json(
        { error: 'Data, tipo e nome são obrigatórios' },
        { status: 400 }
      );
    }

    if (!['holiday', 'optional_point', 'no_school_day'].includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    // Verifica se já existe
    const existing = await db
      .select()
      .from(dayOccurrences)
      .where(eq(dayOccurrences.occurrenceDate, occurrenceDate))
      .then((rows) => rows[0]);

    if (existing) {
      return NextResponse.json({ error: 'Já existe ocorrência para esta data' }, { status: 400 });
    }

    const [occurrence] = await db
      .insert(dayOccurrences)
      .values({
        occurrenceDate,
        type,
        name,
        scope: scope || 'national',
      })
      .returning();

    return NextResponse.json({ occurrence, message: 'Ocorrência cadastrada!' }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar ocorrência:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT: atualizar ocorrência (HR only)
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const data = await request.json();
    const { id, type, name, scope } = data;

    const [updated] = await db
      .update(dayOccurrences)
      .set({ type, name, scope: scope || 'national' })
      .where(eq(dayOccurrences.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Ocorrência não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ occurrence: updated, message: 'Ocorrência atualizada!' });
  } catch (error) {
    console.error('Erro ao atualizar ocorrência:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE: remover ocorrência (HR only)
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

    await db.delete(dayOccurrences).where(eq(dayOccurrences.id, parseInt(id, 10)));
    return NextResponse.json({ message: 'Ocorrência removida!' });
  } catch (error) {
    console.error('Erro ao remover ocorrência:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
