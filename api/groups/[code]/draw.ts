import { metric } from '@vercel/functions';
import { AppError, performGroupDraw } from '../_lib/db';

export async function POST(request: Request): Promise<Response> {
  const startedAt = performance.now();
  try {
    const url = new URL(request.url);
    const codeFromQuery = url.searchParams.get('code');
    const pathParts = url.pathname.split('/').filter(Boolean);
    const codeFromPath = pathParts.length >= 3 ? pathParts[2] : '';
    const code = codeFromQuery || codeFromPath;

    const body = (await request.json()) as {
      admin_token?: string;
      force_redraw?: boolean;
    };

    const updatedGroup = await performGroupDraw(code, {
      admin_token: body.admin_token || '',
      force_redraw: Boolean(body.force_redraw),
    });

    metric('amigosecreto.group.drawn', 1, { outcome: 'success' });
    return Response.json(updatedGroup, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      metric('amigosecreto.group.drawn', 1, { outcome: 'validation_error' });
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error performing draw:', error);
    metric('amigosecreto.group.drawn', 1, { outcome: 'error' });
    return Response.json(
      { error: 'Erro ao realizar o sorteio. Tente novamente.' },
      { status: 500 }
    );
  } finally {
    metric('amigosecreto.group.draw_duration_ms', performance.now() - startedAt);
  }
}
