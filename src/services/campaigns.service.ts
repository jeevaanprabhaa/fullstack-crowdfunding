import { supabase } from '../config/supabase';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  category: string;
  country: string;
  city?: string | null;
  goal_amount: number;
  amount_raised: number;
  currency: string;
  deadline?: string | null;
  main_image?: string | null;
  creator_id: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface CreateCampaignData {
  title: string;
  description: string;
  category: string;
  country: string;
  city?: string;
  goal_amount: number;
  currency: string;
  deadline?: string;
  main_image?: string;
}

export const campaignsService = {
  async getAllCampaigns(): Promise<Campaign[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        creator:profiles(id, name, email, avatar_url)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getCampaignById(id: string): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        creator:profiles(id, name, email, avatar_url)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Campaign not found');
    return data;
  },

  async getCampaignsByCreator(creatorId: string): Promise<Campaign[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        creator:profiles(id, name, email, avatar_url)
      `)
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createCampaign(campaignData: CreateCampaignData): Promise<Campaign> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        ...campaignData,
        creator_id: user.id,
      })
      .select(`
        *,
        creator:profiles(id, name, email, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateCampaign(id: string, updates: Partial<CreateCampaignData>): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        creator:profiles(id, name, email, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCampaign(id: string): Promise<void> {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async searchCampaigns(query: string): Promise<Campaign[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        creator:profiles(id, name, email, avatar_url)
      `)
      .eq('status', 'active')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getCampaignsByCategory(category: string): Promise<Campaign[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        creator:profiles(id, name, email, avatar_url)
      `)
      .eq('status', 'active')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async uploadCampaignImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `campaign-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('campaigns')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('campaigns')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },
};
