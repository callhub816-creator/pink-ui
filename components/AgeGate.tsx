
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check } from 'lucide-react';

const AgeGate: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [checks, setChecks] = useState({ age: false, ai: false });

    useEffect(() => {
        const hasAgreed = localStorage.getItem('callhub_age_gate_agreed');
        if (!hasAgreed) {
            setIsVisible(true);
        }
    }, []);

    const handleAgree = () => {
        if (!checks.age || !checks.ai) return;
        localStorage.setItem('callhub_age_gate_agreed', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 select-none animate-in fade-in duration-1000 overflow-hidden">
            {/* Cinematic Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a101d] via-[#0a0a0c] to-[#050505]" />

            {/* Subtle Radial Glow behind card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/[0.07] blur-[120px] rounded-full pointer-events-none" />

            {/* Glass Card Container */}
            <div className="bg-[#121215]/40 max-w-md w-full md:rounded-[28px] rounded-[24px] p-8 md:p-12 border border-white/[0.08] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] text-center space-y-8 relative backdrop-blur-3xl overflow-hidden transform animate-in zoom-in-95 duration-700">

                {/* Decorative sheen top-left */}
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

                {/* Header Section */}
                <div className="relative space-y-6">
                    <div className="w-14 h-14 bg-white/[0.03] border border-white/[0.1] md:rounded-[14px] rounded-[12px] flex items-center justify-center mx-auto shadow-2xl relative group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-50" />
                        <ShieldCheck size={28} className="text-violet-300 opacity-90 relative z-10" strokeWidth={1.2} />
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-3xl md:text-4xl font-serif-display font-semibold tracking-tight leading-tight">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-violet-200">
                                Age Confirmation
                            </span>
                        </h2>
                        <p className="text-slate-400/90 leading-relaxed text-[14px] max-w-[320px] mx-auto font-light">
                            This platform is intended only for users aged 18 years or older. <br />
                            By continuing, you confirm that you are at least 18 years of age and understand that all interactions are AI-generated and fictional.
                        </p>
                    </div>
                </div>

                {/* Confirmations Section */}
                <div className="space-y-3 pt-1">
                    <button
                        onClick={() => setChecks(prev => ({ ...prev, age: !prev.age }))}
                        className={`w-full flex items-start gap-4 p-4 md:rounded-[18px] rounded-[16px] border transition-all duration-300 text-left cursor-pointer group
                            ${checks.age ? 'bg-white/[0.04] border-white/[0.12] shadow-inner' : 'bg-transparent border-white/[0.05] hover:border-white/[0.1]'}`}
                    >
                        <div className={`w-5 h-5 rounded-full border transition-all duration-500 flex items-center justify-center mt-0.5 shrink-0
                            ${checks.age ? 'bg-violet-500/30 border-violet-400/50 scale-110' : 'bg-white/[0.02] border-white/[0.15] group-hover:border-white/[0.3]'}`}>
                            <Check size={12} className={`text-violet-200 transition-all duration-500 ${checks.age ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} strokeWidth={3} />
                        </div>
                        <p className={`transition-colors duration-300 text-[14px] leading-snug font-normal ${checks.age ? 'text-slate-200' : 'text-slate-400'}`}>
                            I confirm that I am at least 18 years of age.
                        </p>
                    </button>

                    <button
                        onClick={() => setChecks(prev => ({ ...prev, ai: !prev.ai }))}
                        className={`w-full flex items-start gap-4 p-4 md:rounded-[18px] rounded-[16px] border transition-all duration-300 text-left cursor-pointer group
                            ${checks.ai ? 'bg-white/[0.04] border-white/[0.12] shadow-inner' : 'bg-transparent border-white/[0.05] hover:border-white/[0.1]'}`}
                    >
                        <div className={`w-5 h-5 rounded-full border transition-all duration-500 flex items-center justify-center mt-0.5 shrink-0
                            ${checks.ai ? 'bg-violet-500/30 border-violet-400/50 scale-110' : 'bg-white/[0.02] border-white/[0.15] group-hover:border-white/[0.3]'}`}>
                            <Check size={12} className={`text-violet-200 transition-all duration-500 ${checks.ai ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} strokeWidth={3} />
                        </div>
                        <p className={`transition-colors duration-300 text-[14px] leading-snug font-normal ${checks.ai ? 'text-slate-200' : 'text-slate-400'}`}>
                            I understand that all characters are AI-generated and fictional.
                        </p>
                    </button>
                </div>

                {/* CTA Section */}
                <div className="space-y-6 pt-2">
                    <button
                        onClick={handleAgree}
                        disabled={!checks.age || !checks.ai}
                        className={`group relative w-full py-4 md:rounded-[14px] rounded-[12px] font-medium tracking-wide transition-all duration-500 active:scale-[0.97]
                            ${checks.age && checks.ai
                                ? 'bg-gradient-to-tr from-violet-700 via-violet-600 to-rose-500/80 text-white shadow-[0_10px_30px_-10px_rgba(124,58,237,0.4)] hover:shadow-[0_15px_40px_-10px_rgba(124,58,237,0.6)] hover:-translate-y-0.5'
                                : 'bg-white/[0.05] text-slate-500 border border-white/[0.05] cursor-not-allowed opacity-80'}`}
                    >
                        <span className="relative z-10 transition-transform group-hover:scale-105 inline-block">Confirm & Continue</span>
                        {checks.age && checks.ai && (
                            <div className={`absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity md:rounded-[14px] rounded-[12px] blur-lg`} />
                        )}
                    </button>

                    {/* Footer Microcopy */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-semibold opacity-70">
                            Private • Secure • AI-Generated Content
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgeGate;
