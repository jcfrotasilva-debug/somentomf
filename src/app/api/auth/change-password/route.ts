import { NextResponse } from 'next/server';
import { getSession, createToken, getTokenCookieOptions } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { comparePasswords, hashPassword } from '@/lib/password';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    // Validações básicas
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Senha atual e nova senha são obrigatórias' },
        { status: 400 }
      );
    }

    // Validação de requisitos da nova senha
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    if (newPassword.length > 100) {
      return NextResponse.json(
        { error: 'A nova senha deve ter no máximo 100 caracteres' },
        { status: 400 }
      );
    }

    // Busca o usuário
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .then((rows) => rows[0]);

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verifica se a senha atual está correta
    const validCurrentPassword = await comparePasswords(currentPassword, user.password);
    if (!validCurrentPassword) {
      return NextResponse.json(
        { error: 'Senha atual incorreta' },
        { status: 401 }
      );
    }

    // Verifica se a nova senha é diferente da atual
    const samePassword = await comparePasswords(newPassword, user.password);
    if (samePassword) {
      return NextResponse.json(
        { error: 'A nova senha deve ser diferente da senha atual' },
        { status: 400 }
      );
    }

    // Verifica se a nova senha é diferente do email (segurança)
    if (newPassword.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'A nova senha não pode ser igual ao seu email' },
        { status: 400 }
      );
    }

    // Hashea a nova senha
    const hashedNewPassword = await hashPassword(newPassword);

    // Atualiza a senha
    await db
      .update(users)
      .set({ password: hashedNewPassword })
      .where(eq(users.id, session.userId));

    // Gera novo token para manter a sessão ativa
    const newToken = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'server' | 'hr',
    });

    const response = NextResponse.json({
      success: true,
      message: 'Senha alterada com sucesso!',
    });

    // Atualiza o cookie com o novo token
    response.cookies.set(getTokenCookieOptions(newToken));

    return response;
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
