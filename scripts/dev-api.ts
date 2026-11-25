import http from 'node:http';
import { POST as createGroupPost } from '../api/groups/index';
import { GET as getGroupGet } from '../api/groups/[code]/index';
import { POST as joinGroupPost } from '../api/groups/[code]/join';
import { POST as drawGroupPost } from '../api/groups/[code]/draw';
import { PUT as updateWishlistPut } from '../api/participants/[id]/wishlist';
import { POST as revealTargetPost } from '../api/participants/[id]/reveal';
import { isPostgresConfigured } from '../api/_lib/db';

const PORT = Number(process.env['API_PORT'] || 3001);

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${PORT}`;
    const fullUrl = new URL(req.url || '/', `http://${host}`);
    const pathname = fullUrl.pathname;
    const method = (req.method || 'GET').toUpperCase();

    const bodyText =
      method === 'POST' || method === 'PUT' || method === 'PATCH'
        ? await readBody(req)
        : undefined;

    let webResponse: Response | null = null;

    if (pathname === '/api/groups' && method === 'POST') {
      webResponse = await createGroupPost(
        new Request(fullUrl.toString(), { method, body: bodyText })
      );
    } else if (/^\/api\/groups\/([^/]+)$/.test(pathname) && method === 'GET') {
      const code = pathname.split('/')[3];
      fullUrl.searchParams.set('code', code);
      webResponse = await getGroupGet(new Request(fullUrl.toString(), { method }));
    } else if (/^\/api\/groups\/([^/]+)\/join$/.test(pathname) && method === 'POST') {
      const code = pathname.split('/')[3];
      fullUrl.searchParams.set('code', code);
      webResponse = await joinGroupPost(
        new Request(fullUrl.toString(), { method, body: bodyText })
      );
    } else if (/^\/api\/groups\/([^/]+)\/draw$/.test(pathname) && method === 'POST') {
      const code = pathname.split('/')[3];
      fullUrl.searchParams.set('code', code);
      webResponse = await drawGroupPost(
        new Request(fullUrl.toString(), { method, body: bodyText })
      );
    } else if (/^\/api\/participants\/([^/]+)\/wishlist$/.test(pathname) && method === 'PUT') {
      const id = pathname.split('/')[3];
      fullUrl.searchParams.set('id', id);
      webResponse = await updateWishlistPut(
        new Request(fullUrl.toString(), { method, body: bodyText })
      );
    } else if (/^\/api\/participants\/([^/]+)\/reveal$/.test(pathname) && method === 'POST') {
      const id = pathname.split('/')[3];
      fullUrl.searchParams.set('id', id);
      webResponse = await revealTargetPost(
        new Request(fullUrl.toString(), { method, body: bodyText })
      );
    }

    if (!webResponse) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Rota da API não encontrada.' }));
      return;
    }

    const responseText = await webResponse.text();
    res.writeHead(webResponse.status, {
      'Content-Type': webResponse.headers.get('Content-Type') || 'application/json',
    });
    res.end(responseText);
  } catch (err) {
    console.error('Erro no servidor local de API:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro interno na API local.' }));
  }
});

server.listen(PORT, () => {
  console.log(`API do Amigo Secreto Simples rodando em http://localhost:${PORT}`);
  console.log(
    `Persistência atual: ${
      isPostgresConfigured()
        ? 'PostgreSQL conectado via DATABASE_URL'
        : 'Memória local (defina DATABASE_URL para usar PostgreSQL)'
    }`
  );
});
