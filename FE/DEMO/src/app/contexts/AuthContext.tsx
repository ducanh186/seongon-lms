import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { applicationRepositories } from '../data/repositories/applicationRepositories';
import type { ApiUser } from '../lib/contracts';
import { localStorageAdapter } from '../data/adapters/LocalStorageAdapter';

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
  const parsed = localStorageAdapter.read<Partial<StoredSession>>(SESSION_KEY);
  return typeof parsed?.token === 'string' && parsed.token ? { token: parsed.token } : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const saveSession = (nextToken: string, nextUser: ApiUser) => {
    localStorageAdapter.write(SESSION_KEY, { token: nextToken });
    setToken(nextToken);
    setUser(nextUser);
  };

  const clearSession = () => {
    localStorageAdapter.remove(SESSION_KEY);
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const session = readStoredSession();
    if (!session) {
      setIsReady(true);
      return;
    }

        applicationRepositories.auth.me(session.token)
      .then(({ data }) => saveSession(session.token, data))
      .catch(clearSession)
      .finally(() => setIsReady(true));
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    token,
    isReady,
    login: async (email, password) => {
    const result = await applicationRepositories.auth.login({ email, password });
      saveSession(result.token, result.user);
      return result.user;
    },
    register: async (name, email, password, passwordConfirmation) => {
    const result = await applicationRepositories.auth.register({
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
    const { data } = await applicationRepositories.auth.me(token);
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
      await applicationRepositories.auth.logout(token);
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
