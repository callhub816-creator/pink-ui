
import React, { useEffect } from 'react';
import { ArrowLeft, RefreshCcw } from 'lucide-react';

interface PageProps {
    onBack: () => void;
}

const RefundPage: React.FC<PageProps> = ({ onBack }) => {
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
                <h1 className="text-xl font-serif-display font-bold text-[#4A2040]">Refund & Cancellation</h1>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

                <p className="leading-relaxed opacity-90 text-sm italic border-l-4 border-[#FF9ACB] pl-4">
                    CallHub provides digital entertainment services. Since our AI features and credits are consumed instantly, we have a clear policy regarding refunds and cancellations.
                </p>

                <section className="space-y-3">
                    <h3 className="text-lg font-bold text-[#4A2040]">1. Digital Consumption Policy</h3>
                    <p className="opacity-90">
                        Once digital credits (Hearts) or subscriptions are utilized to interact with the AI, the service is considered <strong>fully consumed</strong>.
                    </p>
                    <ul className="space-y-2 list-disc pl-5 opacity-90">
                        <li><strong>Hearts:</strong> Non-refundable once spent on any feature (e.g., chat, calling, or unlocking content).</li>
                        <li><strong>Subscriptions:</strong> Grants instant access to premium features. Cancellation stops future billing, but no refunds are given for the current cycle.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h3 className="text-lg font-bold text-[#4A2040]">2. Refund Eligibility</h3>
                    <p className="opacity-90">
                        Refunds are only considered under the following conditions:
                    </p>
                    <ul className="space-y-2 list-disc pl-5 opacity-90">
                        <li><strong>Technical Error:</strong> If payment was successful but credits were not added due to a platform glitch.</li>
                        <li><strong>Duplicate Payment:</strong> If you were charged twice for the same transaction.</li>
                    </ul>
                </section>

                <section className="space-y-3">
                    <h3 className="text-lg font-bold text-[#4A2040]">3. Refund Process</h3>
                    <p className="opacity-90">
                        To request a refund for eligible cases, please email <strong>support@callhub.in</strong> with your payment ID and registered email within 24 hours of the transaction.
                    </p>
                    <p className="opacity-90">
                        Approved refunds will be processed within <strong>5 to 7 business days</strong> back to the original payment method.
                    </p>
                </section>

                <section className="space-y-3 bg-white/50 p-6 rounded-2xl border border-white/60">
                    <div className="flex items-center gap-2 mb-2">
                        <RefreshCcw size={20} className="text-[#B28DFF]" />
                        <h3 className="text-lg font-bold text-[#4A2040]">Support & Contact</h3>
                    </div>
                    <p className="opacity-90 mb-4">We are here to resolve any billing issues within 24 hours.</p>
                    <div className="space-y-2">
                        <a href="mailto:support@callhub.in" className="text-[#B28DFF] font-medium hover:underline block">
                            Email: support@callhub.in
                        </a>
                    </div>
                </section>

            </div>

            {/* Footer */}
            <footer className="py-8 px-6 text-center border-t border-[#B28DFF]/10 bg-[#FFF0F5]">
                <p className="text-[#5e3a58]/60 text-xs font-medium leading-loose">
                    © 2026 CallHub AI • All Rights Reserved<br />
                    Secure checkout powered by Razorpay
                </p>
            </footer>
        </div>
    );
};

export default RefundPage;
