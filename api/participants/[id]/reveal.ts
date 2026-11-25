import { metric } from '@vercel/functions';
import { AppError, revealParticipantTarget } from '../_lib/db';

export async function POST(request: Request): Promise<Response> {
  const startedAt = performance.now();
  try {
    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get('id');
    const pathParts = url.pathname.split('/').filter(Boolean);
    const idFromPath = pathParts.length >= 3 ? pathParts[2] : '';
    const participantId = idFromQuery || idFromPath;

    const body = (await request.json().catch(() => ({}))) as {
      pin?: string | null;
    };

    const result = await revealParticipantTarget(participantId, body.pin);
    metric('amigosecreto.participant.revealed', 1, { outcome: 'success' });
    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      metric('amigosecreto.participant.revealed', 1, { outcome: 'unauthorized_or_invalid' });
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error revealing secret friend:', error);
    metric('amigosecreto.participant.revealed', 1, { outcome: 'error' });
    return Response.json(
      { error: 'Não foi possível consultar seu amigo secreto agora.' },
      { status: 500 }
    );
  } finally {
    metric('amigosecreto.participant.reveal_duration_ms', performance.now() - startedAt);
  }
}
