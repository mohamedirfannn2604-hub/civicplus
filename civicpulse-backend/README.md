# CivicPulse Backend

Smart Community Help Portal — REST API built with **Node.js + Express + SQLite**

## Tech Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite (via better-sqlite3)
- **Auth**: JWT + bcryptjs
- **File Upload**: Multer

## Quick Start

### 1. Install dependencies
```bash
cd civicpulse-backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Seed demo data
```bash
node seed.js
```

### 4. Start the server
```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

Server runs at: `http://localhost:5000`

## API Endpoints
See [API.md](./API.md) for full documentation.

## Demo Credentials
| Role  | Email                    | Password   |
|-------|--------------------------|------------|
| Admin | admin@civicpulse.in      | Admin@123  |
| User  | arjun@example.com        | Test@123   |

## Connect Frontend
Add this to your HTML frontend to connect:
```js
const API = 'http://localhost:5000/api';

// Example: Login
fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'arjun@example.com', password: 'Test@123' })
}).then(r => r.json()).then(data => {
  localStorage.setItem('token', data.token);
});

// Example: Report Issue
fetch(`${API}/issues`, {
  method: 'POST',
  body: new FormData(document.getElementById('issueForm'))
});

// Example: Get Blood Donors
fetch(`${API}/donors?blood_group=O%2B`)
  .then(r => r.json())
  .then(donors => console.log(donors));
```

## Database Tables
- `users` — Registered citizens
- `issues` — Reported civic complaints
- `blood_donors` — Verified blood donors
- `volunteers` — Registered volunteers
- `hospitals` — Nearby hospitals & health centers
- `schemes` — Government welfare schemes
- `notifications` — User notifications
- `contacts` — Contact form submissions

## Production Deployment
1. Set `NODE_ENV=production` in `.env`
2. Change `JWT_SECRET` to a long random string
3. Use [Railway](https://railway.app), [Render](https://render.com), or a VPS
4. Use [Nginx](https://nginx.org) as reverse proxy
5. Enable HTTPS with [Let's Encrypt](https://letsencrypt.org)

## License
MIT — CivicPulse Team 2026
