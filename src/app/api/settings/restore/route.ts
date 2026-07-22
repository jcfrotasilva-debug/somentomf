import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { users, timeEntries, justifications, workSchedules, settings } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { hashPassword } from '@/lib/password';

// Restaura dados a partir de um JSON de backup
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();

    // Validações de estrutura
    if (!body || !body.data) {
      return NextResponse.json(
        { error: 'Arquivo de backup inválido. Estrutura incorreta.' },
        { status: 400 }
      );
    }

    const { data } = body;
    const result = {
      users: 0,
      timeEntries: 0,
      justifications: 0,
      workSchedules: 0,
      settings: 0,
      errors: [] as string[],
    };

    // Usuários (com senha padrão gerada)
    if (Array.isArray(data.users)) {
      for (const u of data.users) {
        try {
          const existing = await db.select().from(users).where(eq(users.id, u.id)).then((rows) => rows[0]);
          const existingEmail = await db.select().from(users).where(eq(users.email, u.email)).then((rows) => rows[0]);

          // Gera senha padrão: 123456
          const defaultPassword = await hashPassword('123456');

          if (existing) {
            await db.update(users).set({
              name: u.name,
              email: u.email,
              role: u.role || 'server',
              position: u.position || null,
              registration: u.registration || null,
              department: u.department || null,
              admissionDate: u.admissionDate || null,
              phone: u.phone || null,
              active: u.active !== undefined ? u.active : true,
              password: defaultPassword,
            }).where(eq(users.id, u.id));
          } else if (!existingEmail) {
            await db.insert(users).values({
              name: u.name,
              email: u.email,
              role: u.role || 'server',
              position: u.position || null,
              registration: u.registration || null,
              department: u.department || null,
              admissionDate: u.admissionDate || null,
              phone: u.phone || null,
              active: u.active !== undefined ? u.active : true,
              password: defaultPassword,
            });
          }
          result.users++;
        } catch (err) {
          result.errors.push(`Usuário ${u.email || u.id}: ${(err as Error).message}`);
        }
      }
    }

    // Registros de ponto
    if (Array.isArray(data.timeEntries)) {
      for (const e of data.timeEntries) {
        try {
          const existing = await db.select().from(timeEntries).where(eq(timeEntries.id, e.id)).then((rows) => rows[0]);
          if (existing) {
            await db.update(timeEntries).set({
              userId: e.userId,
              entryDate: e.entryDate,
              checkIn: e.checkIn ? new Date(e.checkIn) : null,
              lunchOut: e.lunchOut ? new Date(e.lunchOut) : null,
              lunchIn: e.lunchIn ? new Date(e.lunchIn) : null,
              checkOut: e.checkOut ? new Date(e.checkOut) : null,
              status: e.status || 'pending',
              notes: e.notes || null,
            }).where(eq(timeEntries.id, e.id));
          } else {
            await db.insert(timeEntries).values({
              userId: e.userId,
              entryDate: e.entryDate,
              checkIn: e.checkIn ? new Date(e.checkIn) : null,
              lunchOut: e.lunchOut ? new Date(e.lunchOut) : null,
              lunchIn: e.lunchIn ? new Date(e.lunchIn) : null,
              checkOut: e.checkOut ? new Date(e.checkOut) : null,
              status: e.status || 'pending',
              notes: e.notes || null,
            });
          }
          result.timeEntries++;
        } catch (err) {
          result.errors.push(`Registro #${e.id}: ${(err as Error).message}`);
        }
      }
    }

    // Justificativas
    if (Array.isArray(data.justifications)) {
      for (const j of data.justifications) {
        try {
          const existing = await db.select().from(justifications).where(eq(justifications.id, j.id)).then((rows) => rows[0]);
          if (existing) {
            await db.update(justifications).set({
              userId: j.userId,
              justificationDate: j.justificationDate,
              reason: j.reason,
              status: j.status || 'pending',
              reviewNotes: j.reviewNotes || null,
            }).where(eq(justifications.id, j.id));
          } else {
            await db.insert(justifications).values({
              userId: j.userId,
              justificationDate: j.justificationDate,
              reason: j.reason,
              status: j.status || 'pending',
              reviewNotes: j.reviewNotes || null,
            });
          }
          result.justifications++;
        } catch (err) {
          result.errors.push(`Justificativa #${j.id}: ${(err as Error).message}`);
        }
      }
    }

    // Horários de trabalho
    if (Array.isArray(data.workSchedules)) {
      for (const s of data.workSchedules) {
        try {
          const existing = await db.select().from(workSchedules).where(eq(workSchedules.id, s.id)).then((rows) => rows[0]);
          if (existing) {
            await db.update(workSchedules).set({
              userId: s.userId,
              weekday: s.weekday,
              checkInTime: s.checkInTime || null,
              lunchOutTime: s.lunchOutTime || null,
              lunchInTime: s.lunchInTime || null,
              checkOutTime: s.checkOutTime || null,
              isWorkday: s.isWorkday !== undefined ? s.isWorkday : true,
            }).where(eq(workSchedules.id, s.id));
          } else {
            await db.insert(workSchedules).values({
              userId: s.userId,
              weekday: s.weekday,
              checkInTime: s.checkInTime || null,
              lunchOutTime: s.lunchOutTime || null,
              lunchInTime: s.lunchInTime || null,
              checkOutTime: s.checkOutTime || null,
              isWorkday: s.isWorkday !== undefined ? s.isWorkday : true,
            });
          }
          result.workSchedules++;
        } catch (err) {
          result.errors.push(`Horário #${s.id}: ${(err as Error).message}`);
        }
      }
    }

    // Configurações
    if (Array.isArray(data.settings)) {
      for (const s of data.settings) {
        try {
          const existing = await db.select().from(settings).where(eq(settings.key, s.key)).then((rows) => rows[0]);
          if (existing) {
            await db.update(settings).set({ value: s.value || null }).where(eq(settings.key, s.key));
          } else {
            await db.insert(settings).values({ key: s.key, value: s.value || null });
          }
          result.settings++;
        } catch (err) {
          result.errors.push(`Configuração ${s.key}: ${(err as Error).message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Restauração concluída!',
      restored: result,
      warning: 'Todas as senhas dos usuários foram redefinidas para "123456". Oriente os servidores a alterá-las no próximo acesso.',
    });
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
