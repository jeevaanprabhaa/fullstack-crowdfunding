// Supabase has been removed. This file is kept for compatibility but is unused.
// The app uses Express + PostgreSQL directly via the backend API.
export const supabase = null;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          country: string;
          city: string | null;
          goal_amount: number;
          amount_raised: number;
          currency: string;
          deadline: string | null;
          main_image: string | null;
          creator_id: string;
          status: 'active' | 'completed' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          category: string;
          country: string;
          city?: string | null;
          goal_amount: number;
          amount_raised?: number;
          currency?: string;
          deadline?: string | null;
          main_image?: string | null;
          creator_id: string;
          status?: 'active' | 'completed' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          category?: string;
          country?: string;
          city?: string | null;
          goal_amount?: number;
          amount_raised?: number;
          currency?: string;
          deadline?: string | null;
          main_image?: string | null;
          status?: 'active' | 'completed' | 'cancelled';
          updated_at?: string;
        };
      };
      donations: {
        Row: {
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
        };
        Insert: {
          id?: string;
          campaign_id: string;
          user_id?: string | null;
          amount: number;
          currency?: string;
          payment_intent_id: string;
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          donor_name: string;
          donor_email: string;
          anonymous?: boolean;
          message?: string | null;
          created_at?: string;
        };
        Update: {
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          message?: string | null;
        };
      };
    };
  };
}
