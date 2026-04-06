import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3001;

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map(o => o.trim().replace(/\/$/, ''))
  : [];

app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = origin ? origin.replace(/\/$/, '') : origin;
    if (!normalizedOrigin || !isProduction || allowedOrigins.length === 0 || allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json());

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      country TEXT NOT NULL,
      city TEXT,
      goal_amount NUMERIC NOT NULL CHECK (goal_amount > 0),
      amount_raised NUMERIC DEFAULT 0 CHECK (amount_raised >= 0),
      currency TEXT NOT NULL DEFAULT 'USD',
      deadline TIMESTAMPTZ,
      main_image TEXT,
      creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS donations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      amount NUMERIC NOT NULL CHECK (amount > 0),
      currency TEXT NOT NULL DEFAULT 'USD',
      payment_intent_id TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
      donor_name TEXT NOT NULL,
      donor_email TEXT NOT NULL,
      anonymous BOOLEAN DEFAULT false,
      message TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator_id);
    CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
    CREATE INDEX IF NOT EXISTS idx_donations_campaign ON donations(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_donations_user ON donations(user_id);
    CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);

    CREATE OR REPLACE FUNCTION update_campaign_amount()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE campaigns SET amount_raised = amount_raised + NEW.amount, updated_at = now() WHERE id = NEW.campaign_id;
      ELSIF NEW.status = 'refunded' AND OLD.status = 'completed' THEN
        UPDATE campaigns SET amount_raised = GREATEST(amount_raised - NEW.amount, 0), updated_at = now() WHERE id = NEW.campaign_id;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS update_campaign_amount_trigger ON donations;
    CREATE TRIGGER update_campaign_amount_trigger
      AFTER INSERT OR UPDATE OF status ON donations
      FOR EACH ROW EXECUTE FUNCTION update_campaign_amount();
  `);
  console.log('Database initialized');
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing required fields' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const existing = await pool.query('SELECT id FROM profiles WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO profiles (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, avatar_url, created_at, updated_at',
      [email, name, passwordHash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const result = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, avatar_url, created_at, updated_at FROM profiles WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  const { name, avatar_url } = req.body;
  try {
    const result = await pool.query(
      'UPDATE profiles SET name = COALESCE($1, name), avatar_url = COALESCE($2, avatar_url), updated_at = now() WHERE id = $3 RETURNING id, email, name, avatar_url, created_at, updated_at',
      [name, avatar_url, req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const CAMPAIGN_SELECT = `
  SELECT c.*, 
    json_build_object('id', p.id, 'name', p.name, 'email', p.email, 'avatar_url', p.avatar_url) AS creator
  FROM campaigns c
  LEFT JOIN profiles p ON p.id = c.creator_id
`;

app.get('/api/campaigns', async (req, res) => {
  const { category, search } = req.query;
  try {
    let q = CAMPAIGN_SELECT + ` WHERE c.status = 'active'`;
    const params = [];
    if (category) { params.push(category); q += ` AND c.category = $${params.length}`; }
    if (search) { params.push(`%${search}%`); q += ` AND (c.title ILIKE $${params.length} OR c.description ILIKE $${params.length})`; }
    q += ' ORDER BY c.created_at DESC';
    const result = await pool.query(q, params);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const result = await pool.query(CAMPAIGN_SELECT + ' WHERE c.id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/campaigns/creator/:creatorId', async (req, res) => {
  try {
    const result = await pool.query(
      CAMPAIGN_SELECT + ' WHERE c.creator_id = $1 ORDER BY c.created_at DESC',
      [req.params.creatorId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns', authMiddleware, async (req, res) => {
  const { title, description, category, country, city, goal_amount, currency, deadline, main_image } = req.body;
  if (!title || !description || !category || !country || !goal_amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO campaigns (title, description, category, country, city, goal_amount, currency, deadline, main_image, creator_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [title, description, category, country, city || null, goal_amount, currency || 'USD', deadline || null, main_image || null, req.user.id]
    );
    const campaign = result.rows[0];
    const full = await pool.query(CAMPAIGN_SELECT + ' WHERE c.id = $1', [campaign.id]);
    res.status(201).json({ data: full.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/campaigns/:id', authMiddleware, async (req, res) => {
  const { title, description, category, country, city, goal_amount, currency, deadline, main_image, status } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    if (existing.rows[0].creator_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await pool.query(
      `UPDATE campaigns SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        country = COALESCE($4, country),
        city = COALESCE($5, city),
        goal_amount = COALESCE($6, goal_amount),
        currency = COALESCE($7, currency),
        deadline = COALESCE($8, deadline),
        main_image = COALESCE($9, main_image),
        status = COALESCE($10, status),
        updated_at = now()
       WHERE id = $11`,
      [title, description, category, country, city, goal_amount, currency, deadline, main_image, status, req.params.id]
    );
    const full = await pool.query(CAMPAIGN_SELECT + ' WHERE c.id = $1', [req.params.id]);
    res.json({ data: full.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/campaigns/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await pool.query('SELECT creator_id FROM campaigns WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Campaign not found' });
    if (existing.rows[0].creator_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await pool.query('DELETE FROM campaigns WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/donations', async (req, res) => {
  const { campaign_id, amount, currency, payment_intent_id, donor_name, donor_email, anonymous, message, user_id } = req.body;
  if (!campaign_id || !amount || !currency || !payment_intent_id || !donor_name || !donor_email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO donations (campaign_id, user_id, amount, currency, payment_intent_id, donor_name, donor_email, anonymous, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [campaign_id, user_id || null, amount, currency, payment_intent_id, donor_name, donor_email, anonymous || false, message || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/donations/payment-intent/:paymentIntentId', async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE donations SET status = $1 WHERE payment_intent_id = $2 RETURNING *',
      [status, req.params.paymentIntentId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Donation not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/donations/user/:userId', authMiddleware, async (req, res) => {
  if (req.user.id !== req.params.userId) return res.status(403).json({ error: 'Forbidden' });
  try {
    const result = await pool.query(
      `SELECT d.*, json_build_object('id', c.id, 'title', c.title) AS campaign
       FROM donations d LEFT JOIN campaigns c ON c.id = d.campaign_id
       WHERE d.user_id = $1 ORDER BY d.created_at DESC`,
      [req.params.userId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/donations/campaign/:campaignId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, json_build_object('id', p.id, 'name', p.name, 'avatar_url', p.avatar_url) AS user
       FROM donations d LEFT JOIN profiles p ON p.id = d.user_id
       WHERE d.campaign_id = $1 AND d.status = 'completed' ORDER BY d.created_at DESC`,
      [req.params.campaignId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/create-payment-intent', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to enable payments.' });
  try {
    const { amount, currency, campaignId, donorEmail, donorName } = req.body;
    if (!amount || !currency || !campaignId || !donorEmail || !donorName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const amountInCents = Math.round(amount * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: { campaignId, donorEmail, donorName },
      receipt_email: donorEmail,
    });
    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    console.error('Error creating payment intent:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
