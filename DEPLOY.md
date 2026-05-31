# RoadSoS Deployment Guide

## Architecture

- **Frontend**: Next.js PWA → deployed on **Vercel**
- **Backend**: FastAPI (Python) → deployed on **Render** (Docker)
- **Database**: SQLite (persisted on Render disk volume)

---

## 1. Deploy Backend on Render

### Steps:
1. Go to [render.com](https://render.com) and sign in
2. Click **New → Web Service**
3. Connect your GitHub repo (`ayushjhaa1187-spec/RoadSoS`)
4. Configure:
   - **Name**: `roadsos-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free (or Starter for always-on)

5. Set **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `DATABASE_PATH` | `/data/emergency_data.db` |
   | `GEMINI_API_KEY` | your-gemini-api-key |
   | `PORT` | `8080` |

6. Under **Disks**, add:
   - **Mount Path**: `/data`
   - **Size**: 1 GB

7. Click **Create Web Service**

> **Your backend URL will be**: `https://roadsos-backend.onrender.com`

> **Note**: Alternatively, you can use the `render.yaml` file in the repo root — Render will auto-detect it.

---

## 2. Deploy Frontend on Vercel

### Steps:
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New → Project**
3. Import your GitHub repo (`ayushjhaa1187-spec/RoadSoS`)
4. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `.` (repo root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. Set **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://roadsos-backend.onrender.com` |

6. Click **Deploy**

> **Your frontend URL will be**: `https://roadsos.vercel.app` (or your custom domain)

---

## 3. Post-Deployment Checklist

- [ ] Visit `https://roadsos-backend.onrender.com/health` → should return `{"status": "ok"}`
- [ ] Visit `https://roadsos-backend.onrender.com/docs` → FastAPI Swagger UI
- [ ] Visit your Vercel URL → frontend loads and map shows
- [ ] Test SOS button → should show nearby hospitals
- [ ] Test chatbot → should respond
- [ ] Test offline mode → disconnect internet, map still works (PWA cache)

---

## 4. Environment Variables Summary

### Frontend (Vercel):
```
NEXT_PUBLIC_API_URL=https://roadsos-backend.onrender.com
```

### Backend (Render):
```
DATABASE_PATH=/data/emergency_data.db
GEMINI_API_KEY=<your-key>
PORT=8080
```

---

## 5. Local Development

```bash
# Frontend
npm install
npm run dev           # http://localhost:3000

# Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 6. Seeding the Database (Optional)

If deploying for the first time, the SQLite DB starts empty.
To pre-populate with emergency POI data, run the pipeline:

```bash
cd backend
python pipeline/seed.py
```

Then copy the `emergency_data.db` to your Render disk via their shell.
