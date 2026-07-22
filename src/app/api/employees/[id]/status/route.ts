import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Context = { params: Promise<{ id: string }> };

// PATCH para ativar/desativar
export async function PATCH(_req: Request, { params }: Context) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    const data = await _req.json();

    if (typeof data.active !== 'boolean') {
      return NextResponse.json({ error: 'Campo active inválido' }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set({ active: data.active })
      .where(eq(users.id, userId))
      .returning({ id: users.id, active: users.active });

    if (!updated) {
      return NextResponse.json({ error: 'Servidor não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      user: updated,
      message: data.active ? 'Servidor ativado!' : 'Servidor desativado!',
    });
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
