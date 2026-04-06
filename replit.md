# CrowdUp - Crowdfunding Platform

## Overview
CrowdUp is a full-stack crowdfunding platform that allows users to create accounts, browse and search fundraising campaigns, create their own campaigns with goals and deadlines, and make donations via Stripe.

## Tech Stack
- **Frontend:** React 18, TypeScript, Vite 4
- **UI:** Mantine UI v6, Emotion, Tiptap (rich text editor)
- **Backend:** Node.js + Express (server.js) — handles auth, campaigns, donations, and payments
- **Database:** Replit PostgreSQL (pg driver, schema auto-created on startup)
- **Auth:** JWT-based authentication (bcryptjs + jsonwebtoken)
- **Payments:** Stripe
- **Charts:** ApexCharts
- **Routing:** React Router v6

## Project Structure
- `src/` - Frontend React application
  - `components/` - Reusable UI components
  - `contexts/AuthContext.tsx` - JWT auth context (no Supabase)
  - `pages/` - Page-level components
  - `services/` - API service layers (auth, campaigns, donations, payment)
  - `routes/` - Routing configuration
- `server.js` - Express backend: auth routes, campaign routes, donation routes, Stripe
- `public/` - Static assets

## Architecture
- The frontend talks to `/api/*` which the Vite dev proxy forwards to `http://localhost:3001`
- The Express server initializes the database schema on startup
- Auth tokens are stored in `localStorage` and sent as `Authorization: Bearer <token>`

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-set by Replit DB)
- `JWT_SECRET` - Secret for signing JWT tokens (set as env var)
- `STRIPE_SECRET_KEY` - Stripe secret key (optional; set as secret to enable payments)
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (frontend, optional)

## Development
```bash
npm install
npm run dev  # Runs both Express server (port 3001) and Vite (port 5000)
```

## Deployment
The app uses `concurrently` to run both servers. For production deployment, consider a server-based deployment target (not static).
