const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

function clearToken(): void {
  localStorage.removeItem('auth_token');
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  async register(data: RegisterData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Registration failed');
    setToken(json.token);
    return json;
  },

  async login(data: LoginData) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');
    setToken(json.token);
    return json;
  },

  async logout() {
    clearToken();
  },

  async getCurrentUser() {
    const token = getToken();
    if (!token) return null;
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      clearToken();
      return null;
    }
    const json = await res.json();
    return json.user;
  },

  async updateProfile(updates: { name?: string; avatar_url?: string }) {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update profile');
    return json.user;
  },

  getToken,
  hasToken: () => !!getToken(),
};
