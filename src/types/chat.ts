/**
 * Chat & Messaging Types
 */

export type ConversationStatus = 'open' | 'assigned' | 'resolved' | 'closed';
export type SenderType = 'customer' | 'admin' | 'bot';

export type ChatConversation = {
  id: string;
  customer_id: string;
  status: ConversationStatus;
  assigned_to: string | null;
  subject: string | null;
  last_message_at: string;
  created_at: string;
  profiles?: { full_name: string | null; phone: string | null } | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_type: SenderType;
  content: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ChatbotFAQ = {
  id: string;
  keywords: string[];
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type InternalMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: { full_name: string | null } | null;
  recipient?: { full_name: string | null } | null;
};

export const conversationStatusLabels: Record<ConversationStatus, string> = {
  open: 'مفتوح',
  assigned: 'جاري المتابعة',
  resolved: 'تم الحل',
  closed: 'مغلق',
};
