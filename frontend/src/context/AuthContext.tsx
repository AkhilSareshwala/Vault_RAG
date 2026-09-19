import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserPersona, UserRole } from '../types';
import { login as apiLogin } from '../api/client';

export const DEMO_PERSONAS: Record<string, UserPersona> = {
  dave: {
    username: 'dave',
    name: 'Dave Agent',
    role: 'support_agent',
    title: 'Support Agent',
    description: 'Can only view & resolve own assigned customer tickets (PostgreSQL RLS)',
    avatarColor: '#06b6d4',
    badgeBg: 'rgba(6, 182, 212, 0.15)',
    badgeText: '#38bdf8',
  },
  erin: {
    username: 'erin',
    name: 'Erin Supervisor',
    role: 'supervisor',
    title: 'Supervisor',
    description: 'Supervisory role with expanded ticket oversight & approval authority',
    avatarColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeText: '#fbbf24',
  },
  frank: {
    username: 'frank',
    name: 'Frank Admin',
    role: 'admin',
    title: 'System Admin',
    description: 'Unrestricted administrative access across all ticket rows & system logs',
    avatarColor: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    badgeText: '#c084fc',
  },
};

interface AuthContextType {
  token: string | null;
  role: UserRole | null;
  userId: string | null;
  activePersona: UserPersona | null;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  loginAsPersona: (username: string) => Promise<void>;
  loginCustom: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PASSWORDS: Record<string, string> = {
  dave: 'agent123',
  erin: 'super123',
  frank: 'admin123',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('vaultrag_token'));
  const [role, setRole] = useState<UserRole | null>(
    (localStorage.getItem('vaultrag_role') as UserRole) || null
  );
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('vaultrag_user_id'));
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const activePersona: UserPersona | null = userId && DEMO_PERSONAS[userId] ? DEMO_PERSONAS[userId] : (
    userId ? {
      username: userId,
      name: userId.toUpperCase(),
      role: role || 'support_agent',
      title: 'Authenticated User',
      description: 'Custom authenticated JWT session',
      avatarColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeText: '#34d399',
    } : null
  );

  // Default auto-login as Dave if no token
  useEffect(() => {
    if (!token) {
      loginAsPersona('dave').catch(() => {
        setIsLoginModalOpen(true);
      });
    }
  }, []);

  const loginAsPersona = async (username: string) => {
    const password = PASSWORDS[username] || 'agent123';
    setLoading(true);
    try {
      const res = await apiLogin(username, password);
      setToken(res.token);
      setRole(res.role);
      setUserId(res.user_id);
      localStorage.setItem('vaultrag_token', res.token);
      localStorage.setItem('vaultrag_role', res.role);
      localStorage.setItem('vaultrag_user_id', res.user_id);
      setIsLoginModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const loginCustom = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiLogin(username, password);
      setToken(res.token);
      setRole(res.role);
      setUserId(res.user_id);
      localStorage.setItem('vaultrag_token', res.token);
      localStorage.setItem('vaultrag_role', res.role);
      localStorage.setItem('vaultrag_user_id', res.user_id);
      setIsLoginModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setUserId(null);
    localStorage.removeItem('vaultrag_token');
    localStorage.removeItem('vaultrag_role');
    localStorage.removeItem('vaultrag_user_id');
    setIsLoginModalOpen(true);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        userId,
        activePersona,
        isLoginModalOpen,
        setIsLoginModalOpen,
        loginAsPersona,
        loginCustom,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
