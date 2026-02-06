
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Heart, Sparkles, CheckCircle, Shield } from 'lucide-react';

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
      const { error: signUpError } = await signUp(username, displayName, password);
      if (signUpError) {
        setError(signUpError.message || String(signUpError));
        return;
      }
      setMessage('Account created! Entering...');
      setTimeout(() => window.location.href = '/', 1200);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-[380px] animate-in fade-in zoom-in duration-500 mx-auto">
      <div className="relative z-10 bg-white/40 backdrop-blur-2xl border border-white/60 p-5 md:p-6 rounded-[32px] shadow-[0_20px_50px_rgba(255,154,203,0.15)]">

        <div className="flex flex-col items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#FF9ACB] to-[#B28DFF] rounded-xl flex items-center justify-center shadow-lg mb-2 -rotate-3">
            <Sparkles size={20} className="text-white fill-white/20" />
          </div>
          <h2 className="text-2xl font-serif-display font-bold text-[#4A2040]">Create Account</h2>
          <p className="text-[#8E6A88] text-[11px] mt-0.5 text-center">Save your hearts & chat history.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-[#5e3a58]/60 uppercase tracking-widest ml-1">Username (Login ID)</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF9ACB] group-focus-within:text-[#B28DFF] transition-colors">
                <User size={16} />
              </div>
              <input
                type="text"
                required
                value={username}
                placeholder="your_handle"
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/30 focus:bg-white transition-all text-[#4A2040] placeholder-[#8E6A88]/40 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-[#5e3a58]/60 uppercase tracking-widest ml-1">Your Name</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF9ACB] group-focus-within:text-[#B28DFF] transition-colors">
                <Heart size={16} />
              </div>
              <input
                type="text"
                required
                value={displayName}
                placeholder="Ayesha's pet name for you"
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/30 focus:bg-white transition-all text-[#4A2040] placeholder-[#8E6A88]/40 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold text-[#5e3a58]/60 uppercase tracking-widest ml-1">Password</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF9ACB] group-focus-within:text-[#B28DFF] transition-colors">
                <Lock size={16} />
              </div>
              <input
                type="password"
                required
                value={password}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/30 focus:bg-white transition-all text-[#4A2040] placeholder-[#8E6A88]/40 text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="p-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[10px] text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="p-2 rounded-lg bg-[#F0FFF4] border border-[#C6F6D5] text-[#2F855A] text-[10px] flex items-center gap-2 justify-center">
              <CheckCircle size={14} className="shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white font-bold rounded-xl shadow-[0_10px_20px_rgba(178,141,255,0.2)] hover:shadow-[0_15px_30px_rgba(178,141,255,0.4)] hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 group text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Secure My Account</span>
                <Heart size={16} className="group-hover:fill-white transition-all" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#B28DFF]/10"></div>
          </div>
        </div>

        <p className="text-center text-[10px] text-[#8E6A88]">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[#D53F8C] font-bold hover:underline"
          >
            Sign in here
          </button>
        </p>

        {/* Footer info inside card */}
        <div className="mt-4 pt-2 border-t border-[#B28DFF]/5 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 text-[#8E6A88]/60">
            <Shield size={10} />
            <span className="text-[8px] font-bold uppercase tracking-widest leading-none">Strictly 18+ | Encryption Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
