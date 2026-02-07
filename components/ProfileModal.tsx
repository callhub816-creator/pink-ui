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

            {/* Modal Card - Responsive Width */}
            <div className="relative w-full max-w-[90%] md:max-w-2xl bg-white/95 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_32px_64px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in duration-300 flex flex-col md:flex-row">

                {/* Close Button (Floating) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/5 hover:bg-black/10 text-[#4A2040] transition-colors"
                >
                    <X size={22} strokeWidth={2.5} />
                </button>

                {/* LEFT SIDE: Avatar & Info */}
                <div className="w-full md:w-5/12 bg-gradient-to-br from-[#FDF2F8] to-[#FFF5F5] p-6 lg:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-pink-100 relative">
                    <div className="relative mb-5 group cursor-pointer" onClick={() => document.getElementById('avatar-grid')?.scrollIntoView({ behavior: 'smooth' })}>
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-[6px] border-white shadow-2xl overflow-hidden bg-white hover:scale-105 transition-transform duration-300">
                            <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute top-0 right-2 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md">
                            <Sparkles size={16} className="text-[#FF9ACB]" />
                        </div>
                    </div>

                    <div className="text-center w-full">
                        {isEditingName ? (
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <input
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="bg-white border-2 border-pink-300 rounded-xl px-3 py-1.5 text-center text-lg font-bold text-[#4A2040] outline-none focus:ring-4 focus:ring-pink-100 w-full"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                />
                                <button onClick={handleSaveName} className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg hover:scale-110 transition-all">
                                    <Check size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2 group cursor-pointer py-1" onClick={() => setIsEditingName(true)}>
                                <h2 className="text-2xl md:text-3xl font-serif-display font-bold text-[#4A2040] leading-tight">
                                    {profile.nickname || user?.displayName || 'Traveler'}
                                </h2>
                                <div className="p-1.5 bg-pink-50 rounded-full text-pink-400 group-hover:bg-pink-100 group-hover:scale-110 transition-all">
                                    <Edit2 size={14} />
                                </div>
                            </div>
                        )}
                        <p className="text-[#8E6A88] font-medium text-sm mt-1">@{user?.username || 'user'}</p>
                    </div>

                    {/* Simple Logout for Mobile (Visible) */}
                    <div className="md:hidden w-full mt-6">
                        <button
                            onClick={() => { if (window.confirm('Log out?')) signOut(); }}
                            className="w-full py-3 bg-red-50 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 border border-red-100 active:scale-95"
                        >
                            <LogOut size={18} />
                            Log Out
                        </button>
                    </div>
                </div>

                {/* RIGHT SIDE: Stats & Actions */}
                <div className="w-full md:w-7/12 p-6 lg:p-8 max-h-[70vh] md:max-h-[600px] overflow-y-auto custom-scrollbar">

                    {/* Wallet Card */}
                    <div className="bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] rounded-[24px] p-6 text-white shadow-xl shadow-pink-200 mb-8 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 opacity-20 group-hover:scale-110 transition-transform duration-700">
                            <Heart size={120} fill="currentColor" />
                        </div>
                        <div className="relative z-10">
                            <span className="text-pink-100 text-xs font-bold uppercase tracking-widest">Balance</span>
                            <div className="flex items-center gap-3 mt-1 mb-4">
                                <Heart className="fill-white" size={36} />
                                <span className="text-5xl font-black">{profile.hearts}</span>
                            </div>
                            <button
                                onClick={claimDailyBonus}
                                className="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-bold transition-all border border-white/40 flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Gift size={18} />
                                Claim Daily Bonus (Free)
                            </button>
                        </div>
                    </div>

                    {/* Avatars Grid */}
                    <div id="avatar-grid" className="mb-8">
                        <h3 className="text-[#4A2040] font-bold mb-4 flex items-center gap-2 text-lg">
                            <div className="p-1.5 bg-purple-100 rounded-lg text-purple-600"><User size={16} /></div>
                            Switch Avatar
                        </h3>
                        <div className="grid grid-cols-5 gap-3">
                            {PROFILE_AVATARS.map((url, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSelectAvatar(url)}
                                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-110 cursor-pointer ${selectedAvatar === url ? 'border-[#FF9ACB] ring-2 ring-[#FF9ACB]/30 scale-105' : 'border-transparent bg-gray-50'}`}
                                >
                                    <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Earnings History */}
                    <div className="mb-8">
                        <h3 className="text-[#4A2040] font-bold mb-4 flex items-center gap-2 text-lg">
                            <div className="p-1.5 bg-green-100 rounded-lg text-green-600"><TrendingUp size={16} /></div>
                            History
                        </h3>
                        <div className="space-y-3">
                            {(profile.earningsHistory && profile.earningsHistory.length > 0) ? (
                                profile.earningsHistory.slice(0, 4).map((record) => (
                                    <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${record.type === 'bonus' ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-500'}`}>
                                                {record.type === 'bonus' ? <Gift size={14} /> : <TrendingUp size={14} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[#4A2040]">{record.label}</p>
                                                <p className="text-[10px] text-gray-400">{new Date(record.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded-lg text-sm">+{record.amount}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm italic py-2">No history yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Laptop Logout */}
                    <div className="hidden md:block">
                        <button
                            onClick={() => { if (window.confirm('Are you sure you want to log out?')) signOut(); }}
                            className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all active:scale-95"
                        >
                            <LogOut size={20} />
                            Log Out
                        </button>
                    </div>

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
