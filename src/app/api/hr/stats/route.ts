import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { users, timeEntries, justifications } from '@/db/schema';
import { and, eq, gte, lte, sql, count } from 'drizzle-orm';
import { getCurrentBrazilDate } from '@/lib/timezone';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const today = getCurrentBrazilDate();
    const y = parseInt(today.slice(0, 4));
    const m = parseInt(today.slice(5, 7));
    const lastDay = new Date(y, m, 0).getDate();
    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
    const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const [totalServers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.active, true), eq(users.role, 'server')));

    const [todayRecords] = await db
      .select({ count: sql<number>`count(*)` })
      .from(timeEntries)
      .where(eq(timeEntries.entryDate, today));

    const [pendingJustifications] = await db
      .select({ count: sql<number>`count(*)` })
      .from(justifications)
      .where(eq(justifications.status, 'pending'));

    const [monthRecords] = await db
      .select({ count: sql<number>`count(*)` })
      .from(timeEntries)
      .where(and(gte(timeEntries.entryDate, monthStart), lte(timeEntries.entryDate, monthEnd)));

    return NextResponse.json({
      totalServers: Number(totalServers.count),
      todayRecords: Number(todayRecords.count),
      pendingJustifications: Number(pendingJustifications.count),
      monthRecords: Number(monthRecords.count),
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
