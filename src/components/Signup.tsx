
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
    try {
      const { error: signUpError } = await signUp(username, displayName, password);
      if (signUpError) {
        setError(signUpError.message || 'Signup failed');
        return;
      }
      setMessage('Account created! Fun starts now...');
      setTimeout(() => window.location.href = '/', 1200);
    } catch (err: any) {
      setError('Something went wrong. Username might be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-[360px] mx-auto">
      <div className="relative z-10 bg-white/50 backdrop-blur-2xl border border-white p-6 rounded-[40px] shadow-[0_20px_60px_rgba(255,154,203,0.2)] max-h-[90vh] overflow-y-auto no-scrollbar">

        <div className="flex flex-col items-center mb-5">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FF9ACB] to-[#B28DFF] rounded-2xl flex items-center justify-center shadow-lg mb-3 -rotate-3">
            <Sparkles size={24} className="text-white fill-white/20" />
          </div>
          <h2 className="text-2xl font-serif-display font-bold text-[#4A2040]">Sign Up</h2>
          <p className="text-[#8E6A88] text-xs">Join the CallHub experience</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#FF9ACB]">
              <User size={18} />
            </div>
            <input
              type="text"
              required
              value={username}
              placeholder="Unique Username"
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/60 border border-white/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/30 focus:bg-white transition-all text-[#4A2040] placeholder-[#8E6A88]/40 text-sm"
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#FF9ACB]">
              <Heart size={18} />
            </div>
            <input
              type="text"
              required
              value={displayName}
              placeholder="Your Nickname"
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/60 border border-white/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/30 focus:bg-white transition-all text-[#4A2040] placeholder-[#8E6A88]/40 text-sm"
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#FF9ACB]">
              <Lock size={18} />
            </div>
            <input
              type="password"
              required
              value={password}
              placeholder="Secure Password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/60 border border-white/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/30 focus:bg-white transition-all text-[#4A2040] placeholder-[#8E6A88]/40 text-sm"
            />
          </div>

          {error && <p className="text-[10px] text-red-500 text-center font-bold px-2">{error}</p>}
          {message && <p className="text-[10px] text-green-500 text-center font-bold px-2">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>Create Account</span>}
          </button>
        </form>

        <p className="text-center text-xs text-[#8E6A88] mt-4">
          Already a user?{' '}
          <button type="button" onClick={onSwitchToLogin} className="text-[#D53F8C] font-bold hover:underline">
            Login here
          </button>
        </p>

        <div className="mt-6 pt-4 border-t border-[#B28DFF]/10 flex flex-col items-center gap-2 opacity-50">
          <div className="flex items-center gap-1.5 text-center">
            <Shield size={10} />
            <span className="text-[9px] font-bold uppercase tracking-widest leading-tight">
              Strictly 18+ Only | Private AI support
            </span>
          </div>
        </div>
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Signup;
