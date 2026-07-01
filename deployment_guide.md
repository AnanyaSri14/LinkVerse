# LinkVerse Production Deployment Guide & Checklist

This guide provides the exact configuration details and environment variables required to deploy LinkVerse.

---

## 1. Git Status & Repository Details

* **Repository URL**: `https://github.com/AnanyaSri14/LinkVerse`
* **Target Branch**: `main`
* **Latest Commit Hash**: `3cea716532e5c99751902d5d8deb00b368207ea1`
* **Commit Message**: `feat: production backend configuration`
* **Status**: Local branch is ahead of `origin/main` by 2 commits (working tree clean, ready to push).

---

## 2. Render Backend Deployment Configuration

Deploy the `backend` directory as a **Web Service** on Render.

### Service Settings

| Parameter | Value |
| :--- | :--- |
| **Service Type** | Web Service |
| **Name** | `linkverse-backend` |
| **Repository URL** | `https://github.com/AnanyaSri14/LinkVerse` |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

### Required Environment Variables (Render)

Create these variables in the Render Service Environment settings:

| Variable Name | Value / Notes |
| :--- | :--- |
| `MONGODB_URI` | *mongodb+srv://&lt;username&gt;:&lt;password&gt;@&lt;cluster&gt;.mongodb.net/LinkVerse* |
| `JWT_SECRET` | *(Generate a strong 256-bit secret string)* |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | *(The production URL of your Vercel frontend, e.g., `https://link-verse.vercel.app`)* |
| `PORT` | `10000` *(Render sets this automatically, but set explicitly if needed)* |

---

## 3. Vercel Frontend Deployment Configuration

Deploy the `frontend` directory as a project on Vercel.

### Project Settings

| Parameter | Value |
| :--- | :--- |
| **Framework Preset** | `Next.js` |
| **Root Directory** | `frontend` |
| **Build Command** | `next build` *(Default)* |
| **Output Directory** | `.next` *(Default)* |

### Required Environment Variables (Vercel)

Create these variables in the Vercel Project settings:

| Variable Name | Value / Notes |
| :--- | :--- |
| `NEXT_PUBLIC_BASE_URL` | *(The production URL of your Render backend, e.g., `https://linkverse-backend.onrender.com`)* |

---

## 4. Pre-Deployment Readiness Checklist

Before pushing to GitHub and deploying, verify:

- [x] **Backend CORS Hardened**: Express & Socket.IO both validate origins dynamically.
- [x] **Database connection robust**: Prefers `MONGODB_URI`, falls back to `MONGO_URI`.
- [x] **No hardcoded localhost URLs**: Fallback uses `CLIENT_URL`.
- [x] **Build verified**: Next.js compilation completes without errors (`npm run build` passed).
- [x] **Secrets secured**: Clean workspace; `.env` is ignored by git and won't be pushed.
