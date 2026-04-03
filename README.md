# CrowdUp - Production-Ready Full-Stack Crowdfunding Platform

A complete crowdfunding application built with React, TypeScript, Supabase, and Stripe.

## 🚀 What's Included

This is a **fully functional startup-ready** crowdfunding platform where users can:
- ✅ Create accounts and authenticate securely
- ✅ Browse and search fundraising campaigns
- ✅ Create campaigns with goals, deadlines, and categories
- ✅ Make real donations using Stripe payments
- ✅ Track donations and campaign progress in real-time
- ✅ Manage dashboard with campaign analytics

## ✨ Key Features

- **Real Authentication** - Supabase Auth with JWT tokens
- **Secure Database** - PostgreSQL with Row Level Security
- **Payment Processing** - Stripe integration for donations
- **Protected Routes** - Auth guards on dashboard/create pages
- **Real-time Updates** - Automatic campaign amount updates
- **Responsive Design** - Mobile-friendly Mantine UI

## 🏗️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (fast development)
- Mantine UI v6
- React Router v6
- Stripe React

**Backend:**
- Supabase (PostgreSQL + Auth + Edge Functions)
- Stripe API
- Row Level Security
- Serverless architecture

## 📦 Quick Start

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Configure Stripe

**Get Stripe Keys:**
1. Visit [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Publishable key** (pk_test_...)
3. Copy your **Secret key** (sk_test_...)

**Add to Supabase:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: Edge Functions → Secrets
3. Add: `STRIPE_SECRET_KEY` = your secret key

**Update `.env`:**
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### 3. Run Application

```bash
npm run dev
```

Visit **http://localhost:5173**

### 4. Test with Stripe

Use test card: **4242 4242 4242 4242**
- Any future expiry
- Any 3-digit CVV
- Any postal code

## 📁 Project Structure

```
src/
├── config/
│   └── supabase.ts              # Supabase client
├── contexts/
│   └── AuthContext.tsx          # Auth state management
├── services/
│   ├── auth.service.ts          # User authentication
│   ├── campaigns.service.ts     # Campaign CRUD
│   ├── donations.service.ts     # Donations management
│   └── payment.service.ts       # Stripe payments
├── components/
│   └── ProtectedRoute.tsx       # Auth guard
├── pages/
│   ├── Login.tsx                # User login
│   ├── Signup.tsx               # Registration
│   ├── Campaigns.tsx            # Browse campaigns
│   ├── CampaignDetails.tsx      # Single campaign
│   ├── CreateCampaign.tsx       # Create fundraiser
│   └── Dashboard.tsx            # User dashboard
supabase/functions/
└── create-payment-intent/       # Stripe Edge Function
```

## 🗄️ Database

**Tables (all with RLS enabled):**
- `profiles` - User accounts
- `campaigns` - Fundraising campaigns
- `donations` - Payment records

**Features:**
- Automatic campaign amount updates via triggers
- Secure policies for data isolation
- User-scoped data access

## 🔐 Security

- JWT authentication
- Row Level Security on all tables
- Protected API routes
- Secure payment processing
- Password hashing

## 🧪 Testing

**Create test account** - Use signup page

**Test donations:**
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002

## 📖 Documentation

See **SETUP.md** for:
- Detailed setup guide
- API documentation
- Database schema
- Troubleshooting
- Deployment instructions

## 🚀 Build & Deploy

```bash
# Build for production
npm run build

# Preview build
npm run preview
```

**Deploy:**
- Frontend: Netlify/Vercel (deploy `dist/` folder)
- Backend: Already deployed on Supabase
- Set environment variables in hosting dashboard

## 🛠️ Troubleshooting

**Install fails:**
```bash
npm install --legacy-peer-deps
```

**Port in use:**
```bash
npx kill-port 5173
```

## 📄 License

MIT License
