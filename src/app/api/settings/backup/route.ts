import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { users, timeEntries, justifications, workSchedules, settings } from '@/db/schema';

// Gera backup completo do sistema em JSON
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const [usersList, entriesList, justificationsList, schedulesList, settingsList] = await Promise.all([
      db.select().from(users),
      db.select().from(timeEntries),
      db.select().from(justifications),
      db.select().from(workSchedules),
      db.select().from(settings),
    ]);

    // Remove senhas hasheadas do backup por segurança
    const safeUsers = usersList.map(({ password, ...rest }) => rest);

    const backup = {
      version: '1.0',
      systemName: 'EE Profa. Marlene Frattini - Sistema de Ponto',
      exportedAt: new Date().toISOString(),
      exportedAtBR: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      data: {
        users: safeUsers,
        timeEntries: entriesList,
        justifications: justificationsList,
        workSchedules: schedulesList,
        settings: settingsList,
      },
      note: 'Backup gerado pelo Sistema de Ponto Eletrônico. IMPORTANTE: as senhas NÃO estão inclusas neste backup por segurança. Ao restaurar, os servidores precisarão redefinir suas senhas.',
    };

    const jsonString = JSON.stringify(backup, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup-ee-marlene-frattini-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar backup:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
