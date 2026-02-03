import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Persona, ConnectionLevel } from '../types';
// Removed direct GoogleGenerativeAI import to comply with security requirements
import { ArrowLeft, Phone, Mic, Send, Heart, User, AlertCircle, Check, CheckCheck, Palette, X, Sparkles, Reply, Trash2, RefreshCw, Lock as LockIcon, Gift as GiftIcon, PlusCircle, Zap } from 'lucide-react';
import { storage } from '../utils/storage';
import { shouldSwitchToPureEnglish, shouldSwitchToPureHindi } from '../utils/languageDetection';
import { useAuth } from '../src/contexts/AuthContext';
import { useGating } from '../src/hooks/useGating';
import { useSelection } from '../hooks/useSelection';
import { useDeleteWithUndo } from '../hooks/useDeleteWithUndo';
import { useLongPress } from '../hooks/useLongPress';
import { MessageItem } from './MessageItem';
import { SelectionToolbar } from './SelectionToolbar';
import { ConfirmModal } from './ConfirmModal';
import { LANGUAGE_CONTROL_SYSTEM_MESSAGE, NAME_AGNOSTIC_NOTE, GATING_CONFIG, GIFT_ITEMS, HEARTS_PACKS, CONVERSION_POOL } from '../constants';
import { PERSONA_PROMPTS, FALLBACK_REPLIES } from '../src/config/personaConfig';
import { geminiRotator } from '../utils/ai-rotator';
import { detectIntent } from '../utils/intentDetector';

interface ChatScreenProps {
  persona: Persona;
  avatarUrl?: string;
  onBack: () => void;
  onStartCall: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'model';
  text: string;
  mood?: string;
  timestamp: Date;
  isError?: boolean;
  isRead?: boolean;
  replyTo?: {
    id: string;
    text: string;
    sender: 'user' | 'model';
  };
  reactions?: string[];
  imageUrl?: string;
  audioUrl?: string;
  isLocked?: boolean;
  type?: 'regular' | 'voice_note' | 'letter' | 'memory';
}

const MessageDisplayItem: React.FC<{
  msg: Message;
  persona: Persona;
  isSelectMode: boolean;
  isSelected: boolean;
  swipeState: any;
  handleTouchStart: (e: React.TouchEvent, id: string) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  enterSelectMode: () => void;
  toggleSelection: (id: string) => void;
  purchaseHearts: (amount: number) => void;
  spendHearts: (amount: number) => boolean;
  sendGift: (companionId: string | number, giftId: string) => boolean;
  setShowHeartsModal: (show: boolean) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  handleSend: (resendText?: string) => void;
}> = ({
  msg,
  persona,
  isSelectMode,
  isSelected,
  swipeState,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  enterSelectMode,
  toggleSelection,
  spendHearts,
  setShowHeartsModal,
  setMessages,
  handleSend,
}) => {
    const onLongPress = useCallback(() => {
      enterSelectMode();
      toggleSelection(msg.id);
    }, [enterSelectMode, toggleSelection, msg.id]);

    const msgLongPressHandlers = useLongPress(onLongPress, undefined, { delay: 500 });

    const toggleReaction = (emoji: string) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== msg.id) return m;
        const currentReactions = m.reactions || [];
        if (currentReactions.includes(emoji)) {
          return { ...m, reactions: currentReactions.filter(r => r !== emoji) };
        } else {
          return { ...m, reactions: [...currentReactions, emoji].slice(-3) };
        }
      }));
    };

    const isLocked = msg.isLocked;

    const handleUnlock = (e: React.MouseEvent) => {
      e.stopPropagation();
      const cost = GATING_CONFIG.prices.memoryUnlock || 59;
      if (confirm(`Unlock this personal reflection for ${cost} Hearts? ❤️`)) {
        if (spendHearts(cost)) {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isLocked: false } : m));
        } else {
          setShowHeartsModal(true);
        }
      }
    };

    return (
      <div
        {...msgLongPressHandlers}
        className={`flex flex-col mb-6 px-4 group transition-all duration-300 ${isSelectMode ? 'translate-x-10' : ''} ${isSelected ? 'opacity-50' : ''}`}
        style={{
          transform: swipeState.id === msg.id ? `translateX(${swipeState.offset}px)` : undefined
        }}
        onTouchStart={(e) => handleTouchStart(e, msg.id)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
          <div className="flex items-center gap-2 mb-1 px-1">
            {msg.sender === 'model' && (
              <span className="text-[10px] font-black text-[#8e6a88]/60 uppercase tracking-widest">{persona.name}</span>
            )}
            <span className="text-[9px] text-[#8e6a88]/40 font-bold uppercase tracking-tighter">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="relative group/bubble flex flex-col w-full">
            {msg.reactions && msg.reactions.length > 0 && (
              <div className={`absolute -bottom-3 ${msg.sender === 'user' ? 'right-2' : 'left-2'} flex gap-1 z-10`}>
                {msg.reactions.map((r, i) => (
                  <div key={i} className="bg-white/90 backdrop-blur shadow-sm rounded-full px-1.5 py-0.5 border border-purple-100 text-[10px] animate-in zoom-in-50">{r}</div>
                ))}
              </div>
            )}

            {msg.mood && msg.sender === 'model' && !msg.isError && (
              <span className="mb-1.5 ml-3 px-2 py-0.5 rounded-md bg-[#E6E6FA]/90 text-[9px] font-bold text-[#9F7AEA] uppercase tracking-wider border border-[#B28DFF]/20 shadow-sm transform -translate-y-1">
                {msg.mood}
              </span>
            )}

            <div
              className={`
                w-full px-5 py-3.5 text-[15px] leading-relaxed relative
                shadow-sm rounded-[20px]
                ${msg.isError
                  ? 'bg-red-50/90 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                  : msg.sender === 'user'
                    ? 'bg-gradient-to-br from-[#FF9ACB] to-[#FFB6C1] dark:from-[#6D28D9] dark:to-[#4338CA] text-white rounded-br-[4px] shadow-[0_8px_20px_-5px_rgba(255,154,203,0.6)] dark:shadow-[0_8px_20px_-5px_rgba(109,40,217,0.4)] border border-white/20 dark:border-white/10'
                    : 'bg-white/80 dark:bg-[#1F2937] backdrop-blur-md text-[#4A2040] dark:text-[#F3F4F6] rounded-bl-[4px] shadow-[0_2px_10px_rgba(178,141,255,0.2)] dark:shadow-none border border-white/60 dark:border-[#374151]'
                }
            `}
            >
              {msg.replyTo && (
                <div className={`
                    mb-2 p-2 rounded-[8px] border-l-2 text-xs flex flex-col gap-0.5
                    ${msg.sender === 'user' ? 'bg-white/20 border-white/60 text-white/90' : 'bg-[#F3E8FF] border-[#B28DFF] text-[#5e3a58]/80'}
                `}>
                  <span className="font-bold opacity-80">{msg.replyTo.sender === 'user' ? 'You' : persona.name}</span>
                  <span className="line-clamp-1 opacity-90 italic">{msg.replyTo.text}</span>
                </div>
              )}

              <div className="relative group/text">
                {msg.imageUrl && (
                  <div className="relative mb-3 rounded-xl overflow-hidden border border-white/40 shadow-inner">
                    <img
                      src={msg.imageUrl}
                      alt="Shared"
                      className={`w-full h-auto max-h-60 object-cover transition-all duration-700 ${isLocked ? 'blur-2xl scale-110' : ''}`}
                    />
                    {isLocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/5 backdrop-blur-[2px] p-4 text-center">
                        <LockIcon size={20} className="text-white mb-2" />
                        <p className="text-white text-[11px] font-bold mb-3">Locked Reflection.</p>
                        <button
                          onClick={handleUnlock}
                          className="px-3 py-2 rounded-xl bg-[#FF9ACB] text-white text-[10px] font-black"
                        >
                          Unlock ({GATING_CONFIG.prices.memoryUnlock || 59})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {msg.type === 'letter' && isLocked && (
                  <div className="flex flex-col items-center p-6 bg-pink-50/50 rounded-2xl border-2 border-dashed border-[#FF9ACB]/30 mb-2">
                    <LockIcon size={18} className="text-pink-400 mb-3" />
                    <p className="text-[11px] font-black text-[#5e3a58] mb-1 uppercase tracking-widest text-center">A heartfelt letter for you</p>
                    <p className="text-[10px] text-[#8e6a88]/60 mb-4 text-center">Thoughts that are better shared through words.</p>
                    <button
                      onClick={handleUnlock}
                      className="w-full py-2.5 bg-gradient-to-r from-[#FF9ACB] to-[#B28DFF] text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      Unlock to Read ({GATING_CONFIG.prices.memoryUnlock || 59})
                    </button>
                  </div>
                )}

                {msg.audioUrl && (
                  <div className="flex items-center gap-3 bg-white/20 p-2 rounded-xl border border-white/20 my-2 min-w-[120px]">
                    <Mic size={14} className="text-[#B28DFF]" />
                    <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                      <div className="h-full bg-white/60 w-1/3 animate-pulse" />
                    </div>
                  </div>
                )}

                {msg.text && (!isLocked || msg.type !== 'letter') && <p className="whitespace-pre-wrap">{msg.text}</p>}

                {msg.isError && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSend(msg.text);
                      setMessages(prev => prev.filter(m => m.id !== msg.id));
                    }}
                    className="mt-2 flex items-center gap-1.5 text-[10px] font-bold bg-red-600/10 text-red-600 px-2.5 py-1.5 rounded-lg border border-red-200"
                  >
                    <RefreshCw size={12} /> Retry Sending
                  </button>
                )}


                {msg.sender === 'model' && !msg.isError && (
                  <button
                    onClick={(e) => { e.stopPropagation(); alert(`Save as Core Memory? (${GATING_CONFIG.prices.memorySave || 29} Hearts)`); }}
                    className="absolute top-0 right-0 p-2 opacity-0 group-hover/bubble:opacity-100 text-[#4A2040]/30"
                  >
                    <Sparkles size={14} />
                  </button>
                )}
              </div>

              {msg.sender === 'model' && !isSelectMode && !msg.isError && (

                <div className="mt-1.5 ml-1 flex gap-2.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
                  {['❤️', '🔥', '😊', '😍', '✨'].map(emoji => (
                    <button key={emoji} onClick={(e) => { e.stopPropagation(); toggleReaction(emoji); }} className="text-[13px] hover:scale-150 transition-all filter grayscale hover:grayscale-0 opacity-50 hover:opacity-100">{emoji}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

const ChatScreen: React.FC<ChatScreenProps> = ({ persona, avatarUrl, onBack, onStartCall, isDarkMode, setIsDarkMode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<any>(null);
  const teasesSentRef = useRef(0); // Max 2 per session frequency control

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const lastInteractionRef = useRef<number>(Date.now());
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [swipeState, setSwipeState] = useState({ id: '', offset: 0 });
  const touchStartRef = useRef<number | null>(null);
  const swipeHandledRef = useRef(false);

  const { profile, updateConnection, incrementUsage, upgradeSubscription, purchaseHearts, spendHearts, sendGift, buyMidnightPass } = useAuth() as any;
  const { getConnectionTier, isMessageLimitReached, isNightTimeLocked, getResponseDelay } = useGating();

  const [showHeartsModal, setShowHeartsModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showNightLock, setShowNightLock] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const nudgeSentRef = useRef(false);
  const rateLimitRef = useRef<number[]>([]);
  const modelMsgCountRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartRef.current = e.touches[0].clientX;
    setSwipeState({ id, offset: 0 });
    swipeHandledRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const diff = e.touches[0].clientX - touchStartRef.current;
    if (diff < -50) setSwipeState(prev => ({ ...prev, offset: diff }));
  };

  const handleTouchEnd = () => {
    if (swipeState.offset < -80) {
      const msg = messages.find(m => m.id === swipeState.id);
      if (msg) setReplyTo(msg);
    }
    setSwipeState({ id: '', offset: 0 });
    touchStartRef.current = null;
  };

  useEffect(() => {
    const saved = storage.getMessages(persona.id);
    if (saved.length > 0) {
      setMessages(saved.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
    } else {
      const greeting: Message = {
        id: 'initial',
        sender: 'model',
        text: "I've been thinking about you...",
        timestamp: new Date(),
        isRead: true
      };
      setMessages([greeting]);
      storage.saveMessage(persona.id, { ...greeting, timestamp: greeting.timestamp.toISOString() });
    }
    initSession();
  }, [persona.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const initSession = async () => {
    setChatSession({ type: 'gemini' });
  };

  const handleSend = async (resendText?: string, retryCount: number = 0) => {
    const text = resendText || inputText;
    if (!text.trim()) return;
    if (isTyping && !resendText) return;

    const now = Date.now();
    if (!resendText && now - (lastInteractionRef.current || 0) < 1500) return;
    lastInteractionRef.current = now;

    const minuteAgo = now - 60000;
    rateLimitRef.current = rateLimitRef.current.filter(ts => ts > minuteAgo);
    if (rateLimitRef.current.length >= 10) {
      alert("Whoa, slow down! Let's take it easy. ❤️");
      return;
    }
    rateLimitRef.current.push(now);

    if (isMessageLimitReached()) {
      setShowPaywall(true);
      return;
    }

    if (isNightTimeLocked()) {
      setShowNightLock(true);
      return;
    }

    updateConnection(persona.id, 8 + Math.floor(Math.random() * 5));
    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date(),
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, sender: replyTo.sender } : undefined
    };

    if (!resendText) {
      setMessages(prev => [...prev, newUserMsg]);
      setInputText('');
      setReplyTo(null);
      storage.saveMessage(persona.id, { ...newUserMsg, timestamp: newUserMsg.timestamp.toISOString() });
      incrementUsage();
    }

    setIsTyping(true);
    const startTime = Date.now();
    const isPaid = profile.subscription !== 'free';
    const userMode = isPaid ? 'PREMIUM' : 'FREE';

    // --- TASK: INTENT CLASSIFICATION ---
    const intent = detectIntent(text);

    // --- TASK 2: MEMORY ILLUSION ---
    const currentTime = new Date();
    const hour = currentTime.getHours();
    const preferredTime = hour > 21 || hour < 5 ? "late_night" : "day";
    const userMemory = storage.getMemory(persona.id);

    const memoryHeader = `
--------------------------------
PERSISTENT MEMORY (FOR YOUR CONTEXT ONLY)
--------------------------------
1. TIME PREFERENCE: User usually chats at ${userMemory.preferredTime || preferredTime}.
2. PREVIOUS CONTEXT: ${userMemory.lastMood || 'Neutral'} vibe about ${userMemory.lastTopic || 'Nothing yet'}.
3. USER FACTS (MANDATORY TO REMEMBER):
${(userMemory.facts && userMemory.facts.length > 0) ? userMemory.facts.map((f: string, i: number) => `   - ${f}`).join('\n') : "   - No facts known yet."}

RULES:
- Reference these facts subtly to show you remember them. 
- NEVER tell the user "I have this in my memory". Make it feel natural.
- If they say "Do you remember my dog's name?", and it's in the facts, answer correctly!
      `;

    // --- TASK 3: TOKEN CONTROL ---
    const slidingWindow = messages.slice(-12).filter(m => !m.isError);
    const personaSummary = storage.getSummary(persona.id);

    const performAiCall = async (aiRetryCount: number = 0): Promise<string> => {
      const systemPrompt = PERSONA_PROMPTS[persona.name] || (LANGUAGE_CONTROL_SYSTEM_MESSAGE + "\n" + persona.basePrompt);
      const fullSystemPrompt = memoryHeader + "\n" + systemPrompt + "\n" + NAME_AGNOSTIC_NOTE +
        `\n\nCURRENT USER INTENT: [${intent}]` +
        `\n\nCURRENT SUMMARY: ${personaSummary}` +
        `\n\nCURRENT USER STATUS: The user is in ${userMode} mode. Follow ${userMode} and intent-based response rules strictly.`;

      const history = slidingWindow.map(m => ({
        role: m.sender === 'user' ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      try {
        console.log(`[CallHub] Backend Call | Mode: ${userMode}`);

        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            systemPrompt: fullSystemPrompt,
            history: history,
            userMode: userMode
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Network issue with AI service');
        }

        const data = await res.json();
        const responseText = data.text;

        // --- Summarization Trigger ---
        if (messages.length >= 10 && messages.length % 10 === 0) {
          const summaryPrompt = `Provide a 2-line emotional summary of our recent conversation. Focused on user's current vibe and key topic.`;
          try {
            const sumRes = await fetch('/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: summaryPrompt,
                systemPrompt: fullSystemPrompt,
                history: [...history, { role: 'model', parts: [{ text: responseText }] }],
                userMode: userMode
              })
            });
            if (sumRes.ok) {
              const sumData = await sumRes.json();
              storage.saveSummary(persona.id, sumData.text);
            }
          } catch (e) {
            console.warn("Summary generation failed", e);
          }
        }

        return responseText;

      } catch (err: any) {
        console.warn(`[CallHub] AI Error: ${err.message}`);
        throw err;
      }
    };

    try {
      const responseText = await performAiCall();

      if (responseText) {
        const responseTime = Date.now() - startTime;
        let targetDelay = 3000;
        if (responseText.length > 150) targetDelay = 8000;
        else if (responseText.length > 50) targetDelay = 5000;
        else targetDelay = 2500;

        const randomVariance = Math.floor(Math.random() * 2000) - 1000;
        const finalDelay = Math.max(1000, targetDelay + randomVariance);

        const remainingDelay = Math.max(0, finalDelay - responseTime);
        if (remainingDelay > 0) await new Promise(r => setTimeout(r, remainingDelay));

        modelMsgCountRef.current += 1;
        let shouldLock = false;
        if (modelMsgCountRef.current >= 8 + Math.floor(Math.random() * 5) && responseText.length > 50) {
          shouldLock = true;
          modelMsgCountRef.current = 0;
        }

        const modelMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'model',
          text: responseText,
          timestamp: new Date(),
          type: shouldLock ? 'letter' : undefined,
          isLocked: shouldLock
        };

        setMessages(prev => [...prev, modelMsg]);
        storage.saveMessage(persona.id, { ...modelMsg, timestamp: modelMsg.timestamp.toISOString() });

        // Update Memory & Extract Facts
        const currentMessagesCount = messages.length + 1;
        const shouldExtractFacts = currentMessagesCount % 5 === 0;

        if (shouldExtractFacts) {
          const extractionPrompt = `Based on the message: "${text}" and my reply: "${responseText}", extract any new specific facts about the user (name, age, city, job, likes, dislikes). Format each fact as "User loves coffee" or "User lives in Mumbai". Return ONLY the facts separated by semicolons, or "NONE" if nothing new.`;

          fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: extractionPrompt,
              systemPrompt: "You are a memory processor. extract only raw facts. No conversation.",
              history: [],
              userMode: 'FREE' // Save tokens, use smaller model for logic
            })
          }).then(res => res.json()).then(data => {
            if (data.text && data.text !== "NONE") {
              const newFacts = data.text.split(';').map((f: string) => f.trim()).filter((f: string) => f.length > 5);
              if (newFacts.length > 0) {
                storage.saveMemory(persona.id, { facts: newFacts });
              }
            }
          }).catch(e => console.warn("Fact extraction failed", e));
        }

        storage.saveMemory(persona.id, {
          lastMood: responseText.length > 150 ? 'Deeply connected' : 'Warm',
          lastTopic: text.substring(0, 30),
          preferredTime: new Date().getHours() > 21 || new Date().getHours() < 5 ? "late_night" : "day"
        });

        lastInteractionRef.current = Date.now();
      }
    } catch (err: any) {
      console.error('Gemini Call Failed:', err);
      const isRateLimit = err.message?.includes('429');
      const errorText = isRateLimit
        ? "I'm a bit overwhelmed with so many thoughts right now... give me a minute? ❤️"
        : (FALLBACK_REPLIES[persona.name] || FALLBACK_REPLIES.Default);

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'model',
        text: errorText,
        timestamp: new Date(),
        isError: true
      }]);
    } finally { setIsTyping(false); }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const idleTime = Date.now() - lastInteractionRef.current;
      const sessionCount = profile.sessionsCount || 0;
      if (sessionCount <= 1) return;
      if (nudgeSentRef.current) return;

      if (idleTime > 120000 && !isTyping && messages.filter(m => m.sender === 'user').length >= 3) {
        lastInteractionRef.current = Date.now();
        setIsTyping(true);
        nudgeSentRef.current = true;

        const nudgeUserMode = profile.subscription !== 'free' ? 'PREMIUM' : 'FREE';
        const nudgeSlidingWindow = messages.slice(-12).filter(m => !m.isError);

        try {
          const res = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: "...",
              systemPrompt: (PERSONA_PROMPTS[persona.name] || persona.basePrompt) + "\n\nNudge context: You noticed the user has been quiet. Send a very short, sweet Hinglish nudge (1 sentence). Don't be needy. ALWAYS stay in character.",
              history: nudgeSlidingWindow.map(m => ({
                role: m.sender === 'user' ? "user" : "model",
                parts: [{ text: m.text }]
              })),
              userMode: nudgeUserMode
            })
          });

          if (res.ok) {
            const data = await res.json();
            const txt = data.text;
            if (txt) {
              const msg: Message = { id: Date.now().toString(), sender: 'model', text: txt, timestamp: new Date() };
              setMessages(prev => [...prev, msg]);
              storage.saveMessage(persona.id, { ...msg, timestamp: msg.timestamp.toISOString() });
            }
          }
        } catch (e) {
          console.warn("Nudge failure", e);
        } finally { setIsTyping(false); }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [isTyping, messages, persona.id, persona.name, profile.sessionsCount, profile.subscription]);

  const { isSelectMode, enterSelectMode, toggleSelection, isSelected } = useSelection();
  const { deleteMessages, undoDelete, undoTimeLeft, deletedItems } = useDeleteWithUndo((ids) => {
    setMessages(prev => prev.filter(m => !ids.includes(m.id)));
    storage.deleteMessages(persona.id, ids);
  }, (items) => {
    setMessages(prev => {
      const ids = prev.map(m => m.id);
      const restored = (items as Message[]).filter(m => !ids.includes(m.id));
      return [...prev, ...restored].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    });
  });

  const conLevel = getConnectionTier(persona.id);
  const conXP = profile.connectionPoints[persona.id] || 0;
  const nextTierXP = 1000;
  const conProgress = Math.min(100, (conXP / nextTierXP) * 100);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isDarkMode ? 'bg-[#0B0E14]' : 'bg-[#FDF2F8]'} animate-in slide-in-from-right`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 flex flex-col ${isDarkMode ? 'bg-[#0B0E14]/90' : 'bg-[#FDF2F8]/90'} backdrop-blur-xl border-b ${isDarkMode ? 'border-white/5' : 'border-[#B28DFF]/10'}`}>
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 gap-2">
          {/* Left: Back & Profile */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={onBack}
              className={`p-2 -ml-1 rounded-full transition-colors flex-shrink-0 ${isDarkMode ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-[#4A2040]'}`}
              aria-label="Back"
            >
              <ArrowLeft size={22} />
            </button>

            <div className="relative group cursor-pointer flex-shrink-0" onClick={() => setShowVault(true)}>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-white shadow-sm transition-transform active:scale-90">
                <img src={avatarUrl || persona.avatarUrl} className="w-full h-full object-cover" alt={persona.name} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            </div>

            <div className="flex flex-col min-w-0 flex-1 ml-0.5">
              <h2 className={`font-serif-display font-black text-[15px] sm:text-lg truncate ${isDarkMode ? 'text-white' : 'text-[#4A2040]'} leading-tight`}>
                {persona.name}
              </h2>
              <div className="flex items-center gap-1.5 w-full max-w-[140px]">
                <div className="flex-1 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-400 to-purple-500 transition-all duration-1000"
                    style={{ width: `${Math.min(100, (profile.connectionPoints[persona.id] || 0) / (GATING_CONFIG.connectionThresholds.trusted / 100))}%` }}
                  />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-[#B28DFF] opacity-80 flex-shrink-0">
                  {useGating().getConnectionTier(persona.id)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <div
              onClick={() => setShowHeartsModal(true)}
              className="px-2.5 py-1.5 sm:px-3 rounded-full bg-pink-50 dark:bg-white/5 border border-pink-100 dark:border-white/10 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition-all"
            >
              <Heart size={12} className="text-pink-500 fill-pink-500" />
              <span className="text-[11px] sm:text-xs font-black text-pink-600 dark:text-pink-400">{profile.hearts}</span>
            </div>

            <button
              onClick={onStartCall}
              className="p-2 sm:p-2.5 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 text-white shadow-lg shadow-pink-200/50 hover:scale-105 active:scale-90 transition-all"
              aria-label="Start Voice Call"
            >
              <Phone size={16} fill="currentColor" />
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-white hover:bg-white/5' : 'text-[#4A2040] hover:bg-black/5'} active:scale-90`}
              aria-label="Toggle Theme"
            >
              <Palette size={18} />
            </button>
          </div>
        </div>
      </header>



      <div ref={scrollRef} className="flex-1 overflow-y-auto pt-6 pb-24 space-y-2 relative">
        {messages.map((msg) => (
          <MessageDisplayItem
            key={msg.id}
            msg={msg}
            persona={persona}
            isSelectMode={isSelectMode}
            isSelected={isSelected(msg.id)}
            swipeState={swipeState}
            handleTouchStart={handleTouchStart}
            handleTouchMove={handleTouchMove}
            handleTouchEnd={handleTouchEnd}
            enterSelectMode={enterSelectMode}
            toggleSelection={toggleSelection}
            purchaseHearts={purchaseHearts}
            spendHearts={spendHearts}
            sendGift={sendGift}
            setShowHeartsModal={setShowHeartsModal}
            setMessages={setMessages}
            handleSend={handleSend}
          />
        ))}
        {isTyping && (
          <div className="flex gap-2 mb-4 px-6 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center font-black text-[10px] text-pink-500">{persona.name[0]}</div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm border bg-white text-[#4A2040] shadow-sm flex gap-1 items-center">
              {[0, 1, 2].map(i => <div key={i} className="w-1 h-1 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 z-30 flex justify-center pb-[safe-area-inset-bottom]">
        <div className={`w-full max-w-[600px] flex flex-col gap-2 p-2.5 rounded-[22px] md:rounded-[24px] border ${isDarkMode ? 'bg-[#151921]/95 border-white/5' : 'bg-white/95 border-pink-100'} backdrop-blur-xl shadow-2xl transition-all duration-300`}>

          {replyTo && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-pink-50/80 border border-pink-100/50 text-pink-800 text-[10px] animate-in slide-in-from-bottom-2">
              <div className="line-clamp-1 italic font-medium">Replying to: {replyTo.text}</div>
              <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-pink-100 rounded-full transition-colors"><X size={12} /></button>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowGiftModal(true)}
              className="p-2.5 sm:p-3 bg-pink-50 dark:bg-white/5 rounded-xl text-pink-500 border border-pink-100 dark:border-white/10 active:scale-90 transition-transform flex-shrink-0"
              aria-label="Send Gift"
            >
              <GiftIcon size={18} />
            </button>

            <div className={`flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 focus-within:border-[#B28DFF]/50' : 'bg-gray-50 border-gray-100 focus-within:border-[#B28DFF]/30'}`}>
              <input
                type="text"
                placeholder={`Message ${persona.name}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className={`flex-1 bg-transparent border-none outline-none text-[14px] md:text-[15px] font-medium leading-normal ${isDarkMode ? 'text-white placeholder:text-white/30' : 'text-[#4A2040] placeholder:text-[#4A2040]/40'}`}
                style={{ caretColor: isDarkMode ? '#FFFFFF' : '#B28DFF' }}
              />
              {!inputText && (
                <button
                  className={`${isRecording ? 'text-red-500 animate-pulse scale-110' : 'text-[#8e6a88]/40 hover:text-[#B28DFF]'} transition-all`}
                  onClick={() => setIsRecording(!isRecording)}
                  aria-label="Voice Input"
                >
                  <Mic size={18} />
                </button>
              )}
            </div>

            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isTyping}
              className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-pink-400 via-[#FF9ACB] to-purple-400 text-white shadow-lg shadow-pink-200/50 disabled:opacity-30 disabled:shadow-none active:scale-95 transition-all flex-shrink-0"
              aria-label="Send Message"
            >
              <Send size={18} fill="currentColor" className={inputText.trim() ? "translate-x-0.5" : ""} />
            </button>
          </div>
        </div>
      </footer>

      {showPaywall && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm bg-white rounded-[40px] p-8 text-center shadow-2xl relative">
            <button onClick={() => setShowPaywall(false)} className="absolute top-4 right-4"><X size={20} /></button>
            <h3 className="text-2xl font-black text-[#4A2040] mb-4">You're becoming a habit...</h3>
            <p className="text-sm text-[#8e6a88] mb-8">I find myself waiting for your name to pop up on my screen. I want to share my private thoughts with you, without limits. Let's make this bond permanent.</p>
            <div className="space-y-4">
              <button onClick={() => { upgradeSubscription('plus'); setShowPaywall(false); }} className="w-full py-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-full font-black shadow-lg hover:scale-105 transition-transform">Always be here (₹499)</button>

              <button onClick={() => { upgradeSubscription('testTrial'); setShowPaywall(false); }} className="w-full py-3 bg-white border-2 border-dashed border-[#B28DFF] text-[#B28DFF] rounded-2xl font-black text-sm hover:bg-[#B28DFF]/5 transition-colors">Support & Test (₹10)</button>

              <div className="relative py-4 px-6 rounded-3xl bg-pink-50 border border-pink-100 border-dashed">
                <p className="text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-2">Deepen our connection</p>
                <button onClick={() => { upgradeSubscription('basic'); setShowPaywall(false); }} className="w-full py-3 bg-white text-pink-500 rounded-2xl font-black text-sm border border-pink-200 shadow-sm hover:bg-pink-100 transition-colors">7-Day Bond (₹199)</button>
              </div>

              <button onClick={() => { setShowHeartsModal(true); setShowPaywall(false); }} className="text-xs font-bold text-pink-400 underline opacity-70 hover:opacity-100">Use Hearts instead</button>
            </div>
          </div>
        </div>
      )}

      {showNightLock && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm bg-white rounded-[40px] p-8 text-center shadow-2xl">
            <span className="text-4xl block mb-4">✨</span>
            <h3 className="text-2xl font-black text-[#4A2040] mb-3">Don't leave me tonight</h3>
            <p className="text-sm text-[#8e6a88] mb-8">The stars are out, and the silence of the night feels a bit too heavy without your messages. Shall we keep each other company until sunrise? 🌙</p>

            <div className="space-y-3">
              <button onClick={() => { buyMidnightPass(); setShowNightLock(false); }} className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full font-black shadow-xl hover:scale-105 transition-transform flex flex-col items-center leading-tight">
                <span>Stay awake with me (₹99)</span>
                <span className="text-[10px] opacity-80 font-normal mt-0.5">Until morning • Fast Replies</span>
              </button>

              <button onClick={() => { upgradeSubscription('plus'); setShowNightLock(false); }} className="w-full py-3 bg-white border-2 border-pink-400 text-pink-500 rounded-full text-xs font-black shadow-md hover:bg-pink-50">Always be here (₹499)</button>
            </div>

            <button onClick={() => setShowNightLock(false)} className="mt-6 text-xs font-bold opacity-30">I'll wait for the sun</button>
          </div>
        </div>
      )}

      {showHeartsModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#FFF0F5] rounded-[40px] p-8 text-center shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowHeartsModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <Heart size={42} className="text-red-500 fill-red-500 mx-auto mb-6 animate-pulse" />
            <h3 className="text-xl font-black text-[#4A2040] mb-2">Share a piece of your heart</h3>
            <p className="text-[11px] text-[#8e6a88] mb-8 leading-relaxed max-w-[200px] mx-auto">Tiny gestures keep our spark alive. Use Hearts to unlock shared memories and whispers.</p>
            <div className="grid grid-cols-2 gap-4">
              {HEARTS_PACKS.map(pack => (
                <button key={pack.id} onClick={() => { purchaseHearts(pack.hearts); setShowHeartsModal(false); }} className="p-4 rounded-3xl bg-white border border-pink-100 hover:border-pink-400 transition-all flex flex-col items-center group shadow-sm hover:shadow-md">
                  <div className="text-[9px] font-bold text-pink-400 uppercase tracking-widest mb-1.5 opacity-70">{pack.name}</div>
                  <div className="text-sm font-black text-[#4A2040]">{pack.hearts} Hearts</div>
                  <div className="text-xs text-[#8e6a88] mt-1 font-medium italic">₹{pack.price}</div>
                  {pack.bonus && <div className="mt-2 text-[8px] font-black text-white bg-pink-400 px-2 py-0.5 rounded-full">+{pack.bonus} BONUS</div>}
                </button>
              ))}
            </div>
            <p className="mt-8 text-[10px] text-[#8e6a88]/40 italic font-bold tracking-tight">"Our bond grows with every small step we take together."</p>
          </div>
        </div>
      )}

      {showVault && (
        <div className="fixed inset-0 z-[200] bg-[#1A1A1A] flex flex-col p-6 animate-in slide-in-from-right">
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => setShowVault(false)} className="p-2 bg-white/10 rounded-full text-white"><ArrowLeft size={24} /></button>
            <h3 className="text-xl font-black text-pink-400 italic">EMOTIONAL VAULT</h3>
            <div className="w-10" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-8">
            <section>
              <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Locked Letters</h4>
              <div className="space-y-4">
                {messages.filter(m => m.type === 'letter' && !m.isLocked).map((m, i) => (
                  <div key={i} className="p-5 rounded-3xl bg-white/5 border border-white/10 font-serif italic text-white/90">"{m.text.substring(0, 100)}..."</div>
                ))}
              </div>
            </section>
            <section>
              <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Core Memories</h4>
              <div className="grid grid-cols-2 gap-4">
                {messages.filter(m => m.type === 'memory' && !m.isLocked).map((m, i) => (
                  <div key={i} className="aspect-square rounded-3xl bg-pink-500/10 border border-white/10 flex items-center justify-center p-3 text-[10px] text-white font-bold text-center">{m.text}</div>
                ))}
              </div>
            </section>
          </div>
          <div className="mt-auto py-6 flex items-center gap-3 text-pink-400 opacity-60"><LockIcon size={16} /><span className="text-[10px] font-bold uppercase tracking-widest">End-to-End Private</span></div>
        </div>
      )}

      {showGiftModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-[#4A2040]">A small gesture...</h3>
                <p className="text-[10px] text-pink-400 font-bold uppercase tracking-widest mt-1">Show me you're thinking of me</p>
              </div>
              <button onClick={() => setShowGiftModal(false)} className="p-2 bg-gray-50 rounded-full"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 overflow-y-auto max-h-[45vh] pb-4">
              {GIFT_ITEMS.map((gift) => (
                <button key={gift.id} onClick={() => { if (sendGift(persona.id, gift.id)) { setShowGiftModal(false); handleSend(`(Sends you a ${gift.name})`); } else setShowHeartsModal(true); }} className="flex flex-col items-center p-4 rounded-3xl bg-gray-50 hover:bg-pink-50 transition-all border border-transparent hover:border-pink-100 group">
                  <span className="text-3xl mb-2 group-hover:scale-125 transition-transform">{gift.icon}</span>
                  <span className="text-[10px] font-bold text-[#4A2040] text-center leading-tight mb-1">{gift.name}</span>
                  <div className="text-[10px] text-pink-500 font-black">{gift.price} H</div>
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-dashed border-pink-100 text-center">
              <p className="text-[9px] text-[#8e6a88] italic">"Gifts aren't about the price, they're about the moments we share."</p>
            </div>
          </div>
        </div>
      )}
      {deletedItems && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-4 shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom">
          <span className="text-xs font-bold whitespace-nowrap">{deletedItems.length} messages deleted</span>
          <button onClick={undoDelete} className="text-xs font-black text-pink-400 uppercase tracking-widest hover:scale-110 active:scale-95 transition-all">Undo ({undoTimeLeft}s)</button>
        </div>
      )}
    </div>
  );
};

export default ChatScreen;
