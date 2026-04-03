import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';

const app = express();
const PORT = 3001;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

app.use(cors());
app.use(express.json());

app.post('/api/create-payment-intent', async (req, res) => {
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

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, 'localhost', () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
