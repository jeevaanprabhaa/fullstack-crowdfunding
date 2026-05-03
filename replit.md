# CrowdUp - Crowdfunding Platform

## Overview
CrowdUp is a full-stack crowdfunding platform that allows users to create accounts, browse and search fundraising campaigns, create their own campaigns with goals and deadlines, and make donations via Stripe.

## Tech Stack
- **Frontend:** React 18, TypeScript, Vite 4
- **UI:** Mantine UI v6, Emotion, Tiptap (rich text editor)
- **Backend:** Node.js + Express (server.js) — handles auth, campaigns, donations, and payments
- **Database:** MongoDB via Mongoose (free forever M0 Atlas cluster)
- **Auth:** JWT-based authentication (bcryptjs + jsonwebtoken)
- **Payments:** Stripe
- **Charts:** ApexCharts
- **Routing:** React Router v6

## Project Structure
- `src/` - Frontend React application
  - `components/` - Reusable UI components
  - `contexts/AuthContext.tsx` - JWT auth context
  - `pages/` - Page-level components
  - `services/` - API service layers (auth, campaigns, donations, payment)
  - `routes/` - Routing configuration
- `server.js` - Express backend: auth routes, campaign routes, donation routes, Stripe, MongoDB connection

## Architecture
- The frontend talks to `/api/*` which the Vite dev proxy forwards to `http://localhost:3001`
- The Express server connects to MongoDB on startup via Mongoose
- MongoDB `_id` fields are serialized as string `id` in all API responses
- Auth tokens are stored in `localStorage` and sent as `Authorization: Bearer <token>`

## MongoDB Models
- **Profile** — users (email unique, password_hash, name, avatar_url)
- **Campaign** — crowdfunding campaigns (references Profile as creator_id)
- **Donation** — donations (references Campaign and Profile, tracks Stripe payment_intent_id)

## Environment Variables
- `MONGODB_URI` - MongoDB Atlas connection string (set as secret)
- `JWT_SECRET` - Secret for signing JWT tokens (set as env var)
- `STRIPE_SECRET_KEY` - Stripe secret key (set as secret, optional — disables payments if missing)
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (frontend, set as secret)

## Development
```bash
npm install
npm run dev  # Runs both Express server (port 3001) and Vite (port 5000)
```

## Deployment (Render / Vercel)
- Set `MONGODB_URI`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY` as environment variables
- Backend: deploy as Node.js service (server.js on port from `process.env.PORT`)
- Frontend: build with `npm run build` → serve `dist/` as static
- Set `ALLOWED_ORIGIN` on backend to your frontend domain to restrict CORS in production
