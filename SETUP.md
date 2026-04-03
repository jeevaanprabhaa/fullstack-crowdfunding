# CrowdUp - Full-Stack Crowdfunding Platform

A production-ready crowdfunding platform built with React, Supabase, and Stripe.

## Features

- User authentication with Supabase Auth
- Create and manage crowdfunding campaigns
- Real-time campaign updates
- Stripe payment integration for donations
- Protected routes and JWT authentication
- Responsive design with Mantine UI
- PostgreSQL database with Row Level Security

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Mantine UI v6** for components
- **React Router v6** for routing
- **Stripe React** for payment forms

### Backend
- **Supabase** for database, auth, and backend
- **PostgreSQL** with Row Level Security
- **Supabase Edge Functions** for serverless API
- **Stripe** for payment processing

## Prerequisites

Before you begin, ensure you have:
- Node.js (v16 or higher)
- npm or yarn
- A Supabase account (free tier works)
- A Stripe account (test mode works)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd project

# Remove existing node_modules if any
rm -rf node_modules package-lock.json

# Install dependencies (use --legacy-peer-deps if needed)
npm install --legacy-peer-deps
```

### 2. Supabase Setup

The database is already configured with:
- `profiles` table for user data
- `campaigns` table for fundraising campaigns
- `donations` table for tracking donations
- Row Level Security enabled on all tables
- Automatic triggers for updating campaign amounts

**The migration has already been applied to your Supabase project!**

### 3. Environment Variables

Update the `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://skxumrmzjqqnwlybhxjt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNreHVtcm16anFxbndseWJoeGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjU0OTUsImV4cCI6MjA5MDU0MTQ5NX0.p7HEhHF4JyJ8lC-fo_8Sm3I2_Qo-kE2aLhNrvIgrJso
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
```

### 4. Stripe Setup

#### Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create an account or login
3. Go to **Developers > API keys**
4. Copy your **Publishable key** (starts with `pk_test_`)
5. Copy your **Secret key** (starts with `sk_test_`)

#### Configure Stripe Secret in Supabase

The Edge Function for payment processing needs your Stripe secret key:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Edge Functions**
4. Click on **Secrets**
5. Add a new secret:
   - Name: `STRIPE_SECRET_KEY`
   - Value: Your Stripe secret key (sk_test_...)

#### Update Frontend Environment Variable

Add your Stripe publishable key to `.env`:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### 5. Run the Application

```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### 6. Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
project/
├── src/
│   ├── config/
│   │   └── supabase.ts          # Supabase client configuration
│   ├── contexts/
│   │   └── AuthContext.tsx       # Authentication context
│   ├── services/
│   │   ├── auth.service.ts       # Auth API calls
│   │   ├── campaigns.service.ts  # Campaign API calls
│   │   ├── donations.service.ts  # Donation API calls
│   │   └── payment.service.ts    # Stripe payment API
│   ├── components/
│   │   ├── ProtectedRoute.tsx    # Auth guard component
│   │   └── ...                   # Other UI components
│   ├── pages/
│   │   ├── Login.tsx             # Login page
│   │   ├── Signup.tsx            # Signup page
│   │   ├── Dashboard.tsx         # User dashboard
│   │   ├── Campaigns.tsx         # Browse campaigns
│   │   ├── CampaignDetails.tsx   # Single campaign view
│   │   └── CreateCampaign.tsx    # Create new campaign
│   └── routes/
│       └── index.tsx             # Route configuration
├── supabase/
│   └── functions/
│       └── create-payment-intent/
│           └── index.ts          # Stripe payment Edge Function
├── .env                          # Environment variables
└── package.json
```

## API Services

### Authentication (`auth.service.ts`)
- `register(email, password, name)` - Create new account
- `login(email, password)` - Sign in user
- `logout()` - Sign out user
- `getCurrentUser()` - Get current user
- `getProfile(userId)` - Get user profile
- `updateProfile(updates)` - Update profile

### Campaigns (`campaigns.service.ts`)
- `getAllCampaigns()` - Get all active campaigns
- `getCampaignById(id)` - Get single campaign
- `getCampaignsByCreator(creatorId)` - Get user's campaigns
- `createCampaign(data)` - Create new campaign
- `updateCampaign(id, data)` - Update campaign
- `deleteCampaign(id)` - Delete campaign
- `searchCampaigns(query)` - Search campaigns

### Donations (`donations.service.ts`)
- `createDonation(data)` - Create donation record
- `updateDonationStatus(paymentIntentId, status)` - Update status
- `getDonationsByUser(userId)` - Get user's donations
- `getDonationsByCampaign(campaignId)` - Get campaign donations
- `getDonationStats(campaignId)` - Get donation statistics

### Payment (`payment.service.ts`)
- `createPaymentIntent(data)` - Create Stripe payment intent

## Database Schema

### profiles
- `id` (uuid, FK to auth.users)
- `email` (text)
- `name` (text)
- `avatar_url` (text, nullable)
- `created_at`, `updated_at` (timestamps)

### campaigns
- `id` (uuid, PK)
- `title`, `description` (text)
- `category`, `country`, `city` (text)
- `goal_amount`, `amount_raised` (numeric)
- `currency` (text, default 'USD')
- `deadline` (timestamp, nullable)
- `main_image` (text, nullable)
- `creator_id` (uuid, FK to profiles)
- `status` (active/completed/cancelled)
- `created_at`, `updated_at` (timestamps)

### donations
- `id` (uuid, PK)
- `campaign_id` (uuid, FK to campaigns)
- `user_id` (uuid, FK to profiles, nullable)
- `amount` (numeric)
- `currency` (text)
- `payment_intent_id` (text, unique)
- `status` (pending/completed/failed/refunded)
- `donor_name`, `donor_email` (text)
- `anonymous` (boolean)
- `message` (text, nullable)
- `created_at` (timestamp)

## Security

### Row Level Security (RLS)

All tables have RLS enabled with secure policies:

**Profiles:**
- Anyone can view profiles
- Users can only update their own profile

**Campaigns:**
- Anyone can view active campaigns
- Authenticated users can create campaigns
- Creators can update/delete their own campaigns

**Donations:**
- Anyone can view completed donations
- Users can view their own donations
- Donations automatically update campaign amounts

### Authentication

- JWT tokens managed by Supabase Auth
- Protected routes require authentication
- Session stored securely
- Auto-refresh on token expiry

## User Flow

### 1. Sign Up / Login
- Users register with email and password
- Profile automatically created
- Redirected to dashboard

### 2. Browse Campaigns
- View all active campaigns
- Search and filter by category/location
- View campaign details and donations

### 3. Create Campaign
- Fill campaign details (title, description, goal)
- Select category and location
- Set deadline (optional)
- Upload campaign image
- Campaign goes live immediately

### 4. Make Donation
- Select amount to donate
- Enter donor information
- Process payment via Stripe
- Donation recorded in database
- Campaign amount_raised updated automatically

### 5. Manage Dashboard
- View your campaigns
- See donation statistics
- Track campaign performance
- Edit or delete campaigns

## Testing

### Test Stripe Payments

Use these test card numbers in development:

- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **3D Secure:** 4000 0027 6000 3184

Use any future expiry date, any 3-digit CVV, and any postal code.

### Test User Accounts

Create test accounts through the signup page. All data is stored in your Supabase project.

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173
```

### Supabase Connection Issues
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Check Supabase project status
- Ensure RLS policies are correctly set

### Stripe Payment Errors
- Verify STRIPE_SECRET_KEY is set in Supabase Edge Functions
- Check VITE_STRIPE_PUBLISHABLE_KEY in .env
- Ensure you're using test mode keys

### Build Errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## Deployment

### Frontend (Netlify/Vercel)

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder to your hosting provider

3. Set environment variables in hosting dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STRIPE_PUBLISHABLE_KEY`

### Backend

The backend is already deployed:
- Supabase handles database, auth, and Edge Functions
- No additional backend deployment needed
- Edge Functions auto-deployed to Supabase

## Support

For issues or questions:
- Check Supabase logs in dashboard
- Review Stripe webhook logs
- Check browser console for errors
- Verify all environment variables are set

## License

This project is open source and available under the MIT License.
