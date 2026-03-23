# NextStep Deployment Guide

## 1) Deploy AI service (Docker image)
- Push image: `omni1199/nextstep-ai:latest`
- Deploy on Render as **Web Service from existing image**
- Health path: `/health`
- Note URL: `https://<ai-service>.onrender.com`

## 2) Deploy backend (Render)
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Add envs from `backend/.env.example`
- Set:
  - `FRONTEND_URL=https://next-step-ai-sankalp.vercel.app`
  - `CORS_ORIGINS=https://next-step-ai-sankalp.vercel.app,http://localhost:3000,http://localhost:5173`
  - `FLASK_ANALYSIS_URL=https://<ai-service>.onrender.com`

## 3) Deploy frontend (Vercel)
- Root directory: `frontend`
- Build command: `npm run build`
- Install command: `npm install`
- Add envs from `frontend/.env.example`
- Set:
  - `NEXT_PUBLIC_SITE_URL=https://next-step-ai-sankalp.vercel.app`
  - `NEXT_PUBLIC_API_URL=https://<backend-service>.onrender.com`
  - `NEXT_PUBLIC_AI_URL=https://<ai-service>.onrender.com`

## 4) Post-deploy checks
- Frontend: `https://next-step-ai-sankalp.vercel.app`
- Backend: `https://<backend-service>.onrender.com/`
- AI: `https://<ai-service>.onrender.com/health`
- Interview flow should use env-configured backend/AI URLs.

## 5) Security
- Rotate previously exposed secrets and update platform env vars.
