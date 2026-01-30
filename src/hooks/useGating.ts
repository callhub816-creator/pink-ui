import { useAuth } from '../contexts/AuthContext';
import { GATING_CONFIG } from '../../constants';
import { ConnectionLevel } from '../../types';

export const useGating = () => {
    const { profile } = useAuth();

    const getConnectionTier = (companionId: string | number): ConnectionLevel => {
        const points = profile.connectionPoints[companionId] || 0;
        const thresholds = GATING_CONFIG.connectionThresholds;

        if (points >= thresholds.trusted) return 'trusted';
        if (points >= thresholds.close) return 'close';
        if (points >= thresholds.friend) return 'friend';
        return 'stranger';
    };

    const isMessageLimitReached = () => {
        if (profile.subscription !== 'free') return false;

        // Midnight Pass also grants unlimited messages for the night
        if (profile.midnightPassExpiry) {
            const expiry = new Date(profile.midnightPassExpiry).getTime();
            if (Date.now() < expiry) return false;
        }

        return (profile.messageCountToday || 0) >= 30;
    };

    const isNightTimeLocked = () => {
        const hour = new Date().getHours();
        // 10 PM (22) to 4 AM (4)
        const isNight = hour >= 22 || hour < 4;

        if (!isNight) return false;
        if (profile.subscription !== 'free') return false;

        // Check for Midnight Pass
        if (profile.midnightPassExpiry) {
            const expiry = new Date(profile.midnightPassExpiry).getTime();
            if (Date.now() < expiry) return false;
        }

        return true;
    };

    const getResponseDelay = () => {
        if (profile.subscription !== 'free') return 1000; // Fast for paid

        // Check Midnight Pass for fast replies
        if (profile.midnightPassExpiry) {
            const expiry = new Date(profile.midnightPassExpiry).getTime();
            if (Date.now() < expiry) return 1000; // Pass valid, fast replies
        }

        return 4000; // Slower for free
    };

    const isPersonaLocked = (personaId: string | number) => {
        return false; // Disabled for testing
    };

    const canAccessMode = (modeTitle: string) => {
        return true; // All modes active as requested
    };

    const canCall = () => {
        if (profile.subscription !== 'free') return true;
        return false; // Free gets preview only (handled in UI)
    };

    return {
        getConnectionTier,
        isMessageLimitReached,
        isNightTimeLocked,
        getResponseDelay,
        isPersonaLocked,
        canAccessMode,
        canCall,
        subscription: profile.subscription,
        messageCount: profile.messageCountToday
    };
};
