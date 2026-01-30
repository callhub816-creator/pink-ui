import React, { useState, useRef, useEffect } from 'react';
import type { Message } from '../types/chat';
import { detectLanguage, getLanguageLabel } from '../utils/detectLanguage';
import { shouldSwitchToPureEnglish, shouldSwitchToPureHindi } from '../../utils/languageDetection';

interface ComposerProps {
  onSendMessage: (body: string, replyTo?: string, langHint?: 'hinglish' | 'english') => Promise<void>;
  isLoading?: boolean;
  quotedMessage?: Message | null;
  onClearQuote?: () => void;
  editingMessage?: Message | null;
  onClearEdit?: () => void;
  onTyping?: () => void;
  onEditSave?: (messageId: string, newBody: string) => Promise<void>;
  preferredLanguage?: 'auto' | 'hinglish' | 'english';
  onSetPreferredLanguage?: (lang: 'auto' | 'hinglish' | 'english') => Promise<void> | void;
}

/**
 * Composer: message input + send button
 * Features:
 * - Textarea with auto-expand
 * - Quoted reply block (WhatsApp-style)
 * - Edit mode (pre-filled message)
 * - Send loading state
 * - Keyboard: Shift+Enter for newline, Enter to send
 */
export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  isLoading = false,
  quotedMessage,
  onClearQuote,
  editingMessage,
  onClearEdit,
  onTyping,
  onEditSave,
  preferredLanguage,
  onSetPreferredLanguage,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Pre-fill textarea when editing
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.body);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!text.trim()) return;

    try {
      const replyTo = quotedMessage?.id;
      // Determine language hint
      // Default to Hinglish unless user explicitly requests pure English.
      const userPref = preferredLanguage ?? 'auto';
      let langHint: 'hinglish' | 'english';
      if (userPref !== 'auto') {
        langHint = userPref as 'hinglish' | 'english';
      } else if (shouldSwitchToPureEnglish(text.trim())) {
        langHint = 'english';
      } else {
        // Default behavior: always prefer Hinglish unless explicitly asked for English
        langHint = 'hinglish';
      }

      if (editingMessage) {
        // Save edit instead of sending new message
        await onEditSave?.(editingMessage.id, text.trim());
      } else {
        // Send new message with lang_hint
        await onSendMessage(text.trim(), replyTo, langHint);
      }
      
      setText('');
      onClearQuote?.();
      onClearEdit?.();
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4 space-y-3">
      {/* Language toggle */}
      <div className="flex items-center gap-3 justify-end">
        <label className="text-xs text-gray-500">Language:</label>
        <select
          value={preferredLanguage || 'auto'}
          onChange={(e) => onSetPreferredLanguage?.(e.target.value as any)}
          className="text-xs border rounded px-2 py-1"
          aria-label="Preferred language"
        >
          <option value="auto">Auto</option>
          <option value="hinglish">हिंग्लिश</option>
          <option value="english">English</option>
        </select>
      </div>
      {/* Quoted reply block */}
      {quotedMessage && (
        <div className="flex items-center gap-3 bg-gray-100 p-3 rounded border-l-4 border-pink-500">
          <div className="flex-1">
            <p className="text-xs font-semibold text-pink-600">Replying to {quotedMessage.sender?.full_name || 'User'}</p>
            <p className="text-sm text-gray-700 truncate">{quotedMessage.body}</p>
          </div>
          <button
            onClick={onClearQuote}
            className="text-gray-400 hover:text-gray-600 text-lg"
            aria-label="Cancel reply"
          >
            ✕
          </button>
        </div>
      )}

      {/* Edit mode indicator */}
      {editingMessage && (
        <div className="flex items-center gap-3 bg-blue-50 p-3 rounded border-l-4 border-blue-500">
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-600">Editing message</p>
          </div>
          <button
            onClick={onClearEdit}
            className="text-gray-400 hover:text-gray-600 text-lg"
            aria-label="Cancel edit"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-3 items-end">
      <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Shift+Enter for new line)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
          rows={1}
          disabled={isLoading}
          aria-label="Message input"
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !text.trim()}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          {isLoading ? '⏳' : '📤'}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Press <kbd className="bg-gray-200 px-1 rounded">Enter</kbd> to send, <kbd className="bg-gray-200 px-1 rounded">Shift + Enter</kbd> for new line
      </p>
    </div>
  );
};

export default Composer;
