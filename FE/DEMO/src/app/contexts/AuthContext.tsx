import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { ApiUser } from '../lib/contracts';

const SESSION_KEY = 'seongon.session';

type StoredSession = { token: string };

interface AuthContextType {
  user: ApiUser | null;
  token: string | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<ApiUser>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<ApiUser>;
  refreshUser: () => Promise<ApiUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStoredSession(): StoredSession | null {
  try {
    const value = localStorage.getItem(SESSION_KEY);
    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value) as Partial<StoredSession>;
    return typeof parsed.token === 'string' && parsed.token ? { token: parsed.token } : null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const saveSession = (nextToken: string, nextUser: ApiUser) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: nextToken }));
    setToken(nextToken);
    setUser(nextUser);
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const session = readStoredSession();
    if (!session) {
      setIsReady(true);
      return;
    }

    api.me(session.token)
      .then(({ data }) => saveSession(session.token, data))
      .catch(clearSession)
      .finally(() => setIsReady(true));
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    token,
    isReady,
    login: async (email, password) => {
      const result = await api.login({ email, password });
      saveSession(result.token, result.user);
      return result.user;
    },
    register: async (name, email, password, passwordConfirmation) => {
      const result = await api.register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      saveSession(result.token, result.user);
      return result.user;
    },
    refreshUser: async () => {
      if (!token) {
        return null;
      }

      try {
        const { data } = await api.me(token);
        setUser(data);
        return data;
      } catch (error) {
        clearSession();
        throw error;
      }
    },
    logout: async () => {
      try {
        if (token) {
          await api.logout(token);
        }
      } finally {
        clearSession();
      }
    },
  }), [isReady, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
