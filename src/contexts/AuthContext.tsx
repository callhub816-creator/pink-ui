
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { storage } from '../../utils/storage';
import { UserProfile, SubscriptionPlan, ConnectionLevel } from '../../types';
import { GATING_CONFIG } from '../../constants';
import { useNotification } from '../../components/NotificationProvider';

type ProviderName = 'facebook' | 'google';

type AuthContextType = {
  user: any;
  profile: UserProfile;
  loading: boolean;
  syncProfile: (profile: UserProfile) => Promise<void>;
  signUp: (username: string, displayName: string, password: string) => Promise<{ error: any; data: any }>;
  signIn: (username: string, password: string) => Promise<{ error: any; data: any }>;
  signInWithProvider: (provider: ProviderName) => Promise<void>;
  signOut: () => Promise<void>;
  updateConnection: (companionId: string | number, points: number) => void;
  incrementUsage: () => number;
  refreshProfile: () => void;
  upgradeSubscription: (plan: SubscriptionPlan) => Promise<void>;
  purchaseHearts: (amount: number) => void;
  spendHearts: (amount: number) => boolean;
  sendGift: (companionId: string | number, giftId: string) => boolean;
  unlockConnectionTier: (companionId: string | number, tier: ConnectionLevel) => boolean;
  leasePersonality: (mode: string) => boolean;
  extendMessages: () => boolean;
  buyStarterPass: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// Helper for authenticated fetches
const authFetch = async (url: string, options: any = {}) => {
  const token = localStorage.getItem('auth_token');
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  return fetch(url, { ...options, headers });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile>(storage.getProfile());
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  const refreshProfile = useCallback(() => {
    setProfile(storage.getProfile());
  }, []);

  // Sync profile to DB
  const syncProfile = useCallback(async (updatedProfile: UserProfile) => {
    try {
      await authFetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData: updatedProfile })
      });
    } catch (err) {
      console.warn('Sync failed - likely guest mode');
    }
  }, []);

  // Fetch user session on load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await authFetch('/api/auth/me');
        if (res.ok) {
          const userData = await res.json();
          setUser({ id: userData.id, username: userData.username, displayName: userData.displayName });

          if (userData.profileData) {
            storage.saveProfile(userData.profileData);
            setProfile(userData.profileData);
          }
        } else if (res.status === 401) {
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      } catch (err) {
        console.debug('Auth check failed');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const signUp = async (username: string, displayName: string, password: string) => {
    setLoading(true);
    try {
      const currentProfile = storage.getProfile();
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, displayName, password, profileData: currentProfile })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');

      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      if (data.profileData) {
        storage.saveProfile(data.profileData);
        refreshProfile();
      }
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    storage.clearAllHistories();
    window.location.href = '/login';
  };

  const signInWithProvider = async (provider: ProviderName) => {
    window.location.href = `/api/auth/${provider}`;
  };

  const updateConnection = useCallback((companionId: string | number, points: number) => {
    const currentProfile = storage.getProfile();
    const currentPoints = currentProfile.connectionPoints[companionId] || 0;
    const newPoints = currentPoints + points;

    // Simplify logic for now, real thresholds in constants
    const updated = {
      ...currentProfile,
      connectionPoints: {
        ...currentProfile.connectionPoints,
        [companionId]: newPoints
      }
    };
    storage.saveProfile(updated);
    setProfile(updated);
    syncProfile(updated);
  }, [syncProfile]);

  const incrementUsage = () => {
    const current = storage.getUsage();
    const newVal = current + 1;
    storage.saveUsage(newVal);
    return newVal;
  };

  const upgradeSubscription = async (plan: SubscriptionPlan) => {
    const updated = { ...profile, subscription: plan };
    setProfile(updated);
    storage.saveProfile(updated);
    await syncProfile(updated);
  };

  const purchaseHearts = (amount: number) => {
    const updated = { ...profile, hearts: profile.hearts + amount };
    setProfile(updated);
    storage.saveProfile(updated);
    syncProfile(updated);
  };

  const spendHearts = (amount: number) => {
    if (profile.hearts < amount) return false;
    const updated = { ...profile, hearts: profile.hearts - amount };
    setProfile(updated);
    storage.saveProfile(updated);
    syncProfile(updated);
    return true;
  };

  const sendGift = (companionId: string | number, giftId: string) => {
    // Placeholder
    return true;
  };

  const unlockConnectionTier = (companionId: string | number, tier: ConnectionLevel) => {
    // Placeholder
    return true;
  };

  const leasePersonality = (mode: string) => {
    // Placeholder
    return true;
  };

  const extendMessages = () => {
    return spendHearts(50);
  };

  const buyStarterPass = async () => {
    await upgradeSubscription('starter');
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading, syncProfile, signUp, signIn, signInWithProvider, signOut,
      updateConnection, incrementUsage, refreshProfile, upgradeSubscription, purchaseHearts,
      spendHearts, sendGift, unlockConnectionTier, leasePersonality, extendMessages, buyStarterPass
    }}>
      {children}
    </AuthContext.Provider>
  );
};
