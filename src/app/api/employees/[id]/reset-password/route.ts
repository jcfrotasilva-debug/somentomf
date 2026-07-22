import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/password';

type Context = { params: Promise<{ id: string }> };

// POST: RH reseta a senha de um servidor
export async function POST(_req: Request, { params }: Context) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    const body = await _req.json();
    const { newPassword } = body;

    // Se não for fornecida, gera uma senha padrão
    const passwordToSet = newPassword && newPassword.length >= 6 ? newPassword : '123456';

    // Verifica se o usuário existe
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .then((rows) => rows[0]);

    if (!user) {
      return NextResponse.json({ error: 'Servidor não encontrado' }, { status: 404 });
    }

    // Não pode resetar a própria senha por aqui (por segurança)
    if (userId === session.userId) {
      return NextResponse.json(
        { error: 'Use a função "Alterar Senha" do seu perfil para alterar sua própria senha.' },
        { status: 400 }
      );
    }

    // Hashea e atualiza a senha
    const hashedPassword = await hashPassword(passwordToSet);
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      message: `Senha do servidor ${user.name} redefinida com sucesso!`,
      newPassword: passwordToSet, // Envia de volta para o RH saber qual foi definida
      warning: newPassword
        ? null
        : 'Senha padrão "123456" foi definida. Oriente o servidor a alterá-la no próximo acesso.',
    });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
