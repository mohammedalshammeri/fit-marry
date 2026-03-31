import React, { createContext, useState, useContext, useEffect } from 'react';
import { getItem, setItem, deleteItem } from '../utils/storage';
import api from '../services/api';
import type { AuthUser } from '../types';

interface AuthContextProps {
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string, userData: AuthUser, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext({} as AuthContextProps);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await getItem('token');
      const userData = await getItem('user');
      
      if (token && userData) {
        setUser(JSON.parse(userData) as AuthUser);
        // Configure axios default
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.error("Auth Load Error", e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string, userData: AuthUser, refreshToken?: string) => {
    await setItem('token', token);
    if (refreshToken) {
      await setItem('refreshToken', refreshToken);
    }
    await setItem('user', JSON.stringify(userData));
    setUser(userData);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = async () => {
    await deleteItem('token');
    await deleteItem('refreshToken');
    await deleteItem('user');
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
