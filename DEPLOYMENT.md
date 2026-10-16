# Deployment guide

Target: API on **Render**, client on **Vercel**, database on **Railway** or **Neon**.

## 1. Database (Railway or Neon)

### Option A — Railway

1. Create a new project → **Provision PostgreSQL**.
2. Open the service → **Variables** → copy `DATABASE_URL`
   (looks like `postgresql://postgres:...@...:5432/railway`).

### Option B — Neon

1. Create a project, copy the **pooled connection string**.
2. Append `?sslmode=require` if not present:
   `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`

## 2. API on Render

1. Push this folder to a GitHub repo.
2. Render dashboard → **New → Blueprint** and point it at the repo (uses `render.yaml`), or create a **Web Service** manually:
   - **Root directory**: `server`
   - **Build command**: `npm install && npx prisma generate && npm run build`
   - **Start command**: `npx prisma migrate deploy && npm start`
   - **Health check path**: `/api/health`
3. Set environment variables:
   - `DATABASE_URL` — from step 1
   - `JWT_SECRET` — long random string (Blueprint generates one automatically)
   - `CLIENT_ORIGIN` — your Vercel URL(s), comma-separated, e.g.
     `https://kanban.vercel.app,https://kanban-git-xx.vercel.app`
   - `NODE_ENV=production`
4. Deploy. Migrations apply on every start (`prisma migrate deploy`).

> Render supports WebSockets out of the box — Socket.IO works with no extra config.

## 3. Client on Vercel

1. Vercel → **Add New → Project** → import the repo.
2. Settings:
   - **Root directory**: `client`
   - Framework preset: **Vite** (auto-detected)
3. Environment variable:
   - `VITE_API_URL` — `https://<your-render-app>.onrender.com`
4. Deploy. `client/vercel.json` already rewrites unknown paths to `index.html` so React Router deep links work.

## 4. Verify

1. Open the Vercel URL, register an account.
2. Create a board — the API logs should show the migration + queries.
3. Open the same board in a second browser/incognito and drag a card — it should appear instantly in the first window.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| CORS errors in browser console | `CLIENT_ORIGIN` on Render must exactly match the Vercel URL(s) (no trailing slash) |
| Socket not connecting (no realtime) | Check `VITE_API_URL` and that `CLIENT_ORIGIN` includes the Vercel domain — Socket.IO CORS uses the same list |
| `P1001: can't reach database` | Wrong `DATABASE_URL` / DB paused (Neon free tier scales to zero — first request wakes it) |
| 401 after a while | JWT expired (7 days) — log in again |
