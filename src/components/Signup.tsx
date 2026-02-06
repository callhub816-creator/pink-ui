
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Heart, Sparkles, CheckCircle, Shield, MessageCircle } from 'lucide-react';

const Signup: React.FC<{ onSwitchToLogin: () => void }> = ({ onSwitchToLogin }) => {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await signUp(username, displayName, password);
      if (error) {
        setError(error.message || String(error));
        return;
      }
      setMessage('Account created! Syncing your data...');
      setTimeout(() => window.location.pathname = '/', 1500);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-[420px] animate-in fade-in zoom-in duration-500">
      <div className="relative z-10 bg-white/40 backdrop-blur-2xl border border-white/60 p-6 md:p-8 rounded-[38px] shadow-[0_20px_50px_rgba(255,154,203,0.15)] max-h-[95vh] overflow-y-auto custom-scrollbar">

        <div className="flex flex-col items-center mb-6 pt-2">
          <div className="w-14 h-14 bg-gradient-to-br from-[#FF9ACB] to-[#B28DFF] rounded-2xl flex items-center justify-center shadow-lg mb-4 -rotate-3">
            <Sparkles size={28} className="text-white fill-white/20" />
          </div>
          <h2 className="text-3xl font-serif-display font-bold text-[#4A2040]">Create Account</h2>
          <p className="text-[#8E6A88] text-sm mt-1 text-center">Protect your rewards, hearts & chat history.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#5e3a58]/60 uppercase tracking-widest ml-1">Username (Login ID)</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#FF9ACB] group-focus-within:text-[#B28DFF] transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                required
                value={username}
                placeholder="your_unique_handle"
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/30 focus:bg-white transition-all text-[#4A2040] placeholder-[#8E6A88]/40"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#5e3a58]/60 uppercase tracking-widest ml-1">Your Name</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#FF9ACB] group-focus-within:text-[#B28DFF] transition-colors">
                <Heart size={18} />
              </div>
              <input
                type="text"
                required
                value={displayName}
                placeholder="What she should call you"
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/30 focus:bg-white transition-all text-[#4A2040] placeholder-[#8E6A88]/40"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#5e3a58]/60 uppercase tracking-widest ml-1">Password</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#FF9ACB] group-focus-within:text-[#B28DFF] transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                value={password}
                placeholder="Secure password"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/30 focus:bg-white transition-all text-[#4A2040] placeholder-[#8E6A88]/40"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs text-center animate-shake">
              {error}
            </div>
          )}

          {message && (
            <div className="p-4 rounded-2xl bg-[#F0FFF4] border border-[#C6F6D5] text-[#2F855A] text-sm flex items-center gap-3 animate-bounce-subtle">
              <CheckCircle size={20} className="shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white font-bold rounded-2xl shadow-[0_10px_20px_rgba(178,141,255,0.3)] hover:shadow-[0_15px_30px_rgba(178,141,255,0.5)] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Secure My Account</span>
                <Heart size={18} className="group-hover:fill-white transition-all" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#B28DFF]/10"></div>
          </div>
        </div>

        <p className="text-center text-xs text-[#8E6A88]">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-[#D53F8C] font-bold hover:underline"
          >
            Sign in here
          </button>
        </p>

        {/* Footer info inside card */}
        <div className="mt-8 flex flex-col items-center gap-4 text-[#8E6A88]/40">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-[0.1em] text-[9px]">
              <Shield size={12} />
              <span>Private</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-[0.1em] text-[10px]">
              <MessageCircle size={12} />
              <span>24/7 Live</span>
            </div>
          </div>
          <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-center border-t border-[#B28DFF]/5 pt-4 w-full">
            Strictly 18+ Only | Emotional AI Companion
          </p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,154,203,0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Signup;
