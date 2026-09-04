import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ev_token');
    const savedUser = localStorage.getItem('ev_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      API.get('/auth/me').then(r => setUser(r.data.user)).catch(() => logout());
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    localStorage.setItem('ev_token', data.token);
    localStorage.setItem('ev_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password, company) => {
    const { data } = await API.post('/auth/register', { name, email, password, company });
    localStorage.setItem('ev_token', data.token);
    localStorage.setItem('ev_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('ev_token');
    localStorage.removeItem('ev_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
