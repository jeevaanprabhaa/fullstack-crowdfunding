import { getAuthHeaders } from './auth.service';

const API_BASE = '/api';

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

async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

export const campaignsService = {
  async getAllCampaigns(): Promise<Campaign[]> {
    const json = await apiFetch(`${API_BASE}/campaigns`);
    return json.data || [];
  },

  async getCampaignById(id: string): Promise<Campaign> {
    const json = await apiFetch(`${API_BASE}/campaigns/${id}`);
    return json.data;
  },

  async getCampaignsByCreator(creatorId: string): Promise<Campaign[]> {
    const json = await apiFetch(`${API_BASE}/campaigns/creator/${creatorId}`);
    return json.data || [];
  },

  async createCampaign(campaignData: CreateCampaignData): Promise<Campaign> {
    const json = await apiFetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(campaignData),
    });
    return json.data;
  },

  async updateCampaign(id: string, updates: Partial<CreateCampaignData & { status: string }>): Promise<Campaign> {
    const json = await apiFetch(`${API_BASE}/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(updates),
    });
    return json.data;
  },

  async deleteCampaign(id: string): Promise<void> {
    await apiFetch(`${API_BASE}/campaigns/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
  },

  async searchCampaigns(query: string): Promise<Campaign[]> {
    const json = await apiFetch(`${API_BASE}/campaigns?search=${encodeURIComponent(query)}`);
    return json.data || [];
  },

  async getCampaignsByCategory(category: string): Promise<Campaign[]> {
    const json = await apiFetch(`${API_BASE}/campaigns?category=${encodeURIComponent(category)}`);
    return json.data || [];
  },

  async uploadCampaignImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Upload failed');
    return json.url;
  },
};
