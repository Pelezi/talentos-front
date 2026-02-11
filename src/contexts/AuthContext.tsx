'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { authService } from '@/services/authService';
import { usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUserInfo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  const refreshUserInfo = async () => {
    const updatedUser = await authService.refreshUserInfo();
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  useEffect(() => {
    // Initialize user and refresh info on mount
    const initAuth = async () => {
      const initUser = authService.getCurrentUser();
      if (initUser) {
        setUser(initUser);
        // Refresh user info with latest permissions
        await refreshUserInfo();
      }
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  // Refresh user info when pathname changes (navigation)
  useEffect(() => {
    if (user && !isLoading) {
      refreshUserInfo();
    }
  }, [pathname]);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    return response.user;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUserInfo,
      }}
    >
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
