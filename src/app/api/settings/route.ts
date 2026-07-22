import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const allSettings = await db.select().from(settings);
    const settingsMap: Record<string, string | null> = {};
    allSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const data = await request.json();
    const { key, value } = data;

    if (!key) {
      return NextResponse.json({ error: 'Chave é obrigatória' }, { status: 400 });
    }

    // Verifica se já existe
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .then((rows) => rows[0]);

    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ value: value ?? null, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return NextResponse.json({ setting: updated, message: 'Configuração atualizada!' });
    } else {
      const [created] = await db
        .insert(settings)
        .values({ key, value: value ?? null })
        .returning();
      return NextResponse.json({ setting: created, message: 'Configuração criada!' });
    }
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
