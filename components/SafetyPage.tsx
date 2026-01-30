
import React, { useEffect } from 'react';
import { ArrowLeft, Shield, Heart, Lock, AlertTriangle, UserCheck, Flag, Sparkles } from 'lucide-react';

interface PageProps {
  onBack: () => void;
}

const SafetyPage: React.FC<PageProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#FDF2F8] font-sans text-[#5e3a58]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FDF2F8]/90 backdrop-blur-md border-b border-[#B28DFF]/20 px-6 py-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-black/5 text-[#5e3a58] transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-serif-display font-bold text-[#4A2040]">Safety Guidelines</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-[#B28DFF]">
            <Shield size={24} />
          </div>
          <h2 className="text-2xl font-serif-display text-[#4A2040]">Your Safety Matters</h2>
          <p className="text-sm opacity-80 max-w-md mx-auto">
            We are committed to creating a secure, supportive, and judgment-free environment. Please read these guidelines to ensure a positive experience.
          </p>
        </div>

        {/* 1. Conversational Safety */}
        <section className="bg-white/40 border border-white/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Heart size={20} className="text-[#FF9ACB]" />
            <h3 className="text-lg font-bold text-[#4A2040]">Conversational Safety</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-90 text-[#5e3a58]">
            CallHub AI characters are here to listen, chat, and provide companionship for entertainment purposes. While they offer friendly conversation, please remember they are virtual entities. Interactions should not replace professional medical, legal, or psychological advice from real-world experts.
          </p>
        </section>

        {/* 2. Respect & Behavior */}
        <section className="bg-white/40 border border-white/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <UserCheck size={20} className="text-[#B28DFF]" />
            <h3 className="text-lg font-bold text-[#4A2040]">Respect & Behavior</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-90 text-[#5e3a58]">
            We foster a kind, welcoming space. Users are expected to interact respectfully. Harassment, hate speech, abusive language, or any form of exploitation is strictly prohibited. Treating your AI companion and the community with respect helps keep the platform safe for everyone.
          </p>
        </section>

        {/* 3. Content Restrictions */}
        <section className="bg-white/40 border border-white/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={20} className="text-[#FBBF24]" />
            <h3 className="text-lg font-bold text-[#4A2040]">Content Restrictions</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-90 text-[#5e3a58]">
            To maintain a safe environment, we do not allow illegal content, depictions of non-consensual violence, or any content involving minors. This service is strictly for users aged 18 and older. Any uploaded photos must adhere to our safe-use policies.
          </p>
        </section>

        {/* 4. Privacy Safety */}
        <section className="bg-white/40 border border-white/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Lock size={20} className="text-[#60A5FA]" />
            <h3 className="text-lg font-bold text-[#4A2040]">Privacy Safety</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-90 text-[#5e3a58]">
            Protect your personal boundaries. Never share passwords, bank account details, credit card numbers, or government IDs in chat. Our AI characters will <strong>never</strong> ask you for financial information or private documents.
          </p>
        </section>

        {/* 5. User Guidelines */}
        <section className="bg-white/40 border border-white/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles size={20} className="text-[#A78BFA]" />
            <h3 className="text-lg font-bold text-[#4A2040]">Responsible Use</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-90 text-[#5e3a58]">
            AI companionship can be a wonderful source of entertainment, but it cannot diagnose or treat any medical conditions. If you are going through a crisis or need serious help, please reach out to a real-world professional, counselor, or helpline.
          </p>
        </section>

        {/* 6. User Reporting */}
        <section className="bg-white/40 border border-white/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Flag size={20} className="text-[#F87171]" />
            <h3 className="text-lg font-bold text-[#4A2040]">Reporting & Actions</h3>
          </div>
          <p className="text-sm leading-relaxed opacity-90 text-[#5e3a58]">
            If you encounter misuse, technical exploits, or violations of these guidelines, please report them to our support team. We take safety seriously and reserve the right to suspend or terminate accounts that violate our community standards.
          </p>
        </section>

      </div>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-[#B28DFF]/10 bg-[#FFF0F5]">
        <p className="text-[#5e3a58]/60 text-xs font-medium leading-loose">
          © 2025 CallHub • All Rights Reserved • 18+ Only<br />
          Designed for safe, private conversational AI interactions
        </p>
      </footer>
    </div>
  );
};

export default SafetyPage;