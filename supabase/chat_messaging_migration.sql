-- ═══════════════════════════════════════════════════════════════════════
-- Chat Bot + Internal Messaging Migration
-- Features: Customer chatbot (FAQ + support), Admin internal messaging
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Chat Conversations (customer support threads)
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'assigned', 'resolved', 'closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  subject text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_conversations_customer on public.chat_conversations(customer_id, created_at desc);
create index if not exists idx_chat_conversations_status on public.chat_conversations(status, last_message_at desc);

-- 2. Chat Messages (within a conversation)
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null, -- null = bot
  sender_type text not null default 'customer' check (sender_type in ('customer', 'admin', 'bot')),
  content text not null,
  is_read boolean not null default false,
  metadata jsonb, -- for bot: { intent, confidence, matched_faq }
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_conversation on public.chat_messages(conversation_id, created_at);

-- 3. FAQ/Bot Responses (configurable by admin)
create table if not exists public.chatbot_faqs (
  id uuid primary key default gen_random_uuid(),
  keywords text[] not null, -- trigger words
  question text not null, -- the expected question
  answer text not null, -- bot's response
  category text default 'general',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed default FAQs
insert into public.chatbot_faqs (keywords, question, answer, category, sort_order) values
  ('{طلب,حالة,وين,فين,متابعة}', 'فين طلبي؟', 'يمكنك متابعة حالة طلبك من صفحة "طلباتي". لو الطلب جديد، هيتجهز خلال ساعات. لو عايز تفاصيل أكتر، اكتب "دعم" وهوصلك بفريق الدعم.', 'orders', 1),
  ('{توصيل,وقت,كام,ساعة}', 'التوصيل بياخد كام؟', 'التوصيل عادة بياخد من 2-6 ساعات حسب منطقتك. لو الطلب مستعجل، تواصل مع الدعم.', 'delivery', 2),
  ('{دفع,فلوس,كاش,فيزا}', 'طرق الدفع إيه؟', 'حاليًا الدفع عند الاستلام (كاش). قريبًا هنضيف طرق دفع إلكترونية.', 'payment', 3),
  ('{مرتجع,رجوع,استبدال,غلط}', 'عايز أرجع منتج', 'لو عايز ترجع منتج، كلم فريق الدعم وهما يساعدوك. اكتب "دعم" عشان أوصلك.', 'returns', 4),
  ('{سعر,أسعار,غالي,خصم,عرض}', 'في عروض أو خصومات؟', 'تابع صفحة العروض عندنا لأحدث الخصومات. لو تاجر جملة، ممكن تتواصل للأسعار الخاصة.', 'pricing', 5),
  ('{دعم,مساعدة,مشكلة,شكوى}', 'عايز أتكلم مع الدعم', 'تمام! بوصلك بفريق الدعم دلوقتي. لو مفيش حد متاح، هيرد عليك في أقرب وقت.', 'support', 6),
  ('{شكرا,ممتاز,حلو,تمام}', 'شكرًا', 'العفو! لو محتاج أي حاجة تانية، أنا هنا 🙂', 'general', 7)
on conflict do nothing;

-- 4. Internal Admin Messages (admin-to-admin)
create table if not exists public.internal_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_internal_messages_recipient on public.internal_messages(recipient_id, is_read, created_at desc);
create index if not exists idx_internal_messages_sender on public.internal_messages(sender_id, created_at desc);

-- RLS
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chatbot_faqs enable row level security;
alter table public.internal_messages enable row level security;

create policy "Authenticated full access" on public.chat_conversations for all using (auth.uid() is not null);
create policy "Authenticated full access" on public.chat_messages for all using (auth.uid() is not null);
create policy "Authenticated full access" on public.chatbot_faqs for all using (auth.uid() is not null);
create policy "Authenticated full access" on public.internal_messages for all using (auth.uid() is not null);

-- Enable realtime on messages
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.internal_messages;
