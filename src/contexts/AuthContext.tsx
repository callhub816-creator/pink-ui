
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
  purchaseHearts: (amount: number) => Promise<void>;
  spendHearts: (amount: number) => boolean;
  sendGift: (companionId: string | number, giftId: string) => boolean;
  unlockConnectionTier: (companionId: string | number, tier: ConnectionLevel) => boolean;
  leasePersonality: (mode: string) => boolean;
  extendMessages: () => boolean;
  buyStarterPass: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  claimDailyBonus: () => Promise<boolean>;
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
      // DEV MODE BYPASS: Auto-login
      // @ts-ignore
      if (import.meta.env.DEV) {
        console.log('Dev Mode: Bypassing Login (Dev User)');
        setUser({ id: 'dev-user', username: 'dev', displayName: 'Dev User' });
        setLoading(false);
        return;
      }

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

      // Handle case where response might not be JSON
      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server Error: ${res.status}`);
      }

      if (!res.ok) {
        // Handle case where error might be a stringified object or raw string
        let errorMessage = 'Invalid username or password';
        if (data && data.error) {
          errorMessage = data.error;
        } else if (typeof data === 'string' && data.includes('{')) {
          try {
            const parsed = JSON.parse(data);
            errorMessage = parsed.error || errorMessage;
          } catch (e) { }
        }
        throw new Error(errorMessage);
      }

      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      if (data.profileData) {
        storage.saveProfile(data.profileData);
        refreshProfile();
      }
      return { data, error: null };
    } catch (err: any) {
      console.error('AuthContext signIn catch:', err);
      // Clean up the error message if it's still JSON
      let msg = err.message || 'Login failed';
      if (msg.startsWith('{')) {
        try {
          const parsed = JSON.parse(msg);
          msg = parsed.error || msg;
        } catch (e) { }
      }
      return { data: null, error: { message: msg } };
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

  // Helper to load Razorpay SDK dynamically
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const initiatePayment = async (amount: number, description: string, onSuccess: () => void) => {
    const res = await loadRazorpay();
    if (!res) {
      showNotification('Razorpay SDK failed to load. Are you online?', 'error');
      return;
    }

    try {
      // 1. Create Order on Backend
      const orderResponse = await fetch('/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amount * 100 }) // Razorpay expects paise
      });

      // Check if response is OK before parsing
      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        let errorMessage = 'Payment server error';

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch {
          errorMessage = errorText || `Server returned ${orderResponse.status}`;
        }

        throw new Error(errorMessage);
      }

      const orderData = await orderResponse.json();

      if (orderData.error) {
        throw new Error(orderData.error);
      }

      // 2. Options for Razorpay
      const options = {
        key: orderData.key_id, // Enter the Key ID generated from the Dashboard
        amount: orderData.amount,
        currency: orderData.currency,
        name: "CallHub AI",
        description: description,
        image: "https://callhub.in/favicon.svg",
        order_id: orderData.id,
        handler: async function (response: any) {
          // 3. Verify Payment on Backend
          try {
            const verifyRes = await fetch('/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                amount: amount,
                type: 'purchase'
              })
            }).then((t) => t.json());

            if (verifyRes.success) {
              onSuccess();
              // Add to history
              const newRecord = {
                id: Date.now().toString(),
                type: 'purchase' as const,
                amount: amount, // or hearts value
                label: description,
                timestamp: new Date().toISOString()
              };
              await updateProfile({
                earningsHistory: [newRecord, ...(profile.earningsHistory || [])]
              });
              showNotification(`Payment Successful! ${description} added.`, 'success');
            } else {
              showNotification('Payment verification failed.', 'error');
            }
          } catch (error) {
            console.error('Verify Error:', error);
            showNotification('Payment verification error', 'error');
          }
        },
        prefill: {
          name: user?.displayName || 'User',
          email: 'user@callhub.in',
          contact: '9999999999'
        },
        notes: {
          address: "CallHub AI Corp"
        },
        theme: {
          color: "#FF9ACB"
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (error: any) {
      console.error('Payment Error:', error);

      // User-friendly error message
      let userMessage = error.message || 'Payment initiation failed';

      // If it's a credentials error, show helpful message
      if (userMessage.includes('credentials') || userMessage.includes('misconfigured') || userMessage.includes('Server error: 500')) {
        userMessage = '⚠️ Payment system is being set up. Please try again later or contact support.';
      }

      showNotification(userMessage, 'error');
    }
  };

  const upgradeSubscription = async (plan: SubscriptionPlan) => {
    // Determine price dynamically (Placeholder prices)
    const prices: Record<string, number> = {
      starter: 49,
      core: 199,
      plus: 499
    };
    const price = prices[plan] || 99;

    await initiatePayment(price, `Upgrade to ${plan.toUpperCase()}`, async () => {
      const updated = { ...profile, subscription: plan };
      setProfile(updated);
      storage.saveProfile(updated);
      await syncProfile(updated);
      showNotification(`Welcome to ${plan.toUpperCase()}! 🌟`, 'success');
    });
  };

  const purchaseHearts = async (heartsAmount: number) => {
    // Calculate price logic (approx ₹1 = 1.2 hearts for simplicity or use config)
    // Using mapping from constants (reversed) or direct packs
    // Just a placeholder logic: 1 Heart = ₹1 (roughly)
    const price = Math.floor(heartsAmount * 0.8); // Example discount

    await initiatePayment(price, `${heartsAmount} Hearts Pack`, async () => {
      const updated = { ...profile, hearts: profile.hearts + heartsAmount };
      setProfile(updated);
      storage.saveProfile(updated);
      await syncProfile(updated);
    });
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

  const updateProfile = async (data: Partial<UserProfile>) => {
    // If we're updating user info like name/avatar, update auth user state too
    if (data.nickname && user) {
      setUser({ ...user, displayName: data.nickname });
    }

    const updated = { ...profile, ...data };
    setProfile(updated);
    storage.saveProfile(updated);

    await syncProfile(updated);
  };

  const claimDailyBonus = async () => {
    const today = new Date().toDateString();
    if (profile.lastDailyBonusClaim === today) {
      showNotification("You've already claimed your daily bonus! Come back tomorrow. ✨", 'info');
      return false;
    }

    const bonusAmount = 10;
    const newRecord = {
      id: Date.now().toString(),
      type: 'bonus' as const,
      amount: bonusAmount,
      label: 'Daily Login Bonus',
      timestamp: new Date().toISOString()
    };

    const updated = {
      ...profile,
      hearts: (profile.hearts || 0) + bonusAmount,
      lastDailyBonusClaim: today,
      earningsHistory: [newRecord, ...(profile.earningsHistory || [])].slice(0, 50)
    };

    setProfile(updated);
    storage.saveProfile(updated);
    await syncProfile(updated);
    showNotification(`Daily bonus claimed! +${bonusAmount} Hearts added to your wallet. ❤️`, 'success');
    return true;
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading, syncProfile, signUp, signIn, signInWithProvider, signOut,
      updateConnection, incrementUsage, refreshProfile, upgradeSubscription, purchaseHearts,
      spendHearts, sendGift, unlockConnectionTier, leasePersonality, extendMessages, buyStarterPass,
      updateProfile, claimDailyBonus
    }}>
      {children}
    </AuthContext.Provider>
  );
};
