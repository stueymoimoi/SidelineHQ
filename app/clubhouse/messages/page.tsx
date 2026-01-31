// /app/clubhouse/messages/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Conversation {
  id: string;
  team_a_id: string;
  team_b_id: string;
  last_message_at: string;
  other_team: {
    id: string;
    name: string;
    primary_color: string;
  };
  other_coach: {
    name: string | null;
  } | null;
  last_message?: {
    content: string;
    sender_team_id: string;
    created_at: string;
  };
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_team_id: string;
  content: string;
  player_id: string | null;
  read_at: string | null;
  created_at: string;
  player?: {
    first_name: string;
    last_name: string;
    position: string;
    overall: number;
  };
}

export default function MessagesPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [myCoachName, setMyCoachName] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coach_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          // Add new message to the list
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          
          // Mark as read if from other team
          if (newMsg.sender_team_id !== teamId) {
            markAsRead(selectedConversation.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, teamId]);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const { data: coach } = await supabase
        .from('coaches')
        .select('team_id, name, coach_name')
        .eq('user_id', user.id)
        .single();

      if (!coach) {
        router.push('/choose-team');
        return;
      }

      setTeamId(coach.team_id);
      setMyCoachName(coach.name || coach.coach_name || null);

      // Get all conversations for this team
      const { data: convos } = await supabase
        .from('coach_conversations')
        .select('*')
        .or(`team_a_id.eq.${coach.team_id},team_b_id.eq.${coach.team_id}`)
        .order('last_message_at', { ascending: false });

      if (convos && convos.length > 0) {
        // Get other team details, coach name, and last message for each conversation
        const enrichedConvos: Conversation[] = await Promise.all(
          convos.map(async (convo) => {
            const otherTeamId = convo.team_a_id === coach.team_id ? convo.team_b_id : convo.team_a_id;

            // Get team info
            const { data: otherTeam } = await supabase
              .from('teams')
              .select('id, name, primary_color')
              .eq('id', otherTeamId)
              .single();

            // Get coach info for the other team
            const { data: otherCoach } = await supabase
              .from('coaches')
              .select('name, coach_name')
              .eq('team_id', otherTeamId)
              .single();

            const { data: lastMsg } = await supabase
              .from('coach_messages')
              .select('content, sender_team_id, created_at')
              .eq('conversation_id', convo.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            const { count } = await supabase
              .from('coach_messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', convo.id)
              .neq('sender_team_id', coach.team_id)
              .is('read_at', null);

            return {
              ...convo,
              other_team: otherTeam || { id: otherTeamId, name: 'Unknown', primary_color: '#666' },
              other_coach: otherCoach ? { name: otherCoach.name || otherCoach.coach_name } : null,
              last_message: lastMsg || undefined,
              unread_count: count || 0,
            };
          })
        );

        setConversations(enrichedConvos);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(conversationId: string) {
    const { data } = await supabase
      .from('coach_messages')
      .select(`
        *,
        player:player_id (first_name, last_name, position, overall)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages(data || []);
  }

  async function markAsRead(conversationId: string) {
    if (!teamId) return;

    await supabase
      .from('coach_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_team_id', teamId)
      .is('read_at', null);

    // Update local state
    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      )
    );
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !selectedConversation || !teamId) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('coach_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_team_id: teamId,
          content: newMessage.trim(),
        });

      if (error) throw error;

      // Update conversation's last_message_at
      await supabase
        .from('coach_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

      setNewMessage('');
      // Don't need to loadMessages manually - real-time subscription will handle it
      // But refresh conversation list to update last message preview
      loadData();
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  function getCoachDisplayName(conversation: Conversation): string {
    if (conversation.other_coach?.name) {
      return `Coach ${conversation.other_coach.name}`;
    }
    return conversation.other_team.name;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/clubhouse" className="text-gray-400 hover:text-white">
              ← Back
            </Link>
            <h1 className="text-2xl font-bold">📧 Messages</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-140px)]">
          {/* Conversation List */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-gray-700">
              <h2 className="font-semibold text-gray-300">Conversations</h2>
            </div>
            <div className="overflow-y-auto h-[calc(100%-50px)]">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No conversations yet.
                  <br />
                  <span className="text-sm">Message a coach from the Transfer Market!</span>
                </div>
              ) : (
                conversations.map((convo) => (
                  <div
                    key={convo.id}
                    onClick={() => setSelectedConversation(convo)}
                    className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition ${
                      selectedConversation?.id === convo.id ? 'bg-gray-700' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: convo.other_team.primary_color }}
                        />
                        <div>
                          <span className="font-medium">{getCoachDisplayName(convo)}</span>
                          <p className="text-xs text-gray-500">{convo.other_team.name}</p>
                        </div>
                      </div>
                      {convo.unread_count > 0 && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {convo.unread_count}
                        </span>
                      )}
                    </div>
                    {convo.last_message && (
                      <div className="mt-1 flex justify-between items-center">
                        <p className="text-sm text-gray-400 truncate max-w-[180px]">
                          {convo.last_message.sender_team_id === teamId ? 'You: ' : ''}
                          {convo.last_message.content}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatTime(convo.last_message.created_at)}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Thread */}
          <div className="md:col-span-2 bg-gray-800 rounded-lg overflow-hidden flex flex-col">
            {selectedConversation ? (
              <>
                {/* Thread Header */}
                <div className="p-3 border-b border-gray-700 flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedConversation.other_team.primary_color }}
                  />
                  <div>
                    <h2 className="font-semibold">{getCoachDisplayName(selectedConversation)}</h2>
                    {selectedConversation.other_coach?.name && (
                      <p className="text-xs text-gray-500">{selectedConversation.other_team.name}</p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_team_id === teamId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isMe
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-100'
                            }`}
                          >
                            {msg.player && (
                              <div className="text-xs mb-1 opacity-75 border-b border-white/20 pb-1">
                                Re: {msg.player.first_name} {msg.player.last_name} ({msg.player.position}, {msg.player.overall} OVR)
                              </div>
                            )}
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      maxLength={500}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg font-medium transition"
                    >
                      {sending ? '...' : 'Send'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a conversation to view messages
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
