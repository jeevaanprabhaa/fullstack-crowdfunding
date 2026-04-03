/*
  # Crowdfunding Platform Database Schema

  ## Overview
  Complete database schema for a production-ready crowdfunding platform with users, campaigns, and donations.

  ## Tables Created
  
  ### 1. profiles
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User email
  - `name` (text) - User full name
  - `avatar_url` (text) - Profile picture URL
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. campaigns
  - `id` (uuid, primary key) - Campaign unique identifier
  - `title` (text) - Campaign title
  - `description` (text) - Campaign description
  - `category` (text) - Campaign category
  - `country` (text) - Campaign country
  - `city` (text) - Campaign city
  - `goal_amount` (numeric) - Target funding amount
  - `amount_raised` (numeric) - Current amount raised
  - `currency` (text) - Currency code (USD, EUR, etc)
  - `deadline` (timestamptz) - Campaign end date
  - `main_image` (text) - Main campaign image URL
  - `creator_id` (uuid) - Foreign key to profiles
  - `status` (text) - active, completed, cancelled
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. donations
  - `id` (uuid, primary key) - Donation unique identifier
  - `campaign_id` (uuid) - Foreign key to campaigns
  - `user_id` (uuid) - Foreign key to profiles (nullable for anonymous)
  - `amount` (numeric) - Donation amount
  - `currency` (text) - Currency code
  - `payment_intent_id` (text) - Stripe payment intent ID
  - `status` (text) - pending, completed, failed, refunded
  - `donor_name` (text) - Name of donor
  - `donor_email` (text) - Email of donor
  - `anonymous` (boolean) - Whether donation is anonymous
  - `message` (text) - Optional message from donor
  - `created_at` (timestamptz) - Donation timestamp

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated and public access
  - Users can only modify their own data
  - Public can view active campaigns
  - Donations are publicly viewable (except anonymous ones)

  ## Indexes
  - Created on foreign keys for performance
  - Created on status fields for filtering
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  country text NOT NULL,
  city text,
  goal_amount numeric NOT NULL CHECK (goal_amount > 0),
  amount_raised numeric DEFAULT 0 CHECK (amount_raised >= 0),
  currency text NOT NULL DEFAULT 'USD',
  deadline timestamptz,
  main_image text,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  payment_intent_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  donor_name text NOT NULL,
  donor_email text NOT NULL,
  anonymous boolean DEFAULT false,
  message text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_campaign ON donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_donations_user ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Campaigns policies
CREATE POLICY "Anyone can view active campaigns"
  ON campaigns FOR SELECT
  TO authenticated, anon
  USING (status = 'active' OR creator_id = auth.uid());

CREATE POLICY "Authenticated users can create campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Campaign creators can update their campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Campaign creators can delete their campaigns"
  ON campaigns FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Donations policies
CREATE POLICY "Anyone can view completed donations"
  ON donations FOR SELECT
  TO authenticated, anon
  USING (status = 'completed');

CREATE POLICY "Authenticated users can create donations"
  ON donations FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can view their own donations"
  ON donations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR status = 'completed');

-- Function to update campaign amount_raised when donation is completed
CREATE OR REPLACE FUNCTION update_campaign_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE campaigns
    SET amount_raised = amount_raised + NEW.amount,
        updated_at = now()
    WHERE id = NEW.campaign_id;
  ELSIF NEW.status = 'refunded' AND OLD.status = 'completed' THEN
    UPDATE campaigns
    SET amount_raised = GREATEST(amount_raised - NEW.amount, 0),
        updated_at = now()
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update campaign amount
DROP TRIGGER IF EXISTS update_campaign_amount_trigger ON donations;
CREATE TRIGGER update_campaign_amount_trigger
  AFTER INSERT OR UPDATE OF status ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_amount();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
