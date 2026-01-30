import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthButtons from './AuthButtons';
import { Mail, Lock, ArrowLeft, Heart, Sparkles } from 'lucide-react';

const Login: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await signIn(email, password);
      if (error) {
        setError(error.message || String(error));
        return;
      }
      window.location.pathname = '/';
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-[400px] animate-in fade-in zoom-in duration-500">
      {/* Decorative elements */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#FF9ACB]/20 rounded-full blur-2xl animate-pulse" />
      <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-[#B28DFF]/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 bg-white/40 backdrop-blur-2xl border border-white/60 p-8 rounded-[32px] shadow-[0_20px_50px_rgba(255,154,203,0.15)]">
        <button
          onClick={onBack}
          className="absolute top-6 left-6 p-2 rounded-full bg-white/50 text-[#5e3a58] hover:bg-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex flex-col items-center mb-8 pt-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FF9ACB] to-[#B28DFF] rounded-2xl flex items-center justify-center shadow-lg mb-4 rotate-3">
            <Heart size={32} className="text-white fill-white/20" />
          </div>
          <h2 className="text-3xl font-serif-display font-bold text-[#4A2040]">Welcome Back</h2>
          <p className="text-[#8E6A88] text-sm mt-1">Ready to chat with your AI companion?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#5e3a58]/60 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#FF9ACB] group-focus-within:text-[#B28DFF] transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                value={email}
                placeholder="me@example.com"
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/50 border border-white/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF9ACB]/30 focus:bg-white transition-all text-[#4A2040] placeholder-[#8E6A88]/40"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#5e3a58]/60 uppercase tracking-widest ml-1">Password</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#FF9ACB] group-focus-within:text-[#B28DFF] transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                value={password}
                placeholder="••••••••"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white font-bold rounded-2xl shadow-[0_10px_20px_rgba(178,141,255,0.3)] hover:shadow-[0_15px_30px_rgba(178,141,255,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to CallHub</span>
                <Sparkles size={18} className="group-hover:animate-pulse" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#B28DFF]/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-transparent px-2 text-[#8E6A88] font-medium tracking-widest">Or continue with</span>
          </div>
        </div>

        <AuthButtons />

        <p className="mt-8 text-center text-sm text-[#8E6A88]">
          Don't have an account?{' '}
          <button
            onClick={() => { window.history.pushState({}, '', '/signup'); window.dispatchEvent(new Event('popstate')); }}
            className="text-[#D53F8C] font-bold hover:underline"
          >
            Create one free
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
