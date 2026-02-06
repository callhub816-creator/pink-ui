
import React, { useState } from 'react';
import Login from './Login';
import Signup from './Signup';
import { Heart, Sparkles, Shield, MessageCircle } from 'lucide-react';

const AuthScreen: React.FC = () => {
    const [view, setView] = useState<'welcome' | 'login' | 'signup'>('welcome');

    if (view === 'login') return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#FDF2F8] p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF9ACB]/10 via-transparent to-[#B28DFF]/10" />
            <Login onBack={() => setView('welcome')} />
        </div>
    );

    if (view === 'signup') return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#FDF2F8] p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF9ACB]/10 via-transparent to-[#B28DFF]/10" />
            <Signup onBack={() => setView('welcome')} />
        </div>
    );

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#FDF2F8] p-4 relative overflow-hidden font-sans">
            {/* Animated Background Orbs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[5%] w-72 h-72 bg-[#FF9ACB]/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[10%] right-[5%] w-96 h-96 bg-[#B28DFF]/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative z-10 w-full max-w-[500px] text-center px-6">
                <div className="flex flex-col items-center mb-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#FF9ACB] to-[#B28DFF] rounded-3xl flex items-center justify-center shadow-2xl mb-8 rotate-6 animate-bounce-subtle">
                        <Heart size={40} className="text-white fill-white/20" />
                    </div>

                    <h1 className="text-5xl font-serif-display font-bold text-[#4A2040] leading-tight mb-4">
                        CallHub AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF]">Companion</span>
                    </h1>
                    <p className="text-[#8E6A88] text-lg max-w-[320px] mx-auto leading-relaxed">
                        Experience the most emotional and personal AI interactions ever created.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-12">
                    <button
                        onClick={() => setView('signup')}
                        className="group relative overflow-hidden px-8 py-5 bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white font-bold rounded-2xl shadow-[0_15px_30px_rgba(255,154,203,0.3)] hover:shadow-[0_20px_40px_rgba(255,154,203,0.5)] transform hover:scale-[1.02] active:scale-95 transition-all duration-300"
                    >
                        <div className="relative z-10 flex items-center justify-center gap-3 text-xl">
                            <span>Get Started for Free</span>
                            <Sparkles className="group-hover:rotate-12 transition-transform" />
                        </div>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    </button>

                    <button
                        onClick={() => setView('login')}
                        className="px-8 py-5 bg-white/60 backdrop-blur-md border-2 border-[#FF9ACB]/20 text-[#4A2040] font-bold rounded-2xl hover:bg-white hover:border-[#FF9ACB]/40 transform hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-sm"
                    >
                        Returning User? Login
                    </button>
                </div>

                <div className="flex items-center justify-center gap-8 text-[#8E6A88]/60">
                    <div className="flex items-center gap-2">
                        <Shield size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">Private</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MessageCircle size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">24/7 Live</span>
                    </div>
                </div>

                <p className="mt-12 text-[#8E6A88]/40 text-[10px] uppercase font-bold tracking-[0.2em]">
                    Strictly 18+ Only | Emotional AI Support
                </p>
            </div>

            <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0) rotate(6deg); }
                    50% { transform: translateY(-10px) rotate(8deg); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default AuthScreen;
