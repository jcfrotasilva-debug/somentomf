import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { timeEntries, users } from '@/db/schema';
import { and, eq, desc, gte, lte } from 'drizzle-orm';
import { getCurrentBrazilDate } from '@/lib/timezone';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    const userId = searchParams.get('userId');

    // Se for RH, pode filtrar por userId
    let targetUserId = session.userId;
    if (session.role === 'hr' && userId) {
      targetUserId = parseInt(userId, 10);
    }

    // Default: mês atual no Brasil
    let startDate: string, endDate: string;
    if (month) {
      const [y, m] = month.split('-').map(Number);
      startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      // último dia do mês
      const lastDay = new Date(y, m, 0).getDate();
      endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else {
      const today = getCurrentBrazilDate();
      const y = parseInt(today.slice(0, 4));
      const m = parseInt(today.slice(5, 7));
      startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

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
      .orderBy(desc(timeEntries.entryDate));

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Rota para listar todos os usuários (só para RH)
export async function HEAD() {
  const session = await getSession();
  if (!session || session.role !== 'hr') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
