CivicPulse Backend — Vercel Deployment Guide
Fix Applied
Replaced `better-sqlite3` (native C++ - breaks on Vercel) with Prisma + PostgreSQL (pure JS - works everywhere).
Folder Structure
```
civicpulse-backend/
├── api/index.js          <- Express API (Vercel entry point)
├── prisma/schema.prisma  <- Database schema
├── seed.js               <- Demo data seeder
├── vercel.json           <- Vercel routing config
├── package.json          <- No native modules
└── .env.example          <- Environment variables
```
Deploy to Vercel — Step by Step
Step 1 — Get Free PostgreSQL (Neon)
Go to https://neon.tech
Sign up → New Project → Database name: civicpulse
Copy Connection String:
postgresql://user:pass@ep-xxx.neon.tech/civicpulse?sslmode=require
Step 2 — Push to GitHub
```bash
git init
git add .
git commit -m "CivicPulse backend"
git remote add origin https://github.com/YOUR_USERNAME/civicpulse-backend.git
git push -u origin main
```
Step 3 — Deploy on Vercel
Go to https://vercel.com/new
Import your GitHub repo
Add Environment Variables:
DATABASE_URL = your Neon connection string
JWT_SECRET   = any long random string
Click Deploy
Step 4 — Setup Database Tables
Run locally after deploy:
```bash
npm install
npx prisma generate
DATABASE_URL="your_neon_url" npx prisma db push
DATABASE_URL="your_neon_url" node seed.js
```
Step 5 — Connect Frontend
In smart-community-portal.html, update:
```js
const API_BASE = 'https://YOUR-PROJECT.vercel.app/api';
let API_ENABLED = true;
```
Local Development
```bash
npm install
cp .env.example .env       # add your DATABASE_URL
npx prisma db push
node seed.js
npm run dev
# runs at http://localhost:5000/api
```
Demo Credentials
Admin: admin@civicpulse.in / Admin@123
User:  arjun@example.com   / Test@123
Why This Works on Vercel
better-sqlite3 = C++ native module = FAILS on Vercel
@prisma/client = pure JavaScript = WORKS on Vercel
SQLite file = no persistent disk on Vercel = FAILS
PostgreSQL on Neon = cloud database = WORKS
