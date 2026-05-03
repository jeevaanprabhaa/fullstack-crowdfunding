import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService } from '../services/auth.service';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: User | null;
  session: { user: User } | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { name?: string; avatar_url?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    authService.getCurrentUser().then(u => {
      if (mounted) {
        setUser(u || null);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const result = await authService.register({ email, password, name });
      setUser(result.user);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authService.login({ email, password });
      setUser(result.user);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateProfile = async (updates: { name?: string; avatar_url?: string }) => {
    const updated = await authService.updateProfile(updates);
    setUser(updated);
  };

  const session = user ? { user } : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user,
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
