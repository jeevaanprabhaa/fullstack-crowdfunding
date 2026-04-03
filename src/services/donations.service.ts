import { supabase } from '../config/supabase';

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
}

export const donationsService = {
  async createDonation(donationData: CreateDonationData): Promise<Donation> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('donations')
      .insert({
        ...donationData,
        user_id: user?.id || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateDonationStatus(
    paymentIntentId: string,
    status: 'completed' | 'failed' | 'refunded'
  ): Promise<Donation> {
    const { data, error } = await supabase
      .from('donations')
      .update({ status })
      .eq('payment_intent_id', paymentIntentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getDonationsByUser(userId: string): Promise<Donation[]> {
    const { data, error } = await supabase
      .from('donations')
      .select(`
        *,
        campaign:campaigns(id, title)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getDonationsByCampaign(campaignId: string): Promise<Donation[]> {
    const { data, error } = await supabase
      .from('donations')
      .select(`
        *,
        user:profiles(id, name, avatar_url)
      `)
      .eq('campaign_id', campaignId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getDonationById(id: string): Promise<Donation> {
    const { data, error } = await supabase
      .from('donations')
      .select(`
        *,
        campaign:campaigns(id, title),
        user:profiles(id, name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getTotalDonationsByUser(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('donations')
      .select('amount')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (error) throw error;

    return (data || []).reduce((total, donation) => total + Number(donation.amount), 0);
  },

  async getDonationStats(campaignId: string) {
    const { data, error } = await supabase
      .from('donations')
      .select('amount, status')
      .eq('campaign_id', campaignId);

    if (error) throw error;

    const donations = data || [];
    const completed = donations.filter(d => d.status === 'completed');

    return {
      totalDonations: completed.length,
      totalAmount: completed.reduce((sum, d) => sum + Number(d.amount), 0),
      pendingDonations: donations.filter(d => d.status === 'pending').length,
    };
  },
};
