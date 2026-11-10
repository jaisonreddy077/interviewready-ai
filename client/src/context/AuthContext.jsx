import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!localStorage.getItem('ir_token')) {
      setLoading(false);
      return;
    }
    api.get('/auth/me').then(({ data }) => {
      if (active) setUser(data.user);
    }).catch((error) => {
      if (error.response?.status === 401) localStorage.removeItem('ir_token');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  function acceptSession(data) {
    localStorage.setItem('ir_token', data.token);
    setUser(data.user);
  }

  function signOut() {
    localStorage.removeItem('ir_token');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, acceptSession, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
