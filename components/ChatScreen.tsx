import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Persona } from '../types';
import { ArrowLeft, Phone, Mic, Send, Heart, X, Sparkles, RefreshCw, Lock as LockIcon, Gift as GiftIcon } from 'lucide-react';
import { storage } from '../utils/storage';
import { useAuth } from '../src/contexts/AuthContext';
import { useGating } from '../src/hooks/useGating';
import { detectIntent } from '../utils/intentDetector';
import WalletWidget from './WalletWidget';
import { PERSONA_PROMPTS, FALLBACK_REPLIES } from '../src/config/personaConfig';
import { NAME_AGNOSTIC_NOTE, LANGUAGE_CONTROL_SYSTEM_MESSAGE } from '../constants';

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
  const { profile, incrementUsage, buyStarterPass } = useAuth();
  const { isMessageLimitReached, isNightTimeLocked } = useGating();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history but NO auto-greeting if empty
  useEffect(() => {
    const saved = storage.getMessages(persona.id);
    if (saved.length > 0) {
      setMessages(saved.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
    }
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
        setMessages(prev => [...prev, noHeartMsg]);
        return;
      }
    }

    if (!resendText) {
      setMessages(prev => [...prev, newUserMsg]);
      setInputText('');
      storage.saveMessage(persona.id, { ...newUserMsg, timestamp: newUserMsg.timestamp.toISOString() });
    }

    setIsTyping(true);
    const intent = detectIntent(text);
    const userMemory = storage.getMemory(persona.id);
    const personaSummary = storage.getSummary(persona.id);

    const memoryHeader = `PERSISTENT MEMORY: Facts: ${userMemory.facts?.join(', ') || 'None'}. Last Topic: ${userMemory.lastTopic}.`;

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          systemPrompt: memoryHeader + "\n" + (PERSONA_PROMPTS[persona.name] || persona.basePrompt) + "\n" + NAME_AGNOSTIC_NOTE + `\nIntent: ${intent}\nSummary: ${personaSummary}`,
          history: messages.slice(-10).map(m => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.text })),
          userMode: 'FREE'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details?.message || "Server Error");
      }

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

      {/* Input */}
      <footer className={`p-4 pb-8 ${isDarkMode ? 'bg-[#0B0E14]' : 'bg-white'} border-t ${isDarkMode ? 'border-white/10' : 'border-pink-50'}`}>
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <button
            onClick={onOpenShop}
            className={`p-3 rounded-2xl border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-pink-400' : 'bg-white border-pink-200 text-pink-500 shadow-sm'}`}
            title="Send Gift"
          >
            <GiftIcon size={20} />
          </button>

          <div className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all ${isDarkMode
            ? 'bg-white/5 border-white/20 focus-within:border-pink-500/50'
            : 'bg-white border-pink-200 shadow-sm focus-within:border-pink-400 focus-within:ring-2 focus-within:ring-pink-100'
            }`}>
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Message ${persona.name}...`}
              className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-40"
              style={{ color: isDarkMode ? 'white' : '#4A2040' }}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isTyping}
            className="p-3.5 bg-pink-500 text-white rounded-2xl disabled:opacity-50 active:scale-95 transition-transform"
          >
            <Send size={18} fill="white" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatScreen;
