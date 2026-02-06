
import React, { useState, useEffect } from 'react';
import Login from './Login';
import Signup from './Signup';
import { Shield } from 'lucide-react';

const AuthScreen: React.FC = () => {
    const [view, setView] = useState<'login' | 'signup'>('login');

    // Sync with URL and listen for changes
    useEffect(() => {
        const handleLocationChange = () => {
            const path = window.location.pathname;
            if (path === '/signup') setView('signup');
            else setView('login');
        };

        handleLocationChange();
        window.addEventListener('popstate', handleLocationChange);
        return () => window.removeEventListener('popstate', handleLocationChange);
    }, []);

    const toggleView = (newView: 'login' | 'signup') => {
        setView(newView);
        window.history.pushState({}, '', newView === 'login' ? '/login' : '/signup');
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FDF2F8] p-4 relative overflow-hidden font-sans">
            {/* Animated Background Orbs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[5%] left-[5%] w-64 h-64 bg-[#FF9ACB]/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[5%] right-[5%] w-80 h-80 bg-[#B28DFF]/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Main Auth Container */}
            <div className="relative z-10 w-full flex flex-col items-center max-w-[420px] py-4">
                {view === 'login' ? (
                    <Login onSwitchToSignup={() => toggleView('signup')} />
                ) : (
                    <Signup onSwitchToLogin={() => toggleView('login')} />
                )}

                {/* Global 18+ Disclaimer - Outside the card for maximum visibility */}
                <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                    <div className="flex items-center justify-center gap-2 text-[#8E6A88]/50 border-t border-[#B28DFF]/10 pt-4 w-full">
                        <Shield size={14} className="text-[#FF9ACB]" />
                        <p className="text-[10px] uppercase font-bold tracking-[0.2em]">
                            Strictly 18+ Only | Private AI Companion
                        </p>
                    </div>
                    <p className="mt-2 text-[9px] text-[#8E6A88]/30 px-6">
                        By entering, you confirm you are of legal age. Your conversations are encrypted and 100% private.
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0) rotate(6deg); }
                    50% { transform: translateY(-10px) rotate(8deg); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 3s ease-in-out infinite;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,154,203,0.2); border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default AuthScreen;
