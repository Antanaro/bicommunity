import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { api } from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface RegisterResponse {
  message?: string;
  token?: string;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<RegisterResponse | undefined>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, user: newUser } = response.data;

      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } catch (error: any) {
      // Пробрасываем ошибку дальше для обработки в компоненте
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      
      // После регистрации токен не выдается, нужно подтвердить email
      // Возвращаем сообщение для отображения пользователю
      if (response.data.message) {
        // Не устанавливаем токен и пользователя, так как email не подтвержден
        return response.data;
      }
      
      // Если по какой-то причине токен все же пришел (для обратной совместимости)
      const { token: newToken, user: newUser } = response.data;
      if (newToken && newUser) {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      }
    } catch (error: any) {
      // Пробрасываем ошибку дальше для обработки в компоненте
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
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
