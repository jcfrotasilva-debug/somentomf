import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/password';

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);

    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        position: users.position,
        registration: users.registration,
        department: users.department,
        admissionDate: users.admissionDate,
        phone: users.phone,
        active: users.active,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .then((rows) => rows[0]);

    if (!user) {
      return NextResponse.json({ error: 'Servidor não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(_req: Request, { params }: Context) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    const data = await _req.json();

    const { name, email, position, registration, department, admissionDate, phone, password, role } = data;

    // Se mudar email, verificar duplicado
    if (email) {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .then((rows) => rows[0]);

      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: 'Email já está em uso' }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {
      ...(name !== undefined && { name: name.trim() }),
      ...(email !== undefined && { email: email.toLowerCase().trim() }),
      ...(position !== undefined && { position: position || null }),
      ...(registration !== undefined && { registration: registration || null }),
      ...(department !== undefined && { department: department || null }),
      ...(admissionDate !== undefined && { admissionDate: admissionDate || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(role !== undefined && { role }),
    };

    if (password) {
      updateData.password = await hashPassword(password);
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        position: users.position,
        registration: users.registration,
        department: users.department,
        admissionDate: users.admissionDate,
        phone: users.phone,
        active: users.active,
      });

    if (!updated) {
      return NextResponse.json({ error: 'Servidor não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ user: updated, message: 'Servidor atualizado!' });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Context) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);

    // Soft delete (desativar)
    const [updated] = await db
      .update(users)
      .set({ active: false })
      .where(eq(users.id, userId))
      .returning({ id: users.id, active: users.active });

    if (!updated) {
      return NextResponse.json({ error: 'Servidor não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Servidor desativado com sucesso!' });
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
