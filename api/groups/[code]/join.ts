import { metric } from '@vercel/functions';
import { AppError, joinGroup } from '../_lib/db';

export async function POST(request: Request): Promise<Response> {
  const startedAt = performance.now();
  try {
    const url = new URL(request.url);
    const codeFromQuery = url.searchParams.get('code');
    const pathParts = url.pathname.split('/').filter(Boolean);
    const codeFromPath = pathParts.length >= 3 ? pathParts[2] : '';
    const code = codeFromQuery || codeFromPath;

    const body = (await request.json()) as {
      name?: string;
      pin?: string | null;
      wishlist?: string[];
    };

    const participant = await joinGroup(code, {
      name: body.name || '',
      pin: body.pin,
      wishlist: body.wishlist || [],
    });

    metric('amigosecreto.participant.joined', 1, { outcome: 'success' });
    return Response.json(participant, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      metric('amigosecreto.participant.joined', 1, { outcome: 'validation_error' });
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error joining group:', error);
    metric('amigosecreto.participant.joined', 1, { outcome: 'error' });
    return Response.json(
      { error: 'Não foi possível entrar no grupo agora. Tente novamente.' },
      { status: 500 }
    );
  } finally {
    metric('amigosecreto.participant.join_duration_ms', performance.now() - startedAt);
  }
}
