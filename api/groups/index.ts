import { metric } from '@vercel/functions';
import { AppError, createGroup } from '../_lib/db';

export async function POST(request: Request): Promise<Response> {
  const startedAt = performance.now();
  try {
    const body = (await request.json()) as {
      title?: string;
      suggested_price?: string;
    };

    const group = await createGroup({
      title: body.title || '',
      suggested_price: body.suggested_price || '',
    });

    metric('amigosecreto.group.created', 1, { outcome: 'success' });
    return Response.json(group, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      metric('amigosecreto.group.created', 1, { outcome: 'validation_error' });
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error creating group:', error);
    metric('amigosecreto.group.created', 1, { outcome: 'error' });
    return Response.json(
      { error: 'Não foi possível criar o grupo agora. Tente novamente.' },
      { status: 500 }
    );
  } finally {
    metric('amigosecreto.group.create_duration_ms', performance.now() - startedAt);
  }
}
