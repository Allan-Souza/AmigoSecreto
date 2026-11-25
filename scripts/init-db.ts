import { ensureSchema, isPostgresConfigured } from '../api/_lib/db';

async function main() {
  if (!isPostgresConfigured()) {
    console.error(
      'Erro: DATABASE_URL não está configurada. Defina a variável DATABASE_URL no seu arquivo .env ou ambiente.'
    );
    process.exit(1);
  }

  console.log('Inicializando tabelas no PostgreSQL...');
  await ensureSchema();
  console.log('Tabelas (groups, participants, wishlist_items) criadas/verificadas com sucesso!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Falha ao inicializar banco de dados:', err);
  process.exit(1);
});
