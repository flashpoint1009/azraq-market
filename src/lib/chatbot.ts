/**
 * Chatbot engine — matches user input against FAQ keywords
 * and generates appropriate responses.
 */
import { supabase } from './supabase';
import type { ChatbotFAQ } from '../types/chat';

let cachedFAQs: ChatbotFAQ[] | null = null;

export async function loadFAQs(): Promise<ChatbotFAQ[]> {
  if (cachedFAQs) return cachedFAQs;
  const { data, error } = await supabase
    .from('chatbot_faqs')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) return [];
  cachedFAQs = (data || []) as ChatbotFAQ[];
  return cachedFAQs;
}

export function clearFAQCache() {
  cachedFAQs = null;
}

/**
 * Match user message against FAQ keywords.
 * Returns the best matching FAQ or null.
 */
export async function matchFAQ(userMessage: string): Promise<ChatbotFAQ | null> {
  const faqs = await loadFAQs();
  const normalizedInput = userMessage.trim().toLowerCase();

  if (!normalizedInput) return null;

  // Score each FAQ based on keyword matches
  let bestMatch: ChatbotFAQ | null = null;
  let bestScore = 0;

  for (const faq of faqs) {
    let score = 0;
    for (const keyword of faq.keywords) {
      if (normalizedInput.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  // Require at least 1 keyword match
  return bestScore >= 1 ? bestMatch : null;
}

/**
 * Generate bot response for a user message.
 */
export async function getBotResponse(userMessage: string): Promise<{ text: string; intent: string | null; escalate: boolean }> {
  const faq = await matchFAQ(userMessage);

  if (faq) {
    const escalate = faq.category === 'support' || userMessage.includes('دعم') || userMessage.includes('مساعدة');
    return {
      text: faq.answer,
      intent: faq.category,
      escalate,
    };
  }

  // Default response when no FAQ matches
  return {
    text: 'مش فاهم سؤالك بالظبط. ممكن تسأل عن:\n• حالة الطلب\n• وقت التوصيل\n• طرق الدفع\n• المرتجعات\n\nأو اكتب "دعم" عشان أوصلك بفريق المساعدة.',
    intent: null,
    escalate: false,
  };
}

/**
 * Send a customer message and get bot response.
 * Creates conversation if needed, saves both messages.
 */
export async function sendCustomerMessage(customerId: string, message: string, conversationId?: string) {
  // Get or create conversation
  let convId = conversationId;
  if (!convId) {
    const { data: existing } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('customer_id', customerId)
      .in('status', ['open', 'assigned'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      convId = existing.id;
    } else {
      const { data: newConv, error } = await supabase
        .from('chat_conversations')
        .insert({ customer_id: customerId, status: 'open' })
        .select('id')
        .single();
      if (error || !newConv) throw new Error('فشل إنشاء المحادثة');
      convId = newConv.id;
    }
  }

  // Save customer message
  await supabase.from('chat_messages').insert({
    conversation_id: convId,
    sender_id: customerId,
    sender_type: 'customer',
    content: message,
  });

  // Get bot response
  const botResponse = await getBotResponse(message);

  // Save bot message
  await supabase.from('chat_messages').insert({
    conversation_id: convId,
    sender_id: null,
    sender_type: 'bot',
    content: botResponse.text,
    metadata: { intent: botResponse.intent, escalate: botResponse.escalate },
  });

  // If escalate, update conversation status
  if (botResponse.escalate) {
    await supabase.from('chat_conversations').update({ status: 'assigned' }).eq('id', convId);
  }

  // Update last_message_at
  await supabase.from('chat_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId);

  return { conversationId: convId, botResponse };
}
