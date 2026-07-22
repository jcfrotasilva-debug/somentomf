import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/password';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const allUsers = await db
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
      .orderBy(desc(users.name));

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Criar novo servidor (RH only)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const data = await request.json();
    const { name, email, password, role, position, registration, department, admissionDate, phone } = data;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Verifica email duplicado
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .then((rows) => rows[0]);

    if (existing) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role || 'server',
        position: position || null,
        registration: registration || null,
        department: department || null,
        admissionDate: admissionDate || null,
        phone: phone || null,
        active: true,
      })
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

    return NextResponse.json({ user: newUser, message: 'Servidor cadastrado com sucesso!' }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
