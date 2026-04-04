import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService } from '../services/auth.service';
import { supabase } from '../config/supabase';

interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { name?: string; avatar_url?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfileSafe(userId: string): Promise<Profile | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const profileData = await fetchProfileSafe(currentSession.user.id);
          if (mounted) setProfile(profileData);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const profileData = await fetchProfileSafe(currentSession.user.id);
          if (mounted) setProfile(profileData);
        } else {
          setProfile(null);
        }
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    await authService.register({ email, password, name });
  };

  const signIn = async (email: string, password: string) => {
    await authService.login({ email, password });
  };

  const signOut = async () => {
    await authService.logout();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const updateProfile = async (updates: { name?: string; avatar_url?: string }) => {
    await authService.updateProfile(updates);
    if (user) {
      const profileData = await fetchProfileSafe(user.id);
      setProfile(profileData);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
