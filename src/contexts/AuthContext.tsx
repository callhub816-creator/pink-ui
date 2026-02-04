import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { storage } from '../../utils/storage';
import { UserProfile, SubscriptionPlan, ConnectionLevel } from '../../types';
import { GATING_CONFIG, GIFT_ITEMS, HEARTS_PACKS } from '../../constants';
import { initiatePayment } from '../../utils/PaymentService';

type ProviderName = 'facebook' | 'google';

type AuthContextType = {
  user: User | null;
  profile: UserProfile;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any; data: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; data: any }>;
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(storage.getProfile());
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(() => {
    setProfile(storage.getProfile());
  }, []);

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
    refreshProfile();
  }, [refreshProfile]);

  const incrementUsage = useCallback(() => {
    const count = storage.incrementMessageCount();
    refreshProfile();
    return count;
  }, [refreshProfile]);

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
            refreshProfile();
            alert(`Successful! Added ${amount} Hearts. ❤️`);
          } else {
            const errData = await verifyRes.json().catch(() => ({}));
            alert(`Payment verification failed: ${errData.error || 'Unknown Error'}. Please contact support.`);
          }
        } catch (err) {
          console.error("Verification error", err);
          alert("Verification error. Your hearts will be updated once processed.");
        }
      },
      onFailure: (err) => {
        console.error("Payment failed", err);
        alert("Payment was not successful. Please try again.");
      }
    });
  }, [refreshProfile, user]);

  const spendHearts = useCallback((amount: number) => {
    const success = storage.spendHearts(amount);
    if (success) refreshProfile();
    return success;
  }, [refreshProfile]);

  const sendGift = useCallback((companionId: string | number, giftId: string) => {
    const gift = GIFT_ITEMS.find(g => g.id === giftId);
    if (!gift) return false;

    const success = storage.spendHearts(gift.price);
    if (success) {
      storage.addConnectionPoints(companionId, gift.points);
      refreshProfile();
      return true;
    }
    return false;
  }, [refreshProfile]);

  const unlockConnectionTier = useCallback((companionId: string | number, tier: ConnectionLevel) => {
    const price = tier === 'trusted' ? 50 : 25;
    if (storage.spendHearts(price)) {
      const thresholds = GATING_CONFIG.connectionThresholds;
      const targetPoints = tier === 'trusted' ? thresholds.trusted : thresholds.close;
      storage.addConnectionPoints(companionId, targetPoints - (profile.connectionPoints[companionId] || 0));
      refreshProfile();
      return true;
    }
    return false;
  }, [profile.connectionPoints, refreshProfile]);

  const leasePersonality = useCallback((mode: string) => {
    if (storage.spendHearts(15)) {
      const profile = storage.getProfile();
      if (!profile.unlockedModes.includes(mode)) {
        profile.unlockedModes.push(mode);
        storage.saveProfile(profile);
      }
      refreshProfile();
      return true;
    }
    return false;
  }, [refreshProfile]);

  const extendMessages = useCallback(() => {
    if (storage.spendHearts(5)) {
      const profile = storage.getProfile();
      profile.messageCountToday = Math.max(0, profile.messageCountToday - 10);
      storage.saveProfile(profile);
      refreshProfile();
      return true;
    }
    return false;
  }, [refreshProfile]);

  useEffect(() => {
    let mounted = true;
    const getInitial = async () => {
      try {
        const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } };
        if (!mounted) return;
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('Auth: getSession error', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    getInitial();

    const { data: listener } = supabase?.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    }) || { data: { subscription: { unsubscribe: () => { } } } };

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    if (!supabase) return { data: null, error: new Error('Supabase not initialized') };
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (data?.session?.user) setUser(data.session.user);
      return { data, error };
    } catch (error) { return { data: null, error } as any; } finally { setLoading(false); }
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { data: null, error: new Error('Supabase not initialized') };
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (data?.session?.user) setUser(data.session.user);
      return { data, error };
    } catch (error) { return { data: null, error } as any; } finally { setLoading(false); }
  };

  const signInWithProvider = async (provider: ProviderName) => {
    if (!supabase) return;
    setLoading(true);
    try { await supabase.auth.signInWithOAuth({ provider }); }
    catch (error) { console.error('OAuth sign-in error', error); throw error; }
    finally { setLoading(false); }
  };

  const signOut = async () => {
    if (!supabase) {
      setUser(null);
      return;
    }
    setLoading(true);
    try { await supabase.auth.signOut(); setUser(null); }
    catch (error) { console.error('Sign out error', error); }
    finally { setLoading(false); }
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
            const profile = storage.getProfile();
            profile.subscription = plan;
            storage.saveProfile(profile);
            refreshProfile();
            alert(`Welcome to ${planDetails?.name}! Enjoy your premium experience. ✨`);
          } else {
            const errData = await verifyRes.json().catch(() => ({}));
            alert(`Payment verification failed: ${errData.error || 'Unknown Error'}. Please contact support.`);
          }
        } catch (err) {
          console.error("Verification error", err);
        }
      },
      onFailure: (err) => {
        console.error("Upgrade failed", err);
        alert("Payment was not successful. Please try again.");
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
            const profile = storage.getProfile();
            profile.subscription = 'starter';
            storage.saveProfile(profile);
            refreshProfile();
            alert("Starter Pass Activated! Unlimited chat enabled for the next 24 hours.");
          } else {
            const errData = await verifyRes.json().catch(() => ({}));
            alert(`Verification failed: ${errData.error || 'Unknown Error'}. Please try again.`);
          }
        } catch (err) {
          console.error("Verification error", err);
        }
      },
      onFailure: (err) => {
        console.error("Pass purchase failed", err);
        alert("Starter Pass purchase failed. Please try again.");
      }
    });
  }, [refreshProfile, user]);

  return (
    <AuthContext.Provider value={{
      user, profile, loading, signUp, signIn, signInWithProvider, signOut,
      updateConnection, incrementUsage, refreshProfile, upgradeSubscription,
      purchaseHearts, spendHearts, sendGift, unlockConnectionTier, leasePersonality, extendMessages, buyStarterPass
    }}>
      {children}
    </AuthContext.Provider>
  );
};


