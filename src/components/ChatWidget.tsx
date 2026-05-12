import { FormEvent, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sendCustomerMessage } from '../lib/chatbot';
import { supabase } from '../lib/supabase';
import type { ChatMessage } from '../types/chat';

/**
 * Floating chat widget for customers.
 * Shows as a floating icon (bottom-left), opens a chat panel.
 */
export function ChatWidget() {
  const { profile, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Only show for customers
  if (role !== 'customer' || !profile) return null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load existing conversation
  useEffect(() => {
    if (!open || !profile?.id) return;

    const loadMessages = async () => {
      // Find open conversation
      const { data: conv } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('customer_id', profile.id)
        .in('status', ['open', 'assigned'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (conv) {
        setConversationId(conv.id);
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });
        setMessages((msgs || []) as ChatMessage[]);
      } else {
        // Show welcome message
        setMessages([{
          id: 'welcome',
          conversation_id: '',
          sender_id: null,
          sender_type: 'bot',
          content: 'أهلاً بيك! أنا بوت أزرق ماركت 🤖\nأقدر أساعدك في:\n• متابعة طلبك\n• معرفة وقت التوصيل\n• طرق الدفع\n• المرتجعات\n\nاكتب سؤالك أو اكتب "دعم" للتواصل مع فريقنا.',
          is_read: true,
          metadata: null,
          created_at: new Date().toISOString(),
        }]);
      }
    };

    loadMessages();
  }, [open, profile?.id]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((current) => {
            if (current.find((m) => m.id === newMsg.id)) return current;
            return [...current, newMsg];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || !profile?.id) return;

    const text = input.trim();
    setInput('');
    setSending(true);

    // Optimistic: add customer message locally
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId || '',
      sender_id: profile.id,
      sender_type: 'customer',
      content: text,
      is_read: false,
      metadata: null,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, tempMsg]);

    try {
      const result = await sendCustomerMessage(profile.id, text, conversationId || undefined);
      setConversationId(result.conversationId);

      // Add bot response locally (it will also come via realtime, dedup by id)
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        conversation_id: result.conversationId,
        sender_id: null,
        sender_type: 'bot',
        content: result.botResponse.text,
        is_read: true,
        metadata: { intent: result.botResponse.intent },
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, botMsg]);
    } catch {
      // Remove optimistic message on error
      setMessages((current) => current.filter((m) => m.id !== tempMsg.id));
    }

    setSending(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 left-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-azraq-700 text-white shadow-lg transition hover:scale-105 hover:bg-azraq-800 lg:bottom-6"
          aria-label="افتح الشات"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-20 left-4 z-50 flex h-[480px] w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl lg:bottom-6">
          {/* Header */}
          <div className="flex items-center justify-between bg-azraq-700 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-extrabold">أزرق ماركت</p>
              <p className="text-[10px] text-azraq-200">بوت الدعم • متاح 24/7</p>
            </div>
            <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2" dir="rtl">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'customer' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-5 ${
                    msg.sender_type === 'customer'
                      ? 'bg-azraq-700 text-white rounded-br-sm'
                      : msg.sender_type === 'bot'
                      ? 'bg-slate-100 text-slate-700 rounded-bl-sm'
                      : 'bg-emerald-50 text-emerald-800 rounded-bl-sm border border-emerald-100'
                  }`}
                >
                  {msg.sender_type === 'admin' && (
                    <p className="text-[10px] font-bold text-emerald-600 mb-0.5">فريق الدعم</p>
                  )}
                  {msg.sender_type === 'bot' && (
                    <p className="text-[10px] font-bold text-slate-400 mb-0.5">🤖 بوت</p>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="border-t border-slate-100 p-2">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب رسالتك..."
                disabled={sending}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none transition focus:border-azraq-300 focus:bg-white"
                dir="rtl"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-azraq-700 text-white transition disabled:opacity-40 hover:bg-azraq-800"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
