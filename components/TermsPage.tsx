
import React, { useEffect } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';

interface PageProps {
  onBack: () => void;
}

const TermsPage: React.FC<PageProps> = ({ onBack }) => {
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
        <h1 className="text-xl font-serif-display font-bold text-[#4A2040]">Terms of Service</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        <p className="leading-relaxed opacity-90 text-sm italic">
          Welcome to CallHub. These terms govern your use of our AI-based virtual companionship and well-being platform. By using the service, you agree to these rules.
        </p>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-[#4A2040]">1. Eligibility (18+)</h3>
          <p className="opacity-90">
            This service is strictly for individuals <strong>aged 18 or older</strong>. By signing up, you represent that you meet this age requirement.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-[#4A2040]">2. Entertainment Purpose</h3>
          <p className="opacity-90">CallHub is an entertainment platform. The characters you interact with are fictional AI entities.</p>
          <ul className="space-y-2 list-disc pl-5 opacity-90">
            <li>Artificial Intelligence simulates all interactions.</li>
            <li>This is <strong>not</strong> a real-world dating or matchmaking service.</li>
            <li>Responses are for entertainment and should not be taken as professional advice.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-[#4A2040]">3. Usage Policy</h3>
          <ul className="space-y-2 list-disc pl-5 opacity-90">
            <li>Users must not use the platform for any illegal or harmful activities.</li>
            <li>Creating emotional dependency on AI is discouraged; use the service responsibly.</li>
            <li>We do not guarantee 24/7 availability or specific response accuracy.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-[#4A2040]">4. Payments & Refunds</h3>
          <div className="bg-[#B28DFF]/5 p-4 rounded-xl border border-[#B28DFF]/10">
            <p className="text-sm opacity-90 mb-2">
              Payments are handled via secure RBI-compliant payment gateways.
            </p>
            <ul className="space-y-2 text-sm list-disc pl-5 opacity-90">
              <li>Digital credits (Hearts) are added <strong>instantly</strong> upon successful transaction.</li>
              <li>Since this is a consumed digital service, <strong>no refunds</strong> are provided after the usage of purchased credits.</li>
              <li>Duplicate transactions will be reviewed and refunded within 5-7 business days.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-[#4A2040]">5. Liability Disclaimer</h3>
          <p className="opacity-90">
            CallHub AI is provided "as-is". We are not liable for any emotional outcomes, data loss, or server interruptions. Users assume all responsibility for their interactions.
          </p>
        </section>

        <section className="space-y-3 bg-white/50 p-6 rounded-2xl border border-white/60">
          <h3 className="text-lg font-bold text-[#4A2040]">Contact Us</h3>
          <p className="opacity-90 mb-2">For any legal or terms-related questions, please email:</p>
          <a href="mailto:support@callhub.in" className="text-[#B28DFF] font-medium hover:underline block">
            support@callhub.in
          </a>
        </section>

      </div>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-[#B28DFF]/10 bg-[#FFF0F5]">
        <p className="text-[#5e3a58]/60 text-xs font-medium leading-loose">
          © 2026 CallHub AI • All Rights Reserved • 18+ Only<br />
          Entertainment & Well-being Platform
        </p>
      </footer>
    </div>
  );
};

export default TermsPage;