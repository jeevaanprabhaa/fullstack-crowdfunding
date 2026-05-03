import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const app = express();
const PORT = process.env.PORT || 3001;

const isProduction = process.env.NODE_ENV === 'production';

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

// ── Mongoose Schemas ─────────────────────────────────────────────────────────

const profileSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  password_hash: { type: String, required: true },
  avatar_url: { type: String, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const campaignSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  country: { type: String, required: true },
  city: { type: String, default: null },
  goal_amount: { type: Number, required: true, min: 0.01 },
  amount_raised: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'USD' },
  deadline: { type: Date, default: null },
  main_image: { type: String, default: null },
  creator_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const donationSchema = new mongoose.Schema({
  campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, default: 'USD' },
  payment_intent_id: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  donor_name: { type: String, required: true },
  donor_email: { type: String, required: true },
  anonymous: { type: Boolean, default: false },
  message: { type: String, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// Auto-update campaign amount_raised when donation status changes to completed/refunded
donationSchema.post('findOneAndUpdate', async function(doc) {
  if (!doc) return;
  try {
    if (doc.status === 'completed') {
      await mongoose.model('Campaign').findByIdAndUpdate(doc.campaign_id, {
        $inc: { amount_raised: doc.amount }
      });
    } else if (doc.status === 'refunded') {
      const campaign = await mongoose.model('Campaign').findById(doc.campaign_id);
      if (campaign) {
        await mongoose.model('Campaign').findByIdAndUpdate(doc.campaign_id, {
          $set: { amount_raised: Math.max(0, campaign.amount_raised - doc.amount) }
        });
      }
    }
  } catch (err) {
    console.error('Error updating campaign amount_raised:', err);
  }
});

const Profile = mongoose.model('Profile', profileSchema);
const Campaign = mongoose.model('Campaign', campaignSchema);
const Donation = mongoose.model('Donation', donationSchema);

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatProfile(p) {
  if (!p) return null;
  const obj = p.toObject ? p.toObject() : p;
  return {
    id: obj._id.toString(),
    email: obj.email,
    name: obj.name,
    avatar_url: obj.avatar_url,
    created_at: obj.created_at,
    updated_at: obj.updated_at,
  };
}

function formatCampaign(c) {
  if (!c) return null;
  const obj = c.toObject ? c.toObject() : c;
  const creator = obj.creator_id && typeof obj.creator_id === 'object' && obj.creator_id.name
    ? {
        id: obj.creator_id._id.toString(),
        name: obj.creator_id.name,
        email: obj.creator_id.email,
        avatar_url: obj.creator_id.avatar_url,
      }
    : null;
  return {
    id: obj._id.toString(),
    title: obj.title,
    description: obj.description,
    category: obj.category,
    country: obj.country,
    city: obj.city,
    goal_amount: obj.goal_amount,
    amount_raised: obj.amount_raised,
    currency: obj.currency,
    deadline: obj.deadline,
    main_image: obj.main_image,
    creator_id: obj.creator_id?._id?.toString() || obj.creator_id?.toString(),
    status: obj.status,
    created_at: obj.created_at,
    updated_at: obj.updated_at,
    creator,
  };
}

function formatDonation(d) {
  if (!d) return null;
  const obj = d.toObject ? d.toObject() : d;
  const campaign = obj.campaign_id && typeof obj.campaign_id === 'object' && obj.campaign_id.title
    ? { id: obj.campaign_id._id.toString(), title: obj.campaign_id.title }
    : null;
  const user = obj.user_id && typeof obj.user_id === 'object' && obj.user_id.name
    ? { id: obj.user_id._id.toString(), name: obj.user_id.name, avatar_url: obj.user_id.avatar_url }
    : null;
  return {
    id: obj._id.toString(),
    campaign_id: obj.campaign_id?._id?.toString() || obj.campaign_id?.toString(),
    user_id: obj.user_id?._id?.toString() || obj.user_id?.toString() || null,
    amount: obj.amount,
    currency: obj.currency,
    payment_intent_id: obj.payment_intent_id,
    status: obj.status,
    donor_name: obj.donor_name,
    donor_email: obj.donor_email,
    anonymous: obj.anonymous,
    message: obj.message,
    created_at: obj.created_at,
    campaign,
    user,
  };
}

// ── Auth Middleware ───────────────────────────────────────────────────────────

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

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Auth: Register
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Missing required fields' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const existing = await Profile.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const password_hash = await bcrypt.hash(password, 10);
    const profile = await Profile.create({ email, name, password_hash });
    const user = formatProfile(profile);
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const profile = await Profile.findOne({ email: email.toLowerCase() });
    if (!profile) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, profile.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const user = formatProfile(profile);
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Auth: Me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json({ user: formatProfile(profile) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth: Update Profile
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  const { name, avatar_url } = req.body;
  try {
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    const profile = await Profile.findByIdAndUpdate(req.user.id, updates, { new: true });
    res.json({ user: formatProfile(profile) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Campaigns: List (with optional filter)
app.get('/api/campaigns', async (req, res) => {
  const { category, search } = req.query;
  try {
    const filter = { status: 'active' };
    if (category) filter.category = category;
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
    const campaigns = await Campaign.find(filter)
      .populate('creator_id', 'name email avatar_url')
      .sort({ created_at: -1 });
    res.json({ data: campaigns.map(formatCampaign) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Campaigns: Get by creator — must come BEFORE /:id
app.get('/api/campaigns/creator/:creatorId', async (req, res) => {
  try {
    const campaigns = await Campaign.find({ creator_id: req.params.creatorId })
      .populate('creator_id', 'name email avatar_url')
      .sort({ created_at: -1 });
    res.json({ data: campaigns.map(formatCampaign) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Campaigns: Get by ID
app.get('/api/campaigns/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('creator_id', 'name email avatar_url');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ data: formatCampaign(campaign) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Campaigns: Create
app.post('/api/campaigns', authMiddleware, async (req, res) => {
  const { title, description, category, country, city, goal_amount, currency, deadline, main_image } = req.body;
  if (!title || !description || !category || !country || !goal_amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const campaign = await Campaign.create({
      title, description, category, country,
      city: city || null,
      goal_amount,
      currency: currency || 'USD',
      deadline: deadline || null,
      main_image: main_image || null,
      creator_id: req.user.id,
    });
    const full = await Campaign.findById(campaign._id).populate('creator_id', 'name email avatar_url');
    res.status(201).json({ data: formatCampaign(full) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Campaigns: Update
app.put('/api/campaigns/:id', authMiddleware, async (req, res) => {
  const { title, description, category, country, city, goal_amount, currency, deadline, main_image, status } = req.body;
  try {
    const existing = await Campaign.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    if (existing.creator_id.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (country !== undefined) updates.country = country;
    if (city !== undefined) updates.city = city;
    if (goal_amount !== undefined) updates.goal_amount = goal_amount;
    if (currency !== undefined) updates.currency = currency;
    if (deadline !== undefined) updates.deadline = deadline;
    if (main_image !== undefined) updates.main_image = main_image;
    if (status !== undefined) updates.status = status;

    const campaign = await Campaign.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('creator_id', 'name email avatar_url');
    res.json({ data: formatCampaign(campaign) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Campaigns: Delete
app.delete('/api/campaigns/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await Campaign.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    if (existing.creator_id.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Donations: Create
app.post('/api/donations', async (req, res) => {
  const { campaign_id, amount, currency, payment_intent_id, donor_name, donor_email, anonymous, message, user_id } = req.body;
  if (!campaign_id || !amount || !currency || !payment_intent_id || !donor_name || !donor_email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const donation = await Donation.create({
      campaign_id,
      user_id: user_id || null,
      amount,
      currency,
      payment_intent_id,
      donor_name,
      donor_email,
      anonymous: anonymous || false,
      message: message || null,
    });
    res.status(201).json({ data: formatDonation(donation) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Donations: Update status by payment intent — must come BEFORE /user/:userId and /campaign/:campaignId
app.put('/api/donations/payment-intent/:paymentIntentId', async (req, res) => {
  const { status } = req.body;
  try {
    const prevDonation = await Donation.findOne({ payment_intent_id: req.params.paymentIntentId });
    if (!prevDonation) return res.status(404).json({ error: 'Donation not found' });

    const prevStatus = prevDonation.status;
    const donation = await Donation.findOneAndUpdate(
      { payment_intent_id: req.params.paymentIntentId },
      { status },
      { new: true }
    );

    // Update campaign amount_raised manually since post hook needs new status
    if (status === 'completed' && prevStatus !== 'completed') {
      await Campaign.findByIdAndUpdate(donation.campaign_id, { $inc: { amount_raised: donation.amount } });
    } else if (status === 'refunded' && prevStatus === 'completed') {
      const campaign = await Campaign.findById(donation.campaign_id);
      if (campaign) {
        await Campaign.findByIdAndUpdate(donation.campaign_id, {
          $set: { amount_raised: Math.max(0, campaign.amount_raised - donation.amount) }
        });
      }
    }

    res.json({ data: formatDonation(donation) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Donations: By user
app.get('/api/donations/user/:userId', authMiddleware, async (req, res) => {
  if (req.user.id !== req.params.userId) return res.status(403).json({ error: 'Forbidden' });
  try {
    const donations = await Donation.find({ user_id: req.params.userId })
      .populate('campaign_id', 'title')
      .sort({ created_at: -1 });
    res.json({ data: donations.map(formatDonation) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Donations: By campaign
app.get('/api/donations/campaign/:campaignId', async (req, res) => {
  try {
    const donations = await Donation.find({ campaign_id: req.params.campaignId, status: 'completed' })
      .populate('user_id', 'name avatar_url')
      .sort({ created_at: -1 });
    res.json({ data: donations.map(formatDonation) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stripe: Create Payment Intent
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

// ── Connect & Start ───────────────────────────────────────────────────────────

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
