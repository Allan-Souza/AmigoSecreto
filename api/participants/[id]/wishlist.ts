import { metric } from '@vercel/functions';
import { AppError, updateParticipantWishlist } from '../_lib/db';

export async function PUT(request: Request): Promise<Response> {
  const startedAt = performance.now();
  try {
    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get('id');
    const pathParts = url.pathname.split('/').filter(Boolean);
    const idFromPath = pathParts.length >= 3 ? pathParts[2] : '';
    const participantId = idFromQuery || idFromPath;

    const body = (await request.json()) as {
      wishlist?: string[];
      pin?: string | null;
    };

    const updated = await updateParticipantWishlist(participantId, {
      wishlist: body.wishlist || [],
      pin: body.pin,
    });

    metric('amigosecreto.wishlist.updated', 1, { outcome: 'success' });
    return Response.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      metric('amigosecreto.wishlist.updated', 1, { outcome: 'validation_error' });
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error updating wishlist:', error);
    metric('amigosecreto.wishlist.updated', 1, { outcome: 'error' });
    return Response.json(
      { error: 'Não foi possível salvar sua lista de desejos.' },
      { status: 500 }
    );
  } finally {
    metric('amigosecreto.wishlist.update_duration_ms', performance.now() - startedAt);
  }
}
