import React from 'react';
import type { Message } from '../types/chat';
import { isMessageDeleted, formatTimestamp, truncateText } from '../types/chat';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onEdit: (message: Message) => void;
  onJumpToMessage?: (messageId: string) => void;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  isSelectionMode: boolean;
  canEdit?: boolean;
}

/**
 * MessageItem: renders a single message bubble
 * Features:
 * - Left/right alignment based on sender
 * - Avatar, sender name, timestamp
 * - "Message deleted" placeholder for soft-deleted messages
 * - "Edited" label
 * - Hover menu for reply/delete/edit
 * - Selection mode with checkbox
 * - Reply quote display
 */
export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwn,
  onReply,
  onDelete,
  onEdit,
  onJumpToMessage,
  isSelected,
  onSelect,
  isSelectionMode,
  canEdit = true,
}) => {
  const isDeleted = isMessageDeleted(message);
  const hasQuote = !!message.reply_to;
  const [menuOpen, setMenuOpen] = React.useState(false);
  const touchStartRef = React.useRef<number | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <div
      className={`flex gap-2 p-3 ${isOwn ? 'justify-end' : 'justify-start'} hover:bg-gray-100 transition-colors`}
      role="article"
      aria-label={`Message from ${message.sender?.full_name || 'Unknown'} at ${formatTimestamp(message.created_at)}`}
    >
      {/* Selection checkbox (mobile/selection mode) */}
      {isSelectionMode && !isOwn && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="self-center w-5 h-5 cursor-pointer"
          aria-label={`Select message ${message.id}`}
        />
      )}

      {/* Avatar (own messages on right) */}
      {!isOwn && (
        <div
          className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
          title={message.sender?.full_name || 'User'}
        >
          {(message.sender?.full_name || 'U').charAt(0).toUpperCase()}
        </div>
      )}

      {/* Message bubble */}
      <div
        className={`flex flex-col max-w-xs ${
          isOwn ? 'bg-pink-500 text-white rounded-tl-xl rounded-bl-xl rounded-br-sm' : 'bg-white text-gray-900 rounded-tr-xl rounded-br-xl rounded-bl-sm shadow'
        } p-3 relative`}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!isSelectionMode) onReply(message);
        }}
        onTouchStart={() => {
          // start long-press timer
          touchStartRef.current = Date.now();
        }}
        onTouchEnd={() => {
          const start = touchStartRef.current;
          touchStartRef.current = null;
          if (!start) return;
          const duration = Date.now() - start;
          if (duration > 600) {
            // treat as long-press -> open menu
            setMenuOpen(true);
          }
        }}
      >
        {/* Sender name (for others) */}
        {!isOwn && <span className="text-xs font-semibold text-pink-600 mb-1">{message.sender?.full_name || 'Unknown'}</span>}

        {/* Quoted reply display */}
        {hasQuote && message.repliedMessage && (
          <button
            onClick={() => {
              if (message.reply_to) {
                try {
                  (onJumpToMessage as any)?.(message.reply_to as string);
                } catch (e) {
                  // swallow
                }
              }
            }}
            className={`text-xs mb-2 py-1 px-2 border-l-2 ${isOwn ? 'border-pink-300' : 'border-pink-400'} opacity-80 italic text-left w-full`}
            aria-label={`Quoted message by ${message.repliedMessage.sender?.full_name || 'User'}`}
          >
            <span className="font-semibold">{message.repliedMessage.sender?.full_name || 'User'}:</span> {truncateText(message.repliedMessage.body, 40)}
          </button>
        )}

        {/* Message body */}
        {isDeleted ? (
          <span className="italic text-xs opacity-70">Message deleted</span>
        ) : (
          <span className="text-sm break-words">{message.body}</span>
        )}

        {/* Timestamp + edited label */}
        <span className={`text-xs mt-1 ${isOwn ? 'text-pink-200' : 'text-gray-400'}`}>
          {formatTimestamp(message.created_at)}
          {message.edited_at && <span className="ml-1 italic">(edited)</span>}
        </span>
      </div>

      {/* Hover menu (reply, delete, edit) */}
      {!isSelectionMode && (
        <div className="absolute right-0 top-0 mr-2 mt-1" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open message menu"
            title="More"
            className="text-sm px-2 py-1 rounded hover:bg-gray-200 text-gray-500"
          >
            ⋯
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded border z-20">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onReply(message);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100"
              >
                Reply
              </button>

              {isOwn && !isDeleted && canEdit && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(message);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100"
                >
                  Edit
                </button>
              )}

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onSelect(!isSelected);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100"
              >
                {isSelected ? 'Unselect' : 'Select'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageItem;
