# Realtime Kanban Board

A simplified Trello: multi-user boards with lists and cards, drag & drop, and instant realtime sync between everyone viewing the same board.

## Stack

| Layer    | Tech                                                                 |
| -------- | -------------------------------------------------------------------- |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS v4, dnd-kit, socket.io-client |
| Backend  | Node.js, Express, Socket.IO, Zod, Helmet, CORS                       |
| Auth     | JWT (7-day tokens) + bcrypt-hashed passwords                          |
| Database | PostgreSQL + Prisma ORM                                               |
| Infra    | Docker Compose (local), Render + Vercel + Railway/Neon (production)   |

## Features

- Register / login / logout with JWT auth and bcrypt password hashing
- Boards: create, rename, delete (owner-only delete/invite)
- Lists (columns) and cards with title, description, due date
- Drag & drop cards within and between lists (dnd-kit)
- Ordering via a float `position` field — inserting between two cards writes the midpoint, no full reindex
- Realtime: every change broadcasts to a Socket.IO room per board
- Optimistic UI updates with rollback + toast on failure
- Owner invites members by email (users must be registered)
- Zod validation on every API input, auth middleware on private routes, Helmet + CORS
- Responsive layout with loading and error states

## Quick start (Docker)

```bash
docker compose up --build
```

Then open **http://localhost:5173** (client). API runs on **http://localhost:4000**, Postgres on **localhost:5433** (`kanban`/`kanban`; host port 5433 to avoid clashing with any local Postgres on 5432). The server applies Prisma migrations automatically at startup.

Register two accounts in two browser windows, open the same board in both, and drag a card — the other window updates instantly.

## Manual dev setup (hot reload without Docker)

1. Start Postgres (any way you like):

   ```bash
   docker compose up -d db
   ```

2. Server:

   ```bash
   cd server
   npm install
   cp .env.example .env   # defaults point at localhost:5432
   npx prisma migrate deploy
   npm run dev            # http://localhost:4000
   ```

3. Client:

   ```bash
   cd client
   npm install
   npm run dev            # http://localhost:5173
   ```

## Environment variables

### server (see `server/.env.example`)

| Variable        | Description                                  |
| --------------- | -------------------------------------------- |
| `DATABASE_URL`  | PostgreSQL connection string                 |
| `JWT_SECRET`    | Secret used to sign tokens (16+ chars)       |
| `CLIENT_ORIGIN` | Comma-separated allowed origins for CORS/WS  |
| `PORT`          | API port (default 4000)                      |

### client

| Variable        | Description                                        |
| --------------- | -------------------------------------------------- |
| `VITE_API_URL`  | API base URL (default `http://localhost:4000`)     |

## API overview

| Method | Path                       | Auth | Notes                                  |
| ------ | -------------------------- | ---- | -------------------------------------- |
| POST   | `/api/auth/register`       | –    | `{ name, email, password }` → token    |
| POST   | `/api/auth/login`          | –    | `{ email, password }` → token          |
| POST   | `/api/auth/logout`         | –    | Stateless no-op (client discards token)|
| GET    | `/api/auth/me`             | JWT  | Current user                           |
| GET    | `/api/boards`              | JWT  | Boards you own or are a member of      |
| POST   | `/api/boards`              | JWT  | Creates board with 3 default lists     |
| GET    | `/api/boards/:id`          | JWT  | Board + lists + cards + members        |
| PATCH  | `/api/boards/:id`          | JWT  | Rename                                 |
| DELETE | `/api/boards/:id`          | JWT  | Owner only                             |
| POST   | `/api/boards/:id/members`  | JWT  | Owner only, `{ email }`                |
| POST   | `/api/lists`               | JWT  | `{ boardId, title }`                   |
| PATCH  | `/api/lists/:id`           | JWT  | Rename                                 |
| DELETE | `/api/lists/:id`           | JWT  | Cascades cards                         |
| POST   | `/api/cards`               | JWT  | `{ listId, title, description?, dueDate? }` |
| PATCH  | `/api/cards/:id`           | JWT  | Edit fields, or `{ listId, position }` to move |
| DELETE | `/api/cards/:id`           | JWT  |                                        |

## Realtime events

Clients join room `board:<id>` after connecting with their JWT. REST mutations emit:

`board:updated`, `board:deleted`, `member:added`, `list:created`, `list:updated`, `list:deleted`, `card:created`, `card:updated`, `card:deleted`

Every payload carries `actorId` so the client that made the change skips its own events (it already applied the change optimistically).

## Project structure

```
.
├── docker-compose.yml
├── render.yaml            # Render blueprint for the API
├── DEPLOYMENT.md          # Render + Vercel + Railway/Neon guide
├── server/
│   ├── prisma/            # schema.prisma + migrations
│   └── src/
│       ├── routes/        # auth, boards, lists, cards
│       ├── services/      # shared access-control queries
│       ├── middleware/    # requireAuth, zod validate
│       ├── socket.ts      # Socket.IO auth + rooms
│       └── realtime.ts    # emitToBoard helper
└── client/
    └── src/
        ├── pages/         # Login, Register, Dashboard, Board
        ├── components/    # board columns, cards, modals, ui
        ├── hooks/         # useBoardSocket
        ├── context/       # Auth, Toast
        └── lib/           # api, socket, cn
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) — API on Render, client on Vercel, database on Railway or Neon.

## Notes

- Card/list ordering: new items get `max(position) + 1024`; a move between neighbors writes `(prev + next) / 2`. Float64 gives ~50 splits before precision tuning is needed.
- Intentionally out of scope until core is stable: comments, labels, file uploads, automated tests.
