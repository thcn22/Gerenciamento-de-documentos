import React, { createContext, useContext, useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  role?: 'reader' | 'reviewer' | 'approver' | 'admin';
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isApprover?: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'docmanager_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      
      if (storedToken) {
        setToken(storedToken);
        await fetchCurrentUser(storedToken);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear invalid token
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          throw new Error('Invalid user data');
        }
      } else {
        throw new Error('Failed to fetch user');
      }
    } catch (error) {
      console.error('Fetch user error:', error);
      // Clear invalid token
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success && data.token && data.user) {
        const authToken = data.token;
        
        // Store token
        localStorage.setItem(TOKEN_KEY, authToken);
        setToken(authToken);
        setUser(data.user);

        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Erro no login' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Erro de conexão' };
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name })
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Erro no cadastro' };
      }
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Erro de conexão' };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    
    // Optional: call logout endpoint
    fetch('/api/auth/logout', { method: 'POST' }).catch(console.error);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
  isAdmin: !!user?.isAdmin || user?.role === 'admin',
  isApprover: user?.role === 'approver' || !!user?.isAdmin,
    loading,
    login,
    register,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper hook for API calls with auth
export const useAuthenticatedFetch = () => {
  const { token } = useAuth();

  const authenticatedFetch = (url: string, options: RequestInit = {}) => {
    // Start with provided headers but avoid forcing Content-Type for FormData
    const headers = new Headers(options.headers as any);

    // Attach auth header if present
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Only set JSON Content-Type when body exists and is NOT FormData
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (!isFormData && options.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  return authenticatedFetch;
};
