import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Message, Profile } from '../types/chat';

interface UseMessagesProps {
  chatId: string;
  userId: string;
}

export const useMessages = ({ chatId, userId }: UseMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true })
          .limit(100);

        if (fetchError) throw fetchError;
        setMessages(data || []);
      } catch (err: any) {
        setError(err.message);
        console.error('Failed to fetch messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [chatId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as Message]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === payload.new.id ? (payload.new as Message) : msg))
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [chatId]);

  // Send message
  const sendMessage = useCallback(
    async (body: string, replyTo?: string | null, langHint?: 'hinglish' | 'english') => {
      try {
        const { data, error: sendError } = await supabase
          .from('messages')
          .insert([
            {
              chat_id: chatId,
              sender_id: userId,
              body,
              reply_to: replyTo || null,
              lang_hint: langHint || null,
            },
          ])
          .select();

        if (sendError) throw sendError;
        return data?.[0] as Message;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [chatId, userId]
  );

  // Delete message (soft-delete with expiry)
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const expiresAt = new Date(Date.now() + 10_000).toISOString();
      const { error: delError } = await supabase
        .from('messages')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          soft_delete_expires_at: expiresAt,
        })
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (delError) throw delError;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  // Restore deleted message (undo)
  const restoreMessage = useCallback(async (messageId: string) => {
    try {
      // Only allow restore if soft_delete_expires_at > now()
      const { data: row } = await supabase
        .from('messages')
        .select('soft_delete_expires_at')
        .eq('id', messageId)
        .limit(1)
        .single();

      const expiresAt = row?.soft_delete_expires_at ? new Date(row.soft_delete_expires_at) : null;
      if (!expiresAt || expiresAt.getTime() <= Date.now()) {
        throw new Error('Undo window expired');
      }

      const { error: restoreError } = await supabase
        .from('messages')
        .update({
          deleted_at: null,
          deleted_by: null,
          soft_delete_expires_at: null,
        })
        .eq('id', messageId);

      if (restoreError) throw restoreError;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Edit message
  const editMessage = useCallback(
    async (messageId: string, newBody: string) => {
      try {
        // Attempt update; server-side can enforce 5-minute window
        const { error: editError } = await supabase
          .from('messages')
          .update({
            body: newBody,
            edited_at: new Date().toISOString(),
          })
          .eq('id', messageId)
          .eq('sender_id', userId);

        if (editError) {
          throw editError;
        }
      } catch (err: any) {
        setError(err.message || String(err));
        throw err;
      }
    },
    [userId]
  );

  // Bulk delete messages (only own messages)
  const bulkDelete = useCallback(async (messageIds: string[]) => {
    try {
      const expiresAt = new Date(Date.now() + 10_000).toISOString();
      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString(), deleted_by: userId, soft_delete_expires_at: expiresAt })
        .in('id', messageIds)
        .eq('sender_id', userId);

      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  // Undo bulk delete for messages where soft_delete_expires_at > now()
  const undoBulkDelete = useCallback(async (messageIds: string[]) => {
    try {
      // Filter ids which are still within undo window
      const { data } = await supabase
        .from('messages')
        .select('id, soft_delete_expires_at')
        .in('id', messageIds);

      const idsToRestore = (data || []).filter((r: any) => new Date(r.soft_delete_expires_at).getTime() > Date.now()).map((r: any) => r.id);

      if (idsToRestore.length === 0) throw new Error('No messages available to undo');

      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: null, deleted_by: null, soft_delete_expires_at: null })
        .in('id', idsToRestore);

      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Update preferred language on profiles table
  const setPreferredLanguage = useCallback(async (preferred: 'auto' | 'hinglish' | 'english') => {
    try {
      const { error } = await supabase.from('profiles').upsert({ id: userId, preferred_reply_language: preferred });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to set preferred language:', err);
      throw err;
    }
  }, [userId]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    deleteMessage,
    restoreMessage,
    editMessage,
    bulkDelete,
    undoBulkDelete,
    setPreferredLanguage,
  };
};
