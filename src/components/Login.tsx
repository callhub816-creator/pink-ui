
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Heart, Sparkles, Shield } from 'lucide-react';

const Login: React.FC<{ onSwitchToSignup: () => void }> = ({ onSwitchToSignup }) => {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await signIn(username, password);
      if (signInError) {
        setError(signInError.message || String(signInError));
        return;
      }
      // Successful login should trigger navigation to home
      window.location.href = '/';
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-[380px] animate-in fade-in zoom-in duration-500 mx-auto">
      <div className="relative z-10 bg-white/40 backdrop-blur-2xl border border-white/60 p-5 md:p-6 rounded-[32px] shadow-[0_20px_50px_rgba(255,154,203,0.15)]">

        {/* Branding inside Card - More Compact */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#FF9ACB] to-[#B28DFF] rounded-xl flex items-center justify-center shadow-lg mb-2 rotate-3">
            <Heart size={20} className="text-white fill-white/20" />
          </div>
          <h2 className="text-2xl font-serif-display font-bold text-[#4A2040]">Welcome Back</h2>
          <p className="text-[#8E6A88] text-[11px] mt-0.5 text-center">Your companion missed you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-[#5e3a58]/60 uppercase tracking-widest ml-1">Username</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#FF9ACB] group-focus-within:text-[#B28DFF] transition-colors">
                <User size={16} />
              </div>
              <input
                type="text"
                required
                value={username}
                placeholder="Username"
                onChange={(e) => setUsername(e.target.value)}
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
            <div className="p-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[10px] text-center animate-shake">
              {error}
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
                <span>Sign In</span>
                <Sparkles size={16} className="group-hover:animate-pulse" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#B28DFF]/10"></div>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#8E6A88]">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-[#D53F8C] font-bold hover:underline"
          >
            Create one free
          </button>
        </p>

        {/* Footer info inside card - Very Compact */}
        <div className="mt-5 pt-3 border-t border-[#B28DFF]/5 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-[#8E6A88]/60">
            <Shield size={10} />
            <span className="text-[8px] font-bold uppercase tracking-widest">Strictly 18+ | Encrypted & Private</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
