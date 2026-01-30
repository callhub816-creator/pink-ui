import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useMessages } from '../hooks/useMessages';
import { detectLanguage } from '../utils/detectLanguage';
import { canEditMessage as canEditMessageUtil } from '../utils/editUtils';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import type { Message } from '../types/chat';

interface ChatScreenProps {
  chatId: string;
  userId: string;
  otherUserName?: string;
}

/**
 * Chat Screen Component
 * Main chat interface with:
 * - Virtualized message list
 * - Quoted reply support
 * - Multi-select delete + undo
 * - Message edit (5min window)
 * - Typing indicators
 * - Read receipts
 * - Language detection toggle
 */
export const ChatScreen: React.FC<ChatScreenProps> = ({ chatId, userId, otherUserName = 'User' }) => {
  const { messages, loading, sendMessage, deleteMessage, restoreMessage, editMessage, setPreferredLanguage } = useMessages({
    chatId,
    userId,
  });

  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [deletedUndoMap, setDeletedUndoMap] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [languagePreference, setLanguagePreference] = useState<'auto' | 'hinglish' | 'english'>('auto');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const listRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle reply
  const handleReply = useCallback((message: Message) => {
    setQuotedMessage(message);
  }, []);

  // Handle message delete with undo
  const handleDeleteWithUndo = useCallback(
    (messageId: string) => {
      // Soft delete immediately
      deleteMessage(messageId);

      // Add to undo map with 10s timer
      const timeoutId = setTimeout(() => {
        setDeletedUndoMap((prev) => {
          const newMap = new Map(prev);
          newMap.delete(messageId);
          return newMap;
        });
      }, 10000);

      setDeletedUndoMap((prev) => new Map(prev).set(messageId, timeoutId));
    },
    [deleteMessage]
  );

  // Handle undo delete
  const handleUndoDelete = useCallback(
    (messageId: string) => {
      const timeout = deletedUndoMap.get(messageId);
      if (timeout) {
        clearTimeout(timeout);
      }
      restoreMessage(messageId);
      setDeletedUndoMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete(messageId);
        return newMap;
      });
    },
    [deletedUndoMap, restoreMessage]
  );

  // Handle message send
  const handleSendMessage = useCallback(
    async (body: string, replyTo?: string) => {
      try {
        const langHint = languagePreference === 'auto' ? detectLanguage(body) : languagePreference;

        await sendMessage(body, replyTo, langHint);
        setQuotedMessage(null);
        setEditingMessage(null);

        // Broadcast typing stop
        broadcastTyping(false);
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [languagePreference, sendMessage]
  );

  // Handle edit save
  const handleEditSave = useCallback(
    async (messageId: string, newBody: string) => {
      try {
        await editMessage(messageId, newBody);
        setEditingMessage(null);
      } catch (err) {
        console.error('Failed to edit message:', err);
      }
    },
    [editMessage]
  );

  // Broadcast typing indicator
  const broadcastTyping = useCallback((typing: boolean) => {
    // TODO: Implement realtime typing broadcast via Supabase channel
    console.log('Typing:', typing);
  }, []);

  // Handle typing with debounce
  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    broadcastTyping(true);

    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 1000);
  }, [broadcastTyping]);

  // Multi-select handlers
  const handleSelectMessages = useCallback((ids: string[]) => {
    setSelectedMessageIds(new Set(ids));
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedMessageIds.size === 0) return;

    if (!window.confirm(`Delete ${selectedMessageIds.size} message(s)? This can be undone for 10 seconds.`)) {
      return;
    }

    selectedMessageIds.forEach((id) => {
      handleDeleteWithUndo(id);
    });

    setSelectedMessageIds(new Set());
    setIsSelectionMode(false);
  }, [selectedMessageIds, handleDeleteWithUndo]);

  // Edit message check (5 minute window)
  const canEditMessage = (message: Message): boolean => {
    return canEditMessageUtil(message.created_at, userId, message.sender_id);
  };

  // Scroll to message when quoted message is clicked
  const scrollToMessage = useCallback((messageId: string) => {
    const index = messages.findIndex((m) => m.id === messageId);
    if (index >= 0 && listRef.current) {
      listRef.current.scrollToItem(index, 'center');
    }
  }, [messages]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading messages...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="bg-pink-500 text-white px-4 py-3 shadow">
        <h2 className="font-semibold">{otherUserName}</h2>
        {typingUsers.size > 0 && <p className="text-xs opacity-80">typing…</p>}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          ref={listRef}
          messages={messages}
          currentUserId={userId}
          onReply={handleReply}
          onDelete={handleDeleteWithUndo}
          onEdit={(msg) => {
            if (canEditMessage(msg)) {
              setEditingMessage(msg);
            } else {
              alert('Can only edit messages within 5 minutes of sending.');
            }
          }}
          onSelect={handleSelectMessages}
          selectedMessageIds={selectedMessageIds}
          isSelectionMode={isSelectionMode}
          onScrollToMessage={scrollToMessage}
          deletedUndoMap={deletedUndoMap}
          onUndoDelete={handleUndoDelete}
          canEditMessage={canEditMessage}
          chatHeight={500}
        />
      </div>

      {/* Selection Toolbar */}
      {isSelectionMode && selectedMessageIds.size > 0 && (
        <div className="bg-gray-100 px-4 py-3 border-t border-gray-300 flex items-center justify-between">
          <span className="text-sm font-semibold">
            {selectedMessageIds.size} message(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedMessageIds(new Set());
                setIsSelectionMode(false);
              }}
              className="px-3 py-1 text-sm rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Language Preference Toggle */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-2">
        <label className="text-xs font-semibold">Reply language:</label>
        <select
          value={languagePreference}
          onChange={(e) => setLanguagePreference(e.target.value as any)}
          className="px-2 py-1 text-xs border border-gray-300 rounded"
        >
          <option value="auto">Auto-detect</option>
          <option value="hinglish">हिंग्लिश</option>
          <option value="english">English</option>
        </select>
      </div>

      {/* Composer */}
      <Composer
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        quotedMessage={quotedMessage}
        onClearQuote={() => setQuotedMessage(null)}
        editingMessage={editingMessage}
        onClearEdit={() => setEditingMessage(null)}
        onEditSave={handleEditSave}
        preferredLanguage={languagePreference}
        onSetPreferredLanguage={(lang) => {
          setLanguagePreference(lang);
          // persist to profiles
          setPreferredLanguage?.(lang).catch((e) => console.debug('Failed to persist language:', e));
        }}
      />

      {/* Selection Mode Toggle (Mobile) */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex gap-2">
        <button
          onClick={() => {
            setIsSelectionMode(!isSelectionMode);
            if (!isSelectionMode) {
              setSelectedMessageIds(new Set());
            }
          }}
          className={`text-xs px-3 py-1 rounded ${
            isSelectionMode
              ? 'bg-pink-500 text-white'
              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
          }`}
        >
          {isSelectionMode ? '✓ Selection ON' : 'Select'}
        </button>
      </div>
    </div>
  );
};

export default ChatScreen;
