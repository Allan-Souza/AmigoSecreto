import { metric } from '@vercel/functions';
import { AppError, getGroupByCode } from '../_lib/db';

export async function GET(request: Request): Promise<Response> {
  const startedAt = performance.now();
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code') || '';
    const adminToken = url.searchParams.get('admin');

    const group = await getGroupByCode(code, adminToken);
    metric('amigosecreto.group.fetched', 1, { outcome: 'success' });
    return Response.json(group, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      metric('amigosecreto.group.fetched', 1, { outcome: 'not_found' });
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error fetching group:', error);
    metric('amigosecreto.group.fetched', 1, { outcome: 'error' });
    return Response.json(
      { error: 'Erro ao carregar os dados do grupo.' },
      { status: 500 }
    );
  } finally {
    metric('amigosecreto.group.fetch_duration_ms', performance.now() - startedAt);
  }
}
