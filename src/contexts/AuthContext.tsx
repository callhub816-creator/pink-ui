import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { storage } from '../../utils/storage';
import { UserProfile, SubscriptionPlan, ConnectionLevel } from '../../types';
import { GATING_CONFIG, GIFT_ITEMS, HEARTS_PACKS } from '../../constants';
import { initiatePayment } from '../../utils/PaymentService';
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
      await fetch('/api/auth/sync', {
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
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const userData = await res.json();
          setUser({ id: userData.id, username: userData.username, displayName: userData.displayName });

          if (userData.profileData) {
            storage.saveProfile(userData.profileData);
            setProfile(userData.profileData);
          }
        }
      } catch (err) {
        console.debug('Auth check failed - likely guest mode');
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

  const signInWithProvider = async (provider: ProviderName) => {
    // Redirect to Cloudflare Auth endpoint for Google
    window.location.href = `/api/auth/${provider}`;
  };

  const updateConnection = useCallback((companionId: string | number, points: number) => {
    const currentProfile = storage.getProfile();
    const currentPoints = currentProfile.connectionPoints[companionId] || 0;
    const newPoints = currentPoints + points;

    const thresholds = GATING_CONFIG.connectionThresholds;
    let cap = thresholds.friend;

    if (currentProfile.subscription === 'plus') cap = Infinity;
    else if (currentProfile.subscription === 'core') cap = thresholds.trusted;
    else if (currentProfile.subscription === 'starter') cap = thresholds.close;

    if (newPoints > cap && currentPoints <= cap) {
      console.log("Connection cap reached for plan:", currentProfile.subscription);
    }

    storage.addConnectionPoints(companionId, points);
    const newProfile = storage.getProfile();
    setProfile(newProfile);
    syncProfile(newProfile);
  }, [syncProfile]);

  const incrementUsage = useCallback(() => {
    const count = storage.incrementMessageCount();
    const newProfile = storage.getProfile();
    setProfile(newProfile);
    syncProfile(newProfile);
    return count;
  }, [syncProfile]);

  const purchaseHearts = useCallback(async (amount: number) => {
    const pack = HEARTS_PACKS.find(p => p.hearts === amount);
    if (!pack) return;

    await initiatePayment({
      amount: pack.price,
      currency: "INR",
      name: user?.email?.split('@')[0] || "Guest User",
      description: `Purchase ${amount} Hearts (CallHub)`,
      userEmail: user?.email || "support@callhub.in",
      onSuccess: async (response: any) => {
        try {
          const verifyRes = await fetch('/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...response,
              amount: pack.hearts,
              type: 'hearts'
            })
          });

          if (verifyRes.ok) {
            storage.addHearts(amount);
            const newProfile = storage.getProfile();
            setProfile(newProfile);
            syncProfile(newProfile);
            showNotification(`Successful! Added ${amount} Hearts. ❤️`, 'hearts');
          } else {
            const errData = await verifyRes.json().catch(() => ({}));
            showNotification(`Payment verification failed: ${errData.error || 'Unknown Error'}. Please contact support.`, 'error');
          }
        } catch (err) {
          console.error("Verification error", err);
          showNotification("Verification error. Your hearts will be updated once processed.", 'info');
        }
      },
      onFailure: (err) => {
        console.error("Payment failed", err);
        showNotification("Payment was not successful. Please try again.", 'error');
      }
    });
  }, [refreshProfile, user, showNotification]);

  const spendHearts = useCallback((amount: number) => {
    const success = storage.spendHearts(amount);
    if (success) {
      const newProfile = storage.getProfile();
      setProfile(newProfile);
      syncProfile(newProfile);
    }
    return success;
  }, [syncProfile]);

  const sendGift = useCallback((companionId: string | number, giftId: string) => {
    const gift = GIFT_ITEMS.find(g => g.id === giftId);
    if (!gift) return false;

    const success = storage.spendHearts(gift.price);
    if (success) {
      storage.addConnectionPoints(companionId, gift.points);
      const newProfile = storage.getProfile();
      setProfile(newProfile);
      syncProfile(newProfile);
      return true;
    }
    return false;
  }, [syncProfile]);

  const unlockConnectionTier = useCallback((companionId: string | number, tier: ConnectionLevel) => {
    const price = tier === 'trusted' ? 50 : 25;
    if (storage.spendHearts(price)) {
      const thresholds = GATING_CONFIG.connectionThresholds;
      const targetPoints = tier === 'trusted' ? thresholds.trusted : thresholds.close;
      storage.addConnectionPoints(companionId, targetPoints - (profile.connectionPoints[companionId] || 0));
      const newProfile = storage.getProfile();
      setProfile(newProfile);
      syncProfile(newProfile);
      return true;
    }
    return false;
  }, [profile.connectionPoints, syncProfile]);

  const leasePersonality = useCallback((mode: string) => {
    if (storage.spendHearts(15)) {
      const p = storage.getProfile();
      if (!p.unlockedModes.includes(mode)) {
        p.unlockedModes.push(mode);
        storage.saveProfile(p);
      }
      setProfile(p);
      syncProfile(p);
      return true;
    }
    return false;
  }, [syncProfile]);

  const extendMessages = useCallback(() => {
    if (storage.spendHearts(5)) {
      const p = storage.getProfile();
      p.messageCountToday = Math.max(0, p.messageCountToday - 10);
      storage.saveProfile(p);
      setProfile(p);
      syncProfile(p);
      return true;
    }
    return false;
  }, [syncProfile]);

  const signOut = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      showNotification('Logged out successfully.', 'info');
    } catch (error) {
      console.error('Sign out error', error);
    } finally {
      setLoading(false);
    }
  };

  const upgradeSubscription = useCallback(async (plan: SubscriptionPlan) => {
    if (plan === 'free') return;

    // Get plan details from config
    const planDetails = GATING_CONFIG.plans[plan as keyof typeof GATING_CONFIG.plans];
    const price = (planDetails as any)?.price || 499;

    await initiatePayment({
      amount: price,
      currency: "INR",
      name: user?.email?.split('@')[0] || "Guest User",
      description: `${planDetails?.name} (AI Companion Interaction)`,
      userEmail: user?.email || "support@callhub.in",
      onSuccess: async (response: any) => {
        try {
          const verifyRes = await fetch('/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...response,
              type: 'subscription',
              plan: plan
            })
          });

          if (verifyRes.ok) {
            const p = storage.getProfile();
            p.subscription = plan;
            storage.saveProfile(p);
            setProfile(p);
            syncProfile(p);
            showNotification(`Welcome to ${planDetails?.name}! Enjoy your premium experience. ✨`, 'success');
          } else {
            const errData = await verifyRes.json().catch(() => ({}));
            showNotification(`Payment verification failed: ${errData.error || 'Unknown Error'}. Please contact support.`, 'error');
          }
        } catch (err) {
          console.error("Verification error", err);
        }
      },
      onFailure: (err) => {
        console.error("Upgrade failed", err);
        showNotification("Payment was not successful. Please try again.", 'error');
      }
    });
  }, [refreshProfile, user]);

  const buyStarterPass = useCallback(async () => {
    const price = GATING_CONFIG.plans.starter.price;

    await initiatePayment({
      amount: price,
      currency: "INR",
      name: user?.email?.split('@')[0] || "Guest User",
      description: "Starter Pass (24h AI Interaction)",
      userEmail: user?.email || "support@callhub.in",
      onSuccess: async (response: any) => {
        try {
          const verifyRes = await fetch('/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...response,
              type: 'subscription',
              plan: 'starter'
            })
          });

          if (verifyRes.ok) {
            const p = storage.getProfile();
            p.subscription = 'starter';
            storage.saveProfile(p);
            setProfile(p);
            syncProfile(p);
            showNotification("Starter Pass Activated! Unlimited chat enabled for the next 24 hours.", 'success');
          } else {
            const errData = await verifyRes.json().catch(() => ({}));
            showNotification(`Verification failed: ${errData.error || 'Unknown Error'}. Please try again.`, 'error');
          }
        } catch (err) {
          console.error("Verification error", err);
        }
      },
      onFailure: (err) => {
        console.error("Pass purchase failed", err);
        showNotification("Starter Pass purchase failed. Please try again.", 'error');
      }
    });
  }, [refreshProfile, user]);

  return (
    <AuthContext.Provider value={{
      user, profile, loading, syncProfile, signUp, signIn, signInWithProvider, signOut,
      updateConnection, incrementUsage, refreshProfile, upgradeSubscription,
      purchaseHearts, spendHearts, sendGift, unlockConnectionTier, leasePersonality, extendMessages, buyStarterPass
    }}>
      {children}
    </AuthContext.Provider>
  );
};


