import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { timeEntryAdjustments, timeEntries } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Context = { params: Promise<{ id: string }> };

// PATCH: RH aprova ou rejeita uma retificação pendente
export async function PATCH(_req: Request, { params }: Context) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão. Apenas RH pode analisar retificações.' }, { status: 403 });
    }

    const { id } = await params;
    const adjustmentId = parseInt(id, 10);

    const body = await _req.json();
    const { status, reviewNotes } = body;

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido. Deve ser: approved ou rejected' },
        { status: 400 }
      );
    }

    // Buscar a retificação
    const adjustment = await db
      .select()
      .from(timeEntryAdjustments)
      .where(eq(timeEntryAdjustments.id, adjustmentId))
      .then((rows) => rows[0]);

    if (!adjustment) {
      return NextResponse.json({ error: 'Retificação não encontrada' }, { status: 404 });
    }

    if (adjustment.status !== 'pending') {
      return NextResponse.json(
        { error: `Esta retificação já foi ${adjustment.status === 'approved' ? 'aprovada' : 'rejeitada'}` },
        { status: 400 }
      );
    }

    if (adjustment.adjustmentType !== 'server_request') {
      return NextResponse.json(
        { error: 'Esta retificação não é uma solicitação de servidor' },
        { status: 400 }
      );
    }

    // Se aprovado, aplicar a alteração no registro
    if (status === 'approved') {
      const updateData: Record<string, unknown> = {};
      if (adjustment.newValue) {
        updateData[adjustment.fieldAltered] = adjustment.newValue;
      } else {
        updateData[adjustment.fieldAltered] = null;
      }
      updateData.updatedAt = new Date();

      await db
        .update(timeEntries)
        .set(updateData)
        .where(eq(timeEntries.id, adjustment.timeEntryId!));
    }

    // Atualizar a retificação
    const [updated] = await db
      .update(timeEntryAdjustments)
      .set({
        status,
        approvedById: session.userId,
        adjustmentDate: new Date(),
        // Salvar reviewNotes no reason se houver (como complemento)
        reason: reviewNotes
          ? `${adjustment.reason} | OBS RH: ${reviewNotes}`
          : adjustment.reason,
      })
      .where(eq(timeEntryAdjustments.id, adjustmentId))
      .returning();

    return NextResponse.json({
      adjustment: updated,
      message: status === 'approved'
        ? 'Retificação aprovada e aplicada com sucesso!'
        : 'Retificação rejeitada.',
    });
  } catch (error) {
    console.error('Erro ao analisar retificação:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE: remove uma retificação (apenas RH)
export async function DELETE(_req: Request, { params }: Context) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'hr') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id } = await params;
    const adjustmentId = parseInt(id, 10);

    await db.delete(timeEntryAdjustments).where(eq(timeEntryAdjustments.id, adjustmentId));

    return NextResponse.json({ message: 'Retificação removida!' });
  } catch (error) {
    console.error('Erro ao remover retificação:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
