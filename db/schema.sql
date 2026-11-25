-- Schema do banco de dados PostgreSQL para o Amigo Secreto Simples
-- Compatível com Neon Postgres, Supabase e qualquer PostgreSQL 14+

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
