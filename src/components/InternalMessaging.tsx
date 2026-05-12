import { FormEvent, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { InternalMessage } from '../types/chat';
import type { Profile } from '../types/database';

/**
 * Floating internal messaging widget for admin/warehouse/delivery staff.
 * Allows sending messages to other team members.
 */
export function InternalMessaging() {
  const { profile, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isStaff = !!role && role !== 'customer' && !!profile;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load staff members and unread count
  useEffect(() => {
    if (!isStaff || !profile?.id) return;

    const loadStaff = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, phone, role')
        .neq('role', 'customer')
        .neq('id', profile.id)
        .order('full_name');
      setStaff((data || []) as Profile[]);
    };

    const loadUnread = async () => {
      const { count } = await supabase
        .from('internal_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', profile.id)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    };

    loadStaff();
    loadUnread();

    // Subscribe to new messages
    const channel = supabase
      .channel(`internal_msgs:${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'internal_messages', filter: `recipient_id=eq.${profile.id}` },
        (payload) => {
          const newMsg = payload.new as InternalMessage;
          if (selectedRecipient === newMsg.sender_id) {
            setMessages((current) => [...current, newMsg]);
            scrollToBottom();
            // Mark as read
            supabase.from('internal_messages').update({ is_read: true }).eq('id', newMsg.id);
          } else {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, selectedRecipient]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedRecipient || !profile?.id) return;

    const loadConversation = async () => {
      const { data } = await supabase
        .from('internal_messages')
        .select('*')
        .or(`and(sender_id.eq.${profile.id},recipient_id.eq.${selectedRecipient}),and(sender_id.eq.${selectedRecipient},recipient_id.eq.${profile.id})`)
        .order('created_at', { ascending: true })
        .limit(100);
      setMessages((data || []) as InternalMessage[]);

      // Mark received as read
      await supabase
        .from('internal_messages')
        .update({ is_read: true })
        .eq('sender_id', selectedRecipient)
        .eq('recipient_id', profile.id)
        .eq('is_read', false);
      setUnreadCount((c) => Math.max(0, c - 1));
    };

    loadConversation();
  }, [selectedRecipient, profile?.id]);

  useEffect(scrollToBottom, [messages]);

  // Only show for non-customer roles
  if (!isStaff) return null;

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || !profile?.id || !selectedRecipient) return;

    const text = input.trim();
    setInput('');
    setSending(true);

    const tempMsg: InternalMessage = {
      id: `temp-${Date.now()}`,
      sender_id: profile.id,
      recipient_id: selectedRecipient,
      content: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, tempMsg]);

    const { error } = await supabase.from('internal_messages').insert({
      sender_id: profile.id,
      recipient_id: selectedRecipient,
      content: text,
    });

    if (error) {
      setMessages((current) => current.filter((m) => m.id !== tempMsg.id));
    }

    setSending(false);
  };

  const selectedStaffName = staff.find((s) => s.id === selectedRecipient)?.full_name || '';

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 left-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-slate-800 text-white shadow-lg transition hover:scale-105 hover:bg-slate-900 lg:bottom-6"
          aria-label="المراسلات الداخلية"
        >
          <MessageSquare size={22} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 left-4 z-50 flex h-[480px] w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl lg:bottom-6">
          {/* Header */}
          <div className="flex items-center justify-between bg-slate-800 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-extrabold">
                {selectedRecipient ? selectedStaffName : 'المراسلات الداخلية'}
              </p>
              <p className="text-[10px] text-slate-300">رسائل الفريق</p>
            </div>
            <div className="flex gap-1">
              {selectedRecipient && (
                <button onClick={() => setSelectedRecipient(null)} className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20">
                  ←
                </button>
              )}
              <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Staff List or Messages */}
          {!selectedRecipient ? (
            <div className="flex-1 overflow-y-auto p-2 space-y-1" dir="rtl">
              <p className="px-2 py-1 text-[11px] font-bold text-slate-400">اختر شخص للمراسلة:</p>
              {staff.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedRecipient(member.id)}
                  className="flex w-full items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-right transition hover:bg-azraq-50"
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-azraq-100 text-azraq-700 text-xs font-extrabold">
                    {member.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-ink truncate">{member.full_name || 'بدون اسم'}</p>
                    <p className="text-[10px] text-slate-400">{member.role === 'admin' ? 'مشرف' : member.role === 'warehouse' ? 'مخزن' : 'حركة'}</p>
                  </div>
                </button>
              ))}
              {staff.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-8">لا يوجد فريق آخر</p>
              )}
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2" dir="rtl">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-8">ابدأ المحادثة...</p>
                )}
                {messages.map((msg) => {
                  const isMe = msg.sender_id === profile?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-5 ${
                          isMe
                            ? 'bg-azraq-700 text-white rounded-br-sm'
                            : 'bg-slate-100 text-slate-700 rounded-bl-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[9px] mt-0.5 ${isMe ? 'text-azraq-200' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-800 text-white transition disabled:opacity-40 hover:bg-slate-900"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
