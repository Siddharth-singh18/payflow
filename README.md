# PayFlow

PayFlow is a production-grade MERN fintech wallet platform inspired by GPay, PhonePe, and Paytm. It includes JWT auth, MongoDB-backed wallet transactions, Redis-backed tokens/rate limits/idempotency, Razorpay test-mode payments, Socket.io notifications, Swagger docs, Jest/Supertest tests, Docker Compose, and deployment configs for Railway and Vercel.

## Tech Stack

- Backend: Node.js, Express.js, TypeScript, MongoDB, Mongoose, Redis, Socket.io
- Frontend: React, TypeScript, Tailwind CSS, React Query, Zustand, Recharts, Framer Motion
- Auth: JWT access and refresh tokens, bcrypt password hashing, OTP flow
- Payments: Razorpay test mode, webhook signature verification
- Tooling: Swagger, Jest, Supertest, Docker, Docker Compose
- Deployment: Railway for backend, Vercel for frontend

## Project Structure

```text
payFlow/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── jobs/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   ├── Dockerfile
│   └── railway.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── types/
│   │   └── utils/
│   └── vercel.json
├── docker-compose.yml
├── .env.example
└── README.md
```

## Features

- Auth: register, OTP verification, login, refresh, logout, forgot/reset password
- Wallet: balance, atomic P2P transfer, add money, QR generation, QR pay
- Safety: Redis idempotency keys, KYC daily limits, fraud scoring, audit logs
- Transactions: paginated history, filters, analytics aggregations
- KYC: Aadhaar/PAN upload, status tracking, admin approval/rejection
- Split bills: create group expenses and settle shares through wallet transfer
- Scheduled payments: daily/weekly/monthly autopay executed by cron
- Notifications: persistent notification center plus Socket.io real-time events
- Admin: users, transactions, platform stats, fraud logs, KYC review, block/unblock
- Docs: Swagger UI at `/api-docs`
- Tests: auth, wallet transfer, idempotency, fraud detection

## Prerequisites

- Node.js 20+
- npm
- Docker and Docker Compose
- Razorpay test account
- SMTP credentials for OTP/reset email

## Environment Setup

Create a root `.env` file from the example:

```bash
cp .env.example .env
```

For local Docker development, the default MongoDB and Redis URLs in `.env.example` are ready to use:

```env
MONGODB_URI=mongodb://mongo:27017/payflow
REDIS_URL=redis://redis:6379
FRONTEND_URL=http://localhost:3000
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

Update these secrets before running a real deployment:

```env
JWT_ACCESS_SECRET=replace_with_a_very_long_access_secret_minimum_32_chars
JWT_REFRESH_SECRET=replace_with_a_very_long_refresh_secret_minimum_32_chars
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
ADMIN_EMAIL=admin@payflow.com
```

## Local Development

Install dependencies:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Run MongoDB, Redis, and the backend with Docker Compose:

```bash
docker compose up --build
```

Run the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5000/health`
- Swagger docs: `http://localhost:5000/api-docs`
- Swagger JSON: `http://localhost:5000/api-docs.json`

## Scripts

Backend:

```bash
cd backend
npm run dev
npm run build
npm start
npm test
npm run lint
npm run format
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run preview
npm run lint
npm run format
```

## API Overview

All application APIs are mounted under `/api/v1`.

- Auth: `/api/v1/auth`
- Wallet: `/api/v1/wallet`
- Transactions: `/api/v1/transactions`
- KYC: `/api/v1/kyc`
- Split bills: `/api/v1/split`
- Scheduled payments: `/api/v1/schedule`
- Notifications: `/api/v1/notifications`
- Admin: `/api/v1/admin`
- Razorpay webhook: `/api/v1/webhooks/razorpay`

For wallet transfers, send an idempotency header:

```http
X-Idempotency-Key: unique-client-generated-key
```

## Frontend Routes

- `/login`
- `/register`
- `/verify-otp`
- `/forgot-password`
- `/reset-password`
- `/dashboard`
- `/send`
- `/history`
- `/analytics`
- `/qr`
- `/split`
- `/profile`
- `/admin`

## Testing

Run backend tests:

```bash
cd backend
npm test
```

The test suite uses `mongodb-memory-server` for isolated MongoDB tests. Make sure no production environment variables point tests to a real database.

## Docker

Start the full backend stack:

```bash
docker compose up --build
```

Stop services:

```bash
docker compose down
```

Stop services and remove persisted local MongoDB/Redis data:

```bash
docker compose down -v
```

Docker Compose starts:

- `app`: backend API on port `5000`
- `mongo`: MongoDB 7 on port `27017`
- `redis`: Redis 7 on port `6379`

## Deployment

### 1. Prepare Production Services

Create production instances for:

- MongoDB: MongoDB Atlas is the easiest option
- Redis: Railway Redis, Upstash Redis, or another hosted Redis provider
- Email: Gmail app password, SendGrid SMTP, Mailgun SMTP, or another SMTP provider
- Razorpay: test-mode keys while developing, live keys only after compliance review

### 2. Deploy Backend on Railway

The backend already includes `backend/railway.json` with:

- Build command: `npm ci && npm run build`
- Start command: `node dist/server.js`
- Health check: `/health`

Railway setup:

1. Push this repository to GitHub.
2. Create a new Railway project from the GitHub repo.
3. Set the Railway service root directory to `backend`.
4. Add these environment variables in Railway:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_production_mongodb_uri
REDIS_URL=your_production_redis_url
JWT_ACCESS_SECRET=your_32_plus_char_access_secret
JWT_REFRESH_SECRET=your_32_plus_char_refresh_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
EMAIL_HOST=your_smtp_host
EMAIL_PORT=587
EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_password
FRONTEND_URL=https://your-vercel-domain.vercel.app
ADMIN_EMAIL=admin@payflow.com
```

5. Deploy and copy the Railway backend URL, for example:

```text
https://payflow-api-production.up.railway.app
```

6. Confirm:

```text
https://your-railway-url/health
https://your-railway-url/api-docs
```

### 3. Configure Razorpay Webhook

In the Razorpay dashboard, create a webhook pointing to:

```text
https://your-railway-url/api/v1/webhooks/razorpay
```

Use the same webhook secret in Railway:

```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

Enable payment capture events such as `payment.captured`.

### 4. Deploy Frontend on Vercel

The frontend already includes `frontend/vercel.json` with Vite build settings and SPA rewrites.

Vercel setup:

1. Import the same GitHub repo into Vercel.
2. Set the project root directory to `frontend`.
3. Add these environment variables:

```env
VITE_API_URL=https://your-railway-url/api/v1
VITE_SOCKET_URL=https://your-railway-url
VITE_RAZORPAY_KEY_ID=your_razorpay_key
```

4. Deploy the frontend.
5. Copy the Vercel production URL.
6. Go back to Railway and update:

```env
FRONTEND_URL=https://your-vercel-domain.vercel.app
```

7. Redeploy/restart the Railway backend so CORS picks up the final frontend URL.

## Production Checklist

- Use strong JWT secrets with at least 32 characters.
- Do not commit `.env`.
- Use production MongoDB and Redis URLs, not local Docker service names.
- Set `FRONTEND_URL` exactly to the Vercel production URL.
- Set `VITE_API_URL` to the Railway URL plus `/api/v1`.
- Set `VITE_SOCKET_URL` to the Railway base URL without `/api/v1`.
- Verify `/health` and `/api-docs` after backend deploy.
- Verify Razorpay webhook signature secret matches the Railway env var.
- Run `npm test` in `backend` before deployment.
- Run `npm run build` in both `backend` and `frontend` before deployment.

## Common Issues

- CORS error: update `FRONTEND_URL` in Railway to the exact Vercel URL and redeploy the backend.
- Frontend API calls go to localhost: set `VITE_API_URL` in Vercel and redeploy.
- Socket connection fails: set `VITE_SOCKET_URL` to the backend base URL without `/api/v1`.
- Railway health check fails: check required env vars, especially JWT/Razorpay/email values.
- Razorpay webhook credits do not appear: verify webhook URL, enabled events, and `RAZORPAY_WEBHOOK_SECRET`.
- OTP email does not send: verify SMTP host, port, username, password, and app-password settings.

## Suggested Deployment Order

1. Push code to GitHub.
2. Create MongoDB Atlas database.
3. Create Redis instance.
4. Deploy backend to Railway with production env vars.
5. Check backend `/health`.
6. Deploy frontend to Vercel with backend env vars.
7. Update Railway `FRONTEND_URL` to Vercel URL.
8. Configure Razorpay webhook.
9. Register a test user and verify OTP/login.
10. Test add-money, transfer, history, notification, and admin flows.

