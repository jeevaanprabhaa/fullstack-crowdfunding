import { getAuthHeaders } from './auth.service';

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';

export interface Donation {
  id: string;
  campaign_id: string;
  user_id: string | null;
  amount: number;
  currency: string;
  payment_intent_id: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  donor_name: string;
  donor_email: string;
  anonymous: boolean;
  message: string | null;
  created_at: string;
  campaign?: {
    id: string;
    title: string;
  };
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface CreateDonationData {
  campaign_id: string;
  amount: number;
  currency: string;
  payment_intent_id: string;
  donor_name: string;
  donor_email: string;
  anonymous?: boolean;
  message?: string;
  user_id?: string | null;
}

async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export const donationsService = {
  async createDonation(donationData: CreateDonationData): Promise<Donation> {
    const json = await apiFetch(`${API_BASE}/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(donationData),
    });
    return json.data;
  },

  async updateDonationStatus(
    paymentIntentId: string,
    status: 'completed' | 'failed' | 'refunded'
  ): Promise<Donation> {
    const json = await apiFetch(`${API_BASE}/donations/payment-intent/${paymentIntentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return json.data;
  },

  async getDonationsByUser(userId: string): Promise<Donation[]> {
    const json = await apiFetch(`${API_BASE}/donations/user/${userId}`, {
      headers: { ...getAuthHeaders() },
    });
    return json.data || [];
  },

  async getDonationsByCampaign(campaignId: string): Promise<Donation[]> {
    const json = await apiFetch(`${API_BASE}/donations/campaign/${campaignId}`);
    return json.data || [];
  },

  async getTotalDonationsByUser(userId: string): Promise<number> {
    const donations = await this.getDonationsByUser(userId);
    return donations
      .filter(d => d.status === 'completed')
      .reduce((total, d) => total + Number(d.amount), 0);
  },

  async getDonationStats(campaignId: string) {
    const donations = await this.getDonationsByCampaign(campaignId);
    return {
      totalDonations: donations.length,
      totalAmount: donations.reduce((sum, d) => sum + Number(d.amount), 0),
      pendingDonations: 0,
    };
  },
};
