import React, { useState } from 'react';
import { useAuth } from '../src/contexts/AuthContext';
import { X, User, Heart, Gift, LogOut, Check, Edit2, TrendingUp, Calendar, Sparkles } from 'lucide-react';
import { PROFILE_AVATARS } from '../constants';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { profile, user, updateProfile, claimDailyBonus, signOut } = useAuth();
    const [isEditingName, setIsEditingName] = useState(false);
    const [nickname, setNickname] = useState(profile.nickname || user?.displayName || '');
    const [selectedAvatar, setSelectedAvatar] = useState(profile.avatarUrl || PROFILE_AVATARS[0]);

    if (!isOpen) return null;

    const handleSaveName = async () => {
        await updateProfile({ nickname });
        setIsEditingName(false);
    };

    const handleSelectAvatar = async (url: string) => {
        setSelectedAvatar(url);
        await updateProfile({ avatarUrl: url });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-[40px] border border-white shadow-[0_32px_64px_rgba(255,154,203,0.3)] overflow-hidden animate-in zoom-in duration-300">

                {/* Header Color Accent */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-[#FF9ACB]/20 to-[#B28DFF]/20" />

                <div className="relative pt-8 px-6 pb-8">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-6 p-2 rounded-full bg-white/50 text-[#4A2040] hover:bg-white transition-all shadow-sm"
                    >
                        <X size={20} />
                    </button>

                    {/* Profile Section */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative mb-4 group">
                            <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                                <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-[#FF9ACB] to-[#B28DFF] rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg">
                                <Sparkles size={14} />
                            </div>
                        </div>

                        <div className="text-center w-full px-4">
                            {isEditingName ? (
                                <div className="flex items-center justify-center gap-2">
                                    <input
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="bg-white/80 border border-pink-200 rounded-xl px-4 py-2 text-center text-xl font-bold text-[#4A2040] outline-none focus:ring-2 focus:ring-pink-300 w-full max-w-[200px]"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                    />
                                    <button onClick={handleSaveName} className="p-2 bg-green-500 text-white rounded-xl shadow-md">
                                        <Check size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                                    <h2 className="text-2xl font-serif-display font-bold text-[#4A2040]">{profile.nickname || user?.displayName || 'User'}</h2>
                                    <Edit2 size={16} className="text-[#FF9ACB] opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                            <p className="text-[#8E6A88] text-sm mt-1">@{user?.username || 'user'}</p>
                        </div>
                    </div>

                    {/* Wallet Section */}
                    <div className="bg-gradient-to-br from-[#FF9ACB] to-[#FF69B4] rounded-[32px] p-6 text-white shadow-lg shadow-pink-200/50 mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Heart size={80} fill="white" />
                        </div>
                        <div className="relative z-10">
                            <span className="text-pink-100 text-sm font-medium uppercase tracking-widest">Total Balance</span>
                            <div className="flex items-center gap-3 mt-1">
                                <Heart className="fill-white" size={32} />
                                <span className="text-4xl font-bold">{profile.hearts}</span>
                            </div>
                            <button
                                onClick={claimDailyBonus}
                                className="mt-4 w-full py-3 bg-white/20 backdrop-blur-md rounded-2xl font-bold hover:bg-white/30 transition-all border border-white/30 flex items-center justify-center gap-2"
                            >
                                <Gift size={20} />
                                Claim Daily Bonus
                            </button>
                        </div>
                    </div>

                    {/* Avatars Grid */}
                    <div className="mb-8">
                        <h3 className="text-[#4A2040] font-bold mb-4 flex items-center gap-2">
                            <User size={18} className="text-[#FF9ACB]" /> Pick an Avatar
                        </h3>
                        <div className="grid grid-cols-5 gap-3">
                            {PROFILE_AVATARS.map((url, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSelectAvatar(url)}
                                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${selectedAvatar === url ? 'border-[#FF9ACB] shadow-md' : 'border-transparent bg-white'
                                        }`}
                                >
                                    <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                                    {selectedAvatar === url && (
                                        <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center text-white">
                                            <div className="bg-white rounded-full p-0.5">
                                                <Check size={12} className="text-pink-500" />
                                            </div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Activity Section */}
                    <div className="mb-8">
                        <h3 className="text-[#4A2040] font-bold mb-3 flex items-center gap-2">
                            <TrendingUp size={18} className="text-[#FF9ACB]" /> Recent Earnings
                        </h3>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                            {(profile.earningsHistory && profile.earningsHistory.length > 0) ? (
                                profile.earningsHistory.map((record) => (
                                    <div key={record.id} className="flex items-center justify-between p-3 bg-white/60 rounded-2xl border border-white shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${record.type === 'bonus' ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-500'}`}>
                                                {record.type === 'bonus' ? <Gift size={16} /> : <TrendingUp size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[#4A2040]">{record.label}</p>
                                                <p className="text-[10px] text-[#8E6A88]">{new Date(record.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <span className="text-green-600 font-bold ml-2">+{record.amount} ❤️</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-[#8E6A88] text-sm italic">
                                    No earnings history yet...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Logout Section */}
                    <button
                        onClick={() => {
                            if (window.confirm('Ready to logout?')) {
                                signOut();
                            }
                        }}
                        className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all border border-red-100"
                    >
                        <LogOut size={20} />
                        Logout from CallHub
                    </button>

                </div>
            </div>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #FF9ACB; border-radius: 10px; }
      `}</style>
        </div>
    );
};

export default ProfileModal;
