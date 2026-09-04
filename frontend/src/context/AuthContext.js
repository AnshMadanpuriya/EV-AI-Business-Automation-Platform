import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load — check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('ev_token');
    const saved  = localStorage.getItem('ev_user');
    if (token && saved) {
      setUser(JSON.parse(saved));
      // Verify token with backend
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => { if (d.success) setUser(d.user); else logout(); })
        .catch(() => {
          // Backend not running — keep local user for demo
          console.log('Backend offline — using cached user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // LOGIN → calls POST /api/auth/login → saves to MongoDB
  const login = async (email, password) => {
    const res  = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw { response: { data } };
    localStorage.setItem('ev_token', data.token);
    localStorage.setItem('ev_user',  JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  // REGISTER → calls POST /api/auth/register → saves to MongoDB
  const register = async (name, email, password, company) => {
    const res  = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, company }),
    });
    const data = await res.json();
    if (!data.success) throw { response: { data } };
    localStorage.setItem('ev_token', data.token);
    localStorage.setItem('ev_user',  JSON.stringify(data.user));
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
