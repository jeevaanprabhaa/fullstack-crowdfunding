# CrowdUp - Crowdfunding Platform

## Overview
CrowdUp is a full-stack crowdfunding platform that allows users to create accounts, browse and search fundraising campaigns, create their own campaigns with goals and deadlines, and make donations via Stripe.

## Tech Stack
- **Frontend:** React 18, TypeScript, Vite 4
- **UI:** Mantine UI v6, Emotion, Tiptap (rich text editor)
- **Backend/BaaS:** Supabase (PostgreSQL, Auth, Edge Functions)
- **Payments:** Stripe
- **Charts:** ApexCharts
- **Routing:** React Router v6

## Project Structure
- `src/` - Frontend React application
  - `components/` - Reusable UI components
  - `config/` - Supabase client setup
  - `contexts/` - React Context (Auth)
  - `pages/` - Page-level components
  - `services/` - Supabase API abstraction layers
  - `routes/` - Routing configuration
- `supabase/` - Backend config
  - `functions/` - Deno Edge Functions (Stripe payment intent)
  - `migrations/` - PostgreSQL schema, RLS, triggers
- `public/` - Static assets

## Environment Variables
Copy `.env.example` to `.env` and fill in:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

## Development
```bash
npm install --legacy-peer-deps
npm run dev  # Runs on port 5000
```

## Deployment
Configured as a static site:
- Build: `npm run build`
- Output: `dist/`
