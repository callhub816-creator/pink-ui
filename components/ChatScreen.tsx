import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Persona } from '../types';
import { ArrowLeft, Phone, Mic, Send, Heart, X, Sparkles, RefreshCw, Lock as LockIcon, Gift as GiftIcon } from 'lucide-react';
import { storage } from '../utils/storage';
import { useAuth } from '../src/contexts/AuthContext';
import { useGating } from '../src/hooks/useGating';
import { detectIntent } from '../utils/intentDetector';
import WalletWidget from './WalletWidget';
import GiftSelector from './GiftSelector';
import { PERSONA_PROMPTS, FALLBACK_REPLIES } from '../src/config/personaConfig';
import { NAME_AGNOSTIC_NOTE, LANGUAGE_CONTROL_SYSTEM_MESSAGE, QUALITY_BOOSTER, HEARTS_SYSTEM_MESSAGE } from '../constants';
import { useNotification } from './NotificationProvider';

interface ChatScreenProps {
  persona: Persona;
  avatarUrl?: string;
  onBack: () => void;
  onStartCall: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onOpenShop: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ persona, onBack, onStartCall, isDarkMode, onOpenShop }) => {
  const { profile, user } = useAuth();
  const { showNotification } = useNotification();
  const { isMessageLimitReached, isNightTimeLocked } = useGating();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history + Handle "Attention" trigger if away > 24h
  useEffect(() => {
    const saved = storage.getMessages(persona.id);
    const msgs = saved.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));

    const lastActive = new Date(profile.lastActive || Date.now()).getTime();
    const diff = Date.now() - lastActive;

    // Trigger specific "kahan the" message if away > 24h (per user request)
    if (diff > 24 * 60 * 60 * 1000 && persona.name.toLowerCase().includes('ayesha')) {
      const alreadySent = msgs.some(m => m.text.includes("Kahan gayab ho gaye the"));
      if (!alreadySent) {
        const awayMsg: Message = {
          id: 'away-' + Date.now(),
          sender: 'model',
          text: "Kal tum online nahi the... I missed you. Kahan gayab ho gaye the? 🥺",
          timestamp: new Date()
        };
        msgs.push(awayMsg);
        storage.saveMessage(persona.id, { ...awayMsg, timestamp: awayMsg.timestamp.toISOString() });
      }
    }

    setMessages(msgs);
  }, [persona.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = async (resendText?: string) => {
    const text = resendText || inputText;
    if (!text.trim() || isTyping) return;

    // CHECK GATING
    if (isMessageLimitReached()) {
      const limitMsg: Message = {
        id: 'limit-hit-' + Date.now(),
        sender: 'model',
        text: `She wants to continue... but your daily free messages are up 💔. Unlock unlimited chat for 24h for just ₹49!`,
        timestamp: new Date(),
        isError: true
      };
      showNotification("Daily message limit reached! Unlock unlimited chat to continue.", 'info');
      setMessages(prev => [...prev, limitMsg]);
      return;
    }

    if (isNightTimeLocked()) {
      const nightMsg: Message = {
        id: 'night-hit-' + Date.now(),
        sender: 'model',
        text: `It's late, and she's resting... 🌙 Only premium companions can talk late at night. Unlock the Starter Pass to wake her up!`,
        timestamp: new Date(),
        isError: true
      };
      showNotification("Night session locked! Starter Pass required to talk now.", 'info');
      setMessages(prev => [...prev, nightMsg]);
      return;
    }

    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date()
    };

    // SPEND HEART LOGIC (India Market Strategy)
    // Spend 1 heart if free, unless they have unlimted via Starter/Core (handled in Auth)
    if (profile.subscription === 'free') {
      const hasBalance = storage.spendHearts(1);
      if (!hasBalance) {
        const noHeartMsg: Message = {
          id: 'no-hearts-' + Date.now(),
          sender: 'model',
          text: `Suno na? She's waiting for your message... par tumhare hearts khatam ho gaye hain. 💔 refill kar lo phir baatein karte hain? ✨`,
          timestamp: new Date(),
          isError: true
        };
        showNotification("Not enough Hearts! Refill your wallet to keep talking. ❤️", 'hearts');
        setMessages(prev => [...prev, noHeartMsg]);
        return;
      }
    }

    // Always add user message to state and storage (Fixed: Now shows Gifts in chat)
    setMessages(prev => [...prev, newUserMsg]);
    storage.saveMessage(persona.id, { ...newUserMsg, timestamp: newUserMsg.timestamp.toISOString() });

    // Only clear input if we sent what was in the input box
    if (!resendText) {
      setInputText('');
    }

    setIsTyping(true);
    const intent = detectIntent(text);
    const userMemory = storage.getMemory(persona.id);
    const personaSummary = storage.getSummary(persona.id);

    // AUTH NAME SYNC: Final Boss Level Override
    const rawUserInfo = localStorage.getItem('callhub_user_info');
    const userInfo = rawUserInfo ? JSON.parse(rawUserInfo) : { age: '24', lookingFor: 'ROMANCE' };

    // We strictly use the Account Display Name or Custom Nickname if it exists
    const accountName = profile.nickname || user?.displayName || user?.username || 'User';
    userInfo.name = accountName;

    const goalInstruction = userInfo.lookingFor === 'HEALING'
      ? "Be supportive, calm, and focus on emotional healing. User is looking for comfort."
      : userInfo.lookingFor === 'FRIENDSHIP'
        ? "Be a casual, fun friend. Don't be too romantic. User is looking for a connection."
        : "Be flirtatious, deeply caring, and focus on building a romantic bond.";

    const memoryHeader = `CRITICAL SYSTEM INSTRUCTION: 
    1. The User's name is "${userInfo.name}". 
    2. NEVER use the word "User" as a name. 
    3. Always address them as "${userInfo.name}" or using sweet terms like "jaan", "dear", "sweetheart" if appropriate for romance.
    4. USER PROFILE: Name: ${userInfo.name}, Age: ${userInfo.age}, Goal: ${userInfo.lookingFor}. ${goalInstruction}
    5. PERSISTENT MEMORY: Facts: ${userMemory.facts?.join(', ') || 'None'}. Last Topic: ${userMemory.lastTopic}.`;

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          systemPrompt: memoryHeader + "\n" + (PERSONA_PROMPTS[persona.name] || persona.basePrompt) + "\n" + NAME_AGNOSTIC_NOTE + "\n" + QUALITY_BOOSTER + "\n" + HEARTS_SYSTEM_MESSAGE + `\nIntent: ${intent}\nSummary: ${personaSummary}`,
          history: messages.slice(-10).map(m => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.text })),
          userMode: 'FREE'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details?.message || "Server Error");
      }

      // --- HUMAN TYPING SIMULATION ---
      // 1. Calculate thinking time (1.5s to 3s)
      const thinkingTime = 1500 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, thinkingTime));

      // 2. Calculate typing time based on length (~30 characters per second)
      const typingSpeed = 30;
      const typingTime = (data.text.length / typingSpeed) * 1000;

      // Delay for typing (capped at 12 seconds so user doesn't wait forever)
      await new Promise(resolve => setTimeout(resolve, Math.min(typingTime, 12000)));

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'model',
        text: data.text,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, modelMsg]);
      storage.saveMessage(persona.id, { ...modelMsg, timestamp: modelMsg.timestamp.toISOString() });

      storage.saveMemory(persona.id, {
        lastMood: 'Connected',
        lastTopic: text.substring(0, 30)
      });

    } catch (err: any) {
      console.error("Chat Error:", err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'model',
        text: `⚠️ ERROR: ${err.message}. (Check Cloudflare Environment Variables if this says API Key hidden)`,
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isDarkMode ? 'bg-[#0B0E14] text-white' : 'bg-[#FDF2F8] text-[#4A2040]'}`}>

      {/* Header */}
      <header className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'bg-[#0B0E14] border-white/10' : 'bg-white border-pink-100'}`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2"><ArrowLeft size={20} /></button>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-pink-200 overflow-hidden border-2 border-white">
              <img src={persona.avatarUrl} alt={persona.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-bold text-sm">{persona.name}</h2>
              <span className="text-[10px] opacity-60 italic">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <WalletWidget isDarkMode={isDarkMode} onOpenShop={onOpenShop} />
          <button
            onClick={() => { }} // Disabled as requested
            className="p-2.5 rounded-full bg-pink-100/50 text-pink-400 cursor-not-allowed border border-pink-200"
            title="Premium Connection Required"
          >
            <Phone size={20} />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${msg.sender === 'user'
              ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-br-none'
              : msg.isError
                ? 'bg-red-50 border border-red-200 text-red-600 text-xs'
                : isDarkMode ? 'bg-white/10 text-white rounded-bl-none' : 'bg-white text-[#4A2040] rounded-bl-none border border-pink-50'
              }`}>
              {msg.text}
            </div>
            <span className="text-[9px] opacity-40 mt-1 px-1">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-1 p-2">
            <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {/* Input Section */}
      <footer className={`relative p-4 pb-8 border-t transition-colors ${isDarkMode ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-gray-100'
        }`}>

        {isGiftOpen && (
          <GiftSelector
            isDarkMode={isDarkMode}
            companionId={persona.id}
            companionName={persona.name}
            onClose={() => setIsGiftOpen(false)}
            onGiftSent={(name, icon) => {
              const giftText = `*Gifts ${name} ${icon}*`;
              handleSend(giftText);
            }}
          />
        )}

        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          {/* Action Button: Gift */}
          <button
            onClick={() => setIsGiftOpen(!isGiftOpen)}
            className={`p-3 rounded-2xl transition-all duration-300 active:scale-90 ${isGiftOpen
              ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
              : isDarkMode
                ? 'bg-white/5 text-pink-400 border border-white/10 hover:bg-white/10'
                : 'bg-white text-pink-500 border border-pink-100 shadow-sm hover:border-pink-300'
              }`}
          >
            <GiftIcon size={22} strokeWidth={2.5} />
          </button>

          {/* Main Input Box (NUCLEAR FOCUS FIX) */}
          <div className={`flex-1 flex items-center px-5 py-3 rounded-[24px] border-2 transition-all duration-300 ${isDarkMode
            ? 'bg-white/5 border-white/10 focus-within:border-pink-500/50'
            : 'bg-white border-[#FF69B4] focus-within:border-[#FF1A8C] shadow-[0_0_15px_rgba(255,105,180,0.15)]'
            }`}>
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Write something to ${persona.name}...`}
              className="flex-1 bg-transparent text-[15px] font-medium placeholder:opacity-40 p-0"
              style={{
                color: isDarkMode ? 'white' : '#4A2040',
                outline: 'none',
                border: 'none',
                boxShadow: 'none',
                WebkitAppearance: 'none'
              }}
            />
          </div>

          {/* Action Button: Send */}
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isTyping}
            className={`p-3.5 rounded-2xl transition-all duration-300 active:scale-90 shadow-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-[#FF9ACB] to-[#B28DFF] text-white ${!inputText.trim() || isTyping
              ? 'opacity-50 cursor-not-allowed shadow-none grayscale-[0.3]'
              : 'shadow-pink-500/30 ring-2 ring-pink-200/50 hover:scale-105'
              }`}
          >
            <Send size={22} fill="currentColor" strokeWidth={2.5} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatScreen;
