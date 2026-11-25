# 🎁 Amigo Secreto Simples

Aplicação web **mobile-first** de Amigo Secreto, projetada especialmente para ser usada no celular por qualquer pessoa da família — **inclusive pessoas idosas**, com **alto contraste**, **letras grandes (base `18px`)**, **botões amplos (56px+)** e **linguagem acolhedora sem termos técnicos**.

---

## ✨ Funcionalidades Principais

1. **Criação do Grupo (Organizador):**
   - Nome do grupo (ex.: *"Amigo Secreto da Família"*) e valor sugerido do presente (ex.: *"Até R$ 50,00"*).
   - Geração automática de **link/código de convite** para os participantes e **link exclusivo do organizador** para realizar o sorteio.
   - Botão **Compartilhar no WhatsApp** com mensagem formatada contendo o link direto e o valor sugerido.

2. **Entrada do Participante e Lista de Desejos (Mobile-First):**
   - Barra fixa no topo com o **valor sugerido do presente** sempre visível como lembrete.
   - Cadastro de nome e **lista de presentes** (pode adicionar e remover itens antes e também editar a lista depois do sorteio).
   - **PIN opcional de 4 números** para proteger a consulta do resultado.
   - Memorização automática no `localStorage` do celular com botão **"Continuar como [Nome]"** ao reabrir o link.

3. **Sorteio com Ciclo Fechado (Derangement):**
   - Painel do organizador mostra os participantes confirmados e o botão grande **"Realizar sorteio agora"**.
   - Exige confirmação explícita antes de sortear e bloqueia novo sorteio acidental.
   - Algoritmo de **ciclo fechado único (ciclo hamiltoniano)**: ninguém tira a si mesmo, todos são sorteados e não existem subciclos isolados.

4. **Revelação Individual Secreta:**
   - Após o sorteio, cada participante vê **apenas quem tirou** (a API nunca retorna a lista completa de pares).
   - Solicita o PIN de 4 números (se configurado) ou exibe confirmação clara (*"Sou [Nome], toque para ver quem você tirou"*).
   - Destaque grande com o **nome da pessoa sorteada**, **valor sugerido do presente** e **lista de desejos**, além do botão **"Ocultar resultado na tela"**.

---

## 🗂️ Arquitetura e Estrutura do Projeto

```text
AmigoSecreto/
├── api/                                # Vercel Functions (Node.js runtime)
│   ├── _lib/
│   │   ├── db.ts                       # Conexão PostgreSQL (pg + attachDatabasePool) e repositório
│   │   └── draw.ts                     # Algoritmo de sorteio (ciclo fechado) e hash de PIN
│   ├── groups/
│   │   ├── index.ts                    # POST /api/groups (Criar grupo)
│   │   └── [code]/
│   │       ├── index.ts                # GET  /api/groups/:code (Consultar grupo e participantes)
│   │       ├── join.ts                 # POST /api/groups/:code/join (Entrar no grupo + lista de desejos)
│   │       └── draw.ts                 # POST /api/groups/:code/draw (Realizar sorteio)
│   └── participants/
│       └── [id]/
│           ├── wishlist.ts             # PUT  /api/participants/:id/wishlist (Editar lista de desejos)
│           └── reveal.ts               # POST /api/participants/:id/reveal (Revelar amigo secreto)
├── db/
│   └── schema.sql                      # Schema SQL das tabelas groups, participants e wishlist_items
├── scripts/
│   ├── dev-api.ts                      # Servidor local de desenvolvimento para as rotas /api
│   └── init-db.ts                      # Script para inicializar as tabelas no PostgreSQL
├── src/                                # Frontend Angular 19 (Standalone Components) + Tailwind CSS
│   ├── app/
│   │   ├── models/amigo-secreto.model.ts
│   │   ├── services/amigo-secreto.service.ts
│   │   └── pages/
│   │       ├── home/home.component.ts  # Criação de grupo, convite WhatsApp e atalhos salvos
│   │       └── group/group.component.ts# Entrada, lista de desejos, sorteio e revelação secreta
│   ├── index.html
│   └── styles.css
├── tests/
│   └── api.test.ts                     # Testes automatizados do sorteio e fluxo completo da API
└── vercel.json                         # Configuração de build e rotas para deploy na Vercel
```

---

## 🗄️ Modelo de Dados (PostgreSQL)

O schema completo encontra-se em [`db/schema.sql`](./db/schema.sql):

- **`groups`**: `id` (UUID), `title`, `suggested_price`, `invite_code`, `admin_token`, `is_drawn`, `created_at`
- **`participants`**: `id` (UUID), `group_id` (FK), `name`, `pin_hash` (SHA-256 com salt), `target_participant_id` (FK), `created_at`
- **`wishlist_items`**: `id` (UUID), `participant_id` (FK), `description`, `created_at`

> **Nota:** As funções da API também executam `CREATE TABLE IF NOT EXISTS` automaticamente na primeira conexão caso as tabelas ainda não existam no banco configurado em `DATABASE_URL`.

---

## 💻 Como Rodar Localmente

### 1. Pré-requisitos
- **Node.js 22+** (ou 20+) e **npm** instalados.

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente (Opcional para teste rápido, Obrigatório para Postgres)
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```
Edite o arquivo `.env` com a sua connection string do PostgreSQL (Neon, Supabase ou Postgres local):
```env
DATABASE_URL="postgresql://usuario:senha@host.neon.tech/neondb?sslmode=require"
```
*(Caso `DATABASE_URL` não esteja definida localmente, o servidor `dev:api` utiliza um armazenamento em memória automático para que você possa testar a interface imediatamente sem precisar configurar um banco antes).*

Se desejar inicializar as tabelas manualmente via CLI no seu banco PostgreSQL:
```bash
npm run db:init
```

### 4. Iniciar a API e o Frontend Angular
Em um terminal, inicie a API local (porta `3001`):
```bash
npm run dev:api
```
Em outro terminal, inicie o servidor Angular com proxy configurado (porta `4200`):
```bash
npm start
```
Abra **`http://localhost:4200`** no navegador ou no celular.

### 5. Executar os testes automatizados
```bash
npm test
```

---

## 🚀 Como Fazer o Deploy na Vercel (Passo a Passo)

### Opção A: Via Vercel CLI (Recomendado)

1. Instale ou utilize a Vercel CLI e vincule o projeto:
   ```bash
   npx vercel link
   ```
2. Provisione e conecte um banco **PostgreSQL** gratuito pelo Vercel Marketplace (Neon ou Supabase). Isso injeta automaticamente a variável `DATABASE_URL` no seu projeto Vercel:
   ```bash
   npx vercel install neon
   ```
   *(Ou `npx vercel install supabase` / `npx vercel install prisma`)*.
3. Faça o deploy para produção:
   ```bash
   npx vercel --prod
   ```

### Opção B: Via Painel Web da Vercel (GitHub / GitLab / Bitbucket)

1. Suba este repositório para o seu GitHub.
2. No painel da [Vercel](https://vercel.com/new), clique em **Add New... → Project** e importe o repositório.
3. As configurações de build já são detectadas automaticamente através do arquivo [`vercel.json`](./vercel.json):
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist/amigo-secreto-simples/browser`
4. Na aba **Storage** (ou **Integrations / Marketplace**) do projeto na Vercel, conecte o **Neon Postgres** ou **Supabase** (que preenche `DATABASE_URL` automaticamente), ou adicione manualmente a variável de ambiente:
   - `DATABASE_URL`: `postgresql://...` (sua string de conexão PostgreSQL)
   - `DATABASE_URL_POOLED` *(opcional)*: caso utilize pooler separado.
5. Clique em **Deploy**. Ao abrir o primeiro grupo, as tabelas serão criadas automaticamente no banco PostgreSQL caso você ainda não tenha rodado `db/schema.sql`.
