import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface User {
  user_id: string;
  email: string;
  first_name: string;
  photo?: string;
  bio?: string;
  languages: string[];
  phone?: string;
  gender?: string;
  birth_year?: number;
  subscription_tier: string;
  role: string;
  events_created_this_month: number;
  events_joined_this_month: number;
  created_at: string;
  is_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, phone?: string, gender?: string, birthYear?: number) => Promise<void>;
  loginWithGoogle: () => void;
  handleOAuthCallback: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`,
          },
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          await AsyncStorage.removeItem('token');
          setToken(null);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    await AsyncStorage.setItem('token', data.token);
    setToken(data.token);
    
    // Fetch full user data
    await refreshUser();
  };

  const register = async (email: string, password: string, firstName: string, phone?: string, gender?: string, birthYear?: number) => {
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password, 
        first_name: firstName, 
        phone,
        gender,
        birth_year: birthYear
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const data = await response.json();
    await AsyncStorage.setItem('token', data.token);
    setToken(data.token);
    
    await refreshUser();
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const loginWithGoogle = () => {
    // For mobile, we'll use web browser
    const redirectUrl = `${EXPO_PUBLIC_BACKEND_URL}/`;
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    // This will be handled by expo-web-browser in the component
    return authUrl;
  };

  const handleOAuthCallback = async (sessionId: string) => {
    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'OAuth callback failed');
    }

    const data = await response.json();
    await AsyncStorage.setItem('token', data.token);
    setToken(data.token);
    
    await refreshUser();
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, still clear local state
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const storedToken = await AsyncStorage.getItem('token');
    if (!storedToken) return;

    const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${storedToken}`,
      },
    });

    if (response.ok) {
      const userData = await response.json();
      setUser(userData);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        handleOAuthCallback,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
