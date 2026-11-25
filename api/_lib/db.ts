import crypto from 'node:crypto';
import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import {
  generateAdminToken,
  generateClosedCycleDraw,
  generateInviteCode,
  hashPin,
  isValidPin,
} from './draw';

export interface GroupEntity {
  id: string;
  title: string;
  suggested_price: string;
  invite_code: string;
  admin_token: string;
  is_drawn: boolean;
  created_at: string;
}

export interface WishlistItemEntity {
  id: string;
  participant_id: string;
  description: string;
}

export interface ParticipantEntity {
  id: string;
  group_id: string;
  name: string;
  pin_hash: string | null;
  target_participant_id: string | null;
  created_at: string;
}

export interface PublicParticipantView {
  id: string;
  name: string;
  has_pin: boolean;
  wishlist: WishlistItemEntity[];
}

export interface PublicGroupView {
  id: string;
  title: string;
  suggested_price: string;
  invite_code: string;
  is_drawn: boolean;
  created_at: string;
  is_admin: boolean;
  admin_token?: string;
  participants: PublicParticipantView[];
}

export interface RevealResultView {
  participant_id: string;
  participant_name: string;
  target_name: string;
  suggested_price: string;
  group_title: string;
  target_wishlist: WishlistItemEntity[];
}

// Lazy PostgreSQL pool initialization (safe for build-time evaluation on Vercel)
let _pool: Pool | null = null;
let _schemaInitialized = false;

function getConnectionString(): string | undefined {
  return (
    process.env['DATABASE_URL_POOLED'] ||
    process.env['DATABASE_URL'] ||
    process.env['POSTGRES_URL']
  );
}

export function isPostgresConfigured(): boolean {
  const conn = getConnectionString();
  return Boolean(conn && conn.trim().length > 0);
}

function getPool(): Pool {
  if (!_pool) {
    const connectionString = getConnectionString();
    if (!connectionString) {
      throw new Error('DATABASE_URL não configurada.');
    }
    _pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
      max: 10,
    });
    try {
      attachDatabasePool(_pool);
    } catch {
      // Safe fallback outside Vercel runtime
    }
  }
  return _pool;
}

export async function ensureSchema(): Promise<void> {
  if (_schemaInitialized || !isPostgresConfigured()) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS groups (
      id UUID PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      suggested_price VARCHAR(120) NOT NULL,
      invite_code VARCHAR(32) UNIQUE NOT NULL,
      admin_token VARCHAR(64) UNIQUE NOT NULL,
      is_drawn BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);
    CREATE INDEX IF NOT EXISTS idx_groups_admin_token ON groups(admin_token);

    CREATE TABLE IF NOT EXISTS participants (
      id UUID PRIMARY KEY,
      group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      name VARCHAR(120) NOT NULL,
      pin_hash VARCHAR(128) NULL,
      target_participant_id UUID NULL REFERENCES participants(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_participants_group_id ON participants(group_id);

    CREATE TABLE IF NOT EXISTS wishlist_items (
      id UUID PRIMARY KEY,
      participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      description VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_wishlist_items_participant_id ON wishlist_items(participant_id);
  `);
  _schemaInitialized = true;
}

// Fallback in-memory store for local zero-config testing when DATABASE_URL is not set
const memoryStore = {
  groups: new Map<string, GroupEntity>(),
  participants: new Map<string, ParticipantEntity>(),
  wishlistItems: new Map<string, WishlistItemEntity>(),
};

export async function createGroup(input: {
  title: string;
  suggested_price: string;
}): Promise<PublicGroupView> {
  const title = (input.title || '').trim();
  const suggestedPrice = (input.suggested_price || '').trim();

  if (title.length < 3) {
    throw new AppError('Informe um nome para o grupo com pelo menos 3 letras.', 400);
  }
  if (suggestedPrice.length < 2) {
    throw new AppError('Informe o valor sugerido do presente (ex.: Até R$ 50,00).', 400);
  }

  const id = crypto.randomUUID();
  const inviteCode = generateInviteCode(6);
  const adminToken = generateAdminToken();
  const createdAt = new Date().toISOString();

  if (isPostgresConfigured()) {
    await ensureSchema();
    const pool = getPool();
    await pool.query(
      `INSERT INTO groups (id, title, suggested_price, invite_code, admin_token, is_drawn, created_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, $6)`,
      [id, title, suggestedPrice, inviteCode, adminToken, createdAt]
    );
  } else {
    memoryStore.groups.set(id, {
      id,
      title,
      suggested_price: suggestedPrice,
      invite_code: inviteCode,
      admin_token: adminToken,
      is_drawn: false,
      created_at: createdAt,
    });
  }

  return {
    id,
    title,
    suggested_price: suggestedPrice,
    invite_code: inviteCode,
    is_drawn: false,
    created_at: createdAt,
    is_admin: true,
    admin_token: adminToken,
    participants: [],
  };
}

export async function getGroupByCode(
  codeOrToken: string,
  adminTokenQuery?: string | null
): Promise<PublicGroupView> {
  const cleanCode = (codeOrToken || '').trim();
  if (!cleanCode) {
    throw new AppError('Código do grupo não informado.', 400);
  }

  if (isPostgresConfigured()) {
    await ensureSchema();
    const pool = getPool();
    const groupRes = await pool.query<GroupEntity>(
      `SELECT id, title, suggested_price, invite_code, admin_token, is_drawn, created_at
       FROM groups
       WHERE UPPER(invite_code) = UPPER($1) OR admin_token = $1
       LIMIT 1`,
      [cleanCode]
    );

    if (groupRes.rowCount === 0) {
      throw new AppError('Grupo não encontrado. Verifique se o link está correto.', 404);
    }

    const group = groupRes.rows[0];
    const isAdmin =
      group.admin_token === cleanCode ||
      Boolean(adminTokenQuery && group.admin_token === adminTokenQuery.trim());

    const partRes = await pool.query<ParticipantEntity>(
      `SELECT id, group_id, name, pin_hash, target_participant_id, created_at
       FROM participants
       WHERE group_id = $1
       ORDER BY created_at ASC`,
      [group.id]
    );

    const participantIds = partRes.rows.map((p) => p.id);
    const wishlistByParticipant = new Map<string, WishlistItemEntity[]>();

    if (participantIds.length > 0) {
      const wishRes = await pool.query<WishlistItemEntity>(
        `SELECT id, participant_id, description
         FROM wishlist_items
         WHERE participant_id = ANY($1::uuid[])
         ORDER BY created_at ASC`,
        [participantIds]
      );
      for (const item of wishRes.rows) {
        const list = wishlistByParticipant.get(item.participant_id) || [];
        list.push(item);
        wishlistByParticipant.set(item.participant_id, list);
      }
    }

    const participants: PublicParticipantView[] = partRes.rows.map((p) => ({
      id: p.id,
      name: p.name,
      has_pin: Boolean(p.pin_hash),
      wishlist: wishlistByParticipant.get(p.id) || [],
    }));

    return {
      id: group.id,
      title: group.title,
      suggested_price: group.suggested_price,
      invite_code: group.invite_code,
      is_drawn: group.is_drawn,
      created_at: group.created_at,
      is_admin: isAdmin,
      ...(isAdmin ? { admin_token: group.admin_token } : {}),
      participants,
    };
  }

  // In-memory fallback
  const group = Array.from(memoryStore.groups.values()).find(
    (g) =>
      g.invite_code.toUpperCase() === cleanCode.toUpperCase() ||
      g.admin_token === cleanCode
  );

  if (!group) {
    throw new AppError('Grupo não encontrado. Verifique se o link está correto.', 404);
  }

  const isAdmin =
    group.admin_token === cleanCode ||
    Boolean(adminTokenQuery && group.admin_token === adminTokenQuery.trim());

  const participantsList = Array.from(memoryStore.participants.values())
    .filter((p) => p.group_id === group.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const participants: PublicParticipantView[] = participantsList.map((p) => ({
    id: p.id,
    name: p.name,
    has_pin: Boolean(p.pin_hash),
    wishlist: Array.from(memoryStore.wishlistItems.values()).filter(
      (w) => w.participant_id === p.id
    ),
  }));

  return {
    id: group.id,
    title: group.title,
    suggested_price: group.suggested_price,
    invite_code: group.invite_code,
    is_drawn: group.is_drawn,
    created_at: group.created_at,
    is_admin: isAdmin,
    ...(isAdmin ? { admin_token: group.admin_token } : {}),
    participants,
  };
}

export async function joinGroup(
  inviteCode: string,
  input: {
    name: string;
    pin?: string | null;
    wishlist?: string[];
  }
): Promise<PublicParticipantView> {
  const name = (input.name || '').trim();
  if (name.length < 2) {
    throw new AppError('Por favor, digite seu nome (pelo menos 2 letras).', 400);
  }

  if (!isValidPin(input.pin)) {
    throw new AppError('O PIN de segurança deve ter exatamente 4 números (ex.: 1234).', 400);
  }

  const cleanWishlist = (input.wishlist || [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const groupView = await getGroupByCode(inviteCode);
  if (groupView.is_drawn) {
    throw new AppError(
      'O sorteio deste grupo já foi realizado! Não é possível adicionar novos participantes.',
      400
    );
  }

  const duplicate = groupView.participants.find(
    (p) => p.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR')
  );
  if (duplicate) {
    throw new AppError(
      `Já existe alguém chamado "${duplicate.name}" neste grupo. Se for você, selecione seu nome na lista abaixo. Se for outra pessoa, coloque também o sobrenome.`,
      409
    );
  }

  const participantId = crypto.randomUUID();
  const pinHash = input.pin && input.pin.trim() ? hashPin(input.pin.trim(), participantId) : null;
  const createdAt = new Date().toISOString();

  const createdWishlist: WishlistItemEntity[] = cleanWishlist.map((desc) => ({
    id: crypto.randomUUID(),
    participant_id: participantId,
    description: desc,
  }));

  if (isPostgresConfigured()) {
    await ensureSchema();
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO participants (id, group_id, name, pin_hash, target_participant_id, created_at)
         VALUES ($1, $2, $3, $4, NULL, $5)`,
        [participantId, groupView.id, name, pinHash, createdAt]
      );

      for (const item of createdWishlist) {
        await client.query(
          `INSERT INTO wishlist_items (id, participant_id, description)
           VALUES ($1, $2, $3)`,
          [item.id, item.participant_id, item.description]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    memoryStore.participants.set(participantId, {
      id: participantId,
      group_id: groupView.id,
      name,
      pin_hash: pinHash,
      target_participant_id: null,
      created_at: createdAt,
    });
    for (const item of createdWishlist) {
      memoryStore.wishlistItems.set(item.id, item);
    }
  }

  return {
    id: participantId,
    name,
    has_pin: Boolean(pinHash),
    wishlist: createdWishlist,
  };
}

export async function updateParticipantWishlist(
  participantId: string,
  input: {
    wishlist: string[];
    pin?: string | null;
  }
): Promise<PublicParticipantView> {
  if (!participantId) {
    throw new AppError('Participante não identificado.', 400);
  }

  const cleanWishlist = (input.wishlist || [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (isPostgresConfigured()) {
    await ensureSchema();
    const pool = getPool();
    const partRes = await pool.query<ParticipantEntity>(
      `SELECT id, group_id, name, pin_hash, target_participant_id, created_at
       FROM participants
       WHERE id = $1`,
      [participantId]
    );

    if (partRes.rowCount === 0) {
      throw new AppError('Participante não encontrado.', 404);
    }

    const participant = partRes.rows[0];
    if (participant.pin_hash) {
      const providedPin = (input.pin || '').trim();
      if (!providedPin || hashPin(providedPin, participant.id) !== participant.pin_hash) {
        throw new AppError('Digite seu PIN de 4 números corretamente para salvar alterações na lista.', 401);
      }
    }

    const newItems: WishlistItemEntity[] = cleanWishlist.map((desc) => ({
      id: crypto.randomUUID(),
      participant_id: participant.id,
      description: desc,
    }));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM wishlist_items WHERE participant_id = $1`, [participant.id]);
      for (const item of newItems) {
        await client.query(
          `INSERT INTO wishlist_items (id, participant_id, description)
           VALUES ($1, $2, $3)`,
          [item.id, item.participant_id, item.description]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return {
      id: participant.id,
      name: participant.name,
      has_pin: Boolean(participant.pin_hash),
      wishlist: newItems,
    };
  }

  // In-memory
  const participant = memoryStore.participants.get(participantId);
  if (!participant) {
    throw new AppError('Participante não encontrado.', 404);
  }

  if (participant.pin_hash) {
    const providedPin = (input.pin || '').trim();
    if (!providedPin || hashPin(providedPin, participant.id) !== participant.pin_hash) {
      throw new AppError('Digite seu PIN de 4 números corretamente para salvar alterações na lista.', 401);
    }
  }

  for (const [key, item] of memoryStore.wishlistItems.entries()) {
    if (item.participant_id === participant.id) {
      memoryStore.wishlistItems.delete(key);
    }
  }

  const newItems: WishlistItemEntity[] = cleanWishlist.map((desc) => {
    const item: WishlistItemEntity = {
      id: crypto.randomUUID(),
      participant_id: participant.id,
      description: desc,
    };
    memoryStore.wishlistItems.set(item.id, item);
    return item;
  });

  return {
    id: participant.id,
    name: participant.name,
    has_pin: Boolean(participant.pin_hash),
    wishlist: newItems,
  };
}

export async function performGroupDraw(
  inviteCode: string,
  input: {
    admin_token: string;
    force_redraw?: boolean;
  }
): Promise<PublicGroupView> {
  const adminToken = (input.admin_token || '').trim();
  if (!adminToken) {
    throw new AppError('Acesso de organizador obrigatório para realizar o sorteio.', 403);
  }

  const groupView = await getGroupByCode(inviteCode, adminToken);
  if (!groupView.is_admin) {
    throw new AppError('Link de organizador inválido para este grupo.', 403);
  }

  if (groupView.is_drawn && !input.force_redraw) {
    throw new AppError(
      'O sorteio já foi realizado! Para sortear novamente, marque a confirmação de refazer sorteio.',
      400
    );
  }

  if (groupView.participants.length < 3) {
    throw new AppError(
      'É necessário ter pelo menos 3 participantes cadastrados para realizar o sorteio.',
      400
    );
  }

  const participantIds = groupView.participants.map((p) => p.id);
  const assignments = generateClosedCycleDraw(participantIds);

  if (isPostgresConfigured()) {
    await ensureSchema();
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [giverId, receiverId] of assignments.entries()) {
        await client.query(
          `UPDATE participants SET target_participant_id = $1 WHERE id = $2 AND group_id = $3`,
          [receiverId, giverId, groupView.id]
        );
      }
      await client.query(`UPDATE groups SET is_drawn = TRUE WHERE id = $1`, [groupView.id]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    const groupEntity = memoryStore.groups.get(groupView.id);
    if (groupEntity) {
      groupEntity.is_drawn = true;
    }
    for (const [giverId, receiverId] of assignments.entries()) {
      const p = memoryStore.participants.get(giverId);
      if (p) {
        p.target_participant_id = receiverId;
      }
    }
  }

  return getGroupByCode(inviteCode, adminToken);
}

export async function revealParticipantTarget(
  participantId: string,
  pin?: string | null
): Promise<RevealResultView> {
  if (!participantId) {
    throw new AppError('Participante não informado.', 400);
  }

  if (isPostgresConfigured()) {
    await ensureSchema();
    const pool = getPool();
    const partRes = await pool.query<ParticipantEntity>(
      `SELECT id, group_id, name, pin_hash, target_participant_id, created_at
       FROM participants
       WHERE id = $1`,
      [participantId]
    );

    if (partRes.rowCount === 0) {
      throw new AppError('Participante não encontrado.', 404);
    }

    const participant = partRes.rows[0];
    if (participant.pin_hash) {
      const cleanPin = (pin || '').trim();
      if (!cleanPin) {
        throw new AppError('Digite seu PIN de 4 números para ver quem você tirou.', 401);
      }
      if (hashPin(cleanPin, participant.id) !== participant.pin_hash) {
        throw new AppError('PIN incorreto. Tente novamente.', 401);
      }
    }

    const groupRes = await pool.query<GroupEntity>(
      `SELECT id, title, suggested_price, is_drawn FROM groups WHERE id = $1`,
      [participant.group_id]
    );
    const group = groupRes.rows[0];

    if (!group || !group.is_drawn || !participant.target_participant_id) {
      throw new AppError('O sorteio ainda não foi realizado pelo organizador.', 400);
    }

    const targetRes = await pool.query<ParticipantEntity>(
      `SELECT id, name FROM participants WHERE id = $1`,
      [participant.target_participant_id]
    );

    if (targetRes.rowCount === 0) {
      throw new AppError('Pessoa sorteada não encontrada.', 404);
    }

    const target = targetRes.rows[0];
    const wishRes = await pool.query<WishlistItemEntity>(
      `SELECT id, participant_id, description
       FROM wishlist_items
       WHERE participant_id = $1
       ORDER BY created_at ASC`,
      [target.id]
    );

    return {
      participant_id: participant.id,
      participant_name: participant.name,
      target_name: target.name,
      suggested_price: group.suggested_price,
      group_title: group.title,
      target_wishlist: wishRes.rows,
    };
  }

  // In-memory fallback
  const participant = memoryStore.participants.get(participantId);
  if (!participant) {
    throw new AppError('Participante não encontrado.', 404);
  }

  if (participant.pin_hash) {
    const cleanPin = (pin || '').trim();
    if (!cleanPin) {
      throw new AppError('Digite seu PIN de 4 números para ver quem você tirou.', 401);
    }
    if (hashPin(cleanPin, participant.id) !== participant.pin_hash) {
      throw new AppError('PIN incorreto. Tente novamente.', 401);
    }
  }

  const group = memoryStore.groups.get(participant.group_id);
  if (!group || !group.is_drawn || !participant.target_participant_id) {
    throw new AppError('O sorteio ainda não foi realizado pelo organizador.', 400);
  }

  const target = memoryStore.participants.get(participant.target_participant_id);
  if (!target) {
    throw new AppError('Pessoa sorteada não encontrada.', 404);
  }

  const targetWishlist = Array.from(memoryStore.wishlistItems.values()).filter(
    (w) => w.participant_id === target.id
  );

  return {
    participant_id: participant.id,
    participant_name: participant.name,
    target_name: target.name,
    suggested_price: group.suggested_price,
    group_title: group.title,
    target_wishlist: targetWishlist,
  };
}

export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}
