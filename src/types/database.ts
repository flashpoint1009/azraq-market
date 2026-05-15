export type Role = 'customer' | 'admin' | 'warehouse' | 'delivery';
export type UnitType = 'carton' | 'dozen' | 'piece';
export type OrderStatus = 'new' | 'preparing' | 'ready_for_delivery' | 'with_delivery' | 'delivered' | 'rejected' | 'cancelled';
export type PaymentMethod = 'cash_on_delivery';
export type PermissionKey = 'reports' | 'products' | 'purchases' | 'categories' | 'orders' | 'customers' | 'users' | 'offers' | 'developer' | 'settings' | 'data';
export type DiscountType = 'percentage' | 'fixed';
export type PromotionType = 'product' | 'quantity' | 'bundle' | 'order_total';
export type CouponType = 'percent' | 'fixed';
export type StockMovementType = 'in' | 'out' | 'adjustment' | 'return' | 'damage' | 'transfer';
export type StocktakeStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type ReturnCondition = 'good' | 'damaged' | 'expired';
export type ConversationStatus = 'open' | 'assigned' | 'resolved' | 'closed';
export type SenderType = 'customer' | 'admin' | 'bot';

export type Profile = {
  id: string;
  phone: string | null;
  full_name: string | null;
  role: Role;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  app_permissions?: PermissionKey[] | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  image_url?: string | null;
  sort_order: number;
  is_active?: boolean;
  created_at: string;
};

export type Subcategory = {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  is_active?: boolean;
  created_at: string;
  categories?: Pick<Category, 'id' | 'name'> | null;
};

export type Product = {
  id: string;
  category_id: string | null;
  subcategory_id: string | null;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  discount_type?: 'none' | 'percent' | 'amount' | null;
  discount_value?: number | null;
  unit_type: UnitType;
  image_1_url: string | null;
  image_2_url: string | null;
  stock_quantity: number;
  min_stock_level?: number | null;
  sku?: string | null;
  barcode?: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  categories?: Pick<Category, 'id' | 'name'> | null;
  subcategories?: Pick<Subcategory, 'id' | 'name'> | null;
};

export type Order = {
  id: string;
  customer_id: string;
  status: OrderStatus;
  total_amount: number;
  paid_amount: number;
  debt_amount: number;
  discount_amount: number | null;
  delivery_fee: number | null;
  payment_method: PaymentMethod;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, 'full_name' | 'phone' | 'address' | 'latitude' | 'longitude'> | null;
  order_items?: OrderItem[];
  order_status_history?: OrderStatusHistory[];
};

export type PurchaseInvoice = {
  id: string;
  supplier_name: string | null;
  total_amount: number;
  created_by: string | null;
  created_at: string;
  purchase_invoice_items?: PurchaseInvoiceItem[];
};

export type PurchaseInvoiceItem = {
  id: string;
  invoice_id: string;
  product_id: string;
  quantity: number;
  purchase_price: number;
  line_total: number;
};

export type PurchaseReturn = {
  id: string;
  supplier_name: string | null;
  total_amount: number;
  created_by: string | null;
  created_at: string;
  purchase_return_items?: PurchaseReturnItem[];
};

export type PurchaseReturnItem = {
  id: string;
  return_id: string;
  product_id: string;
  quantity: number;
  purchase_price: number;
  line_total: number;
};

export type Promotion = {
  id: string;
  title: string;
  promotion_type: PromotionType;
  product_id: string | null;
  product_ids: string[] | null;
  min_quantity: number | null;
  min_order_amount: number | null;
  discount_type: DiscountType;
  discount_value: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
  products?: Pick<Product, 'id' | 'name' | 'price' | 'image_1_url' | 'unit_type'> | null;
};

export type AppAnnouncement = {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AppSetting = {
  key: string;
  value: unknown;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type DeveloperReport = {
  id: string;
  title: string;
  description: string | null;
  report_type: 'accounts' | 'customers' | 'orders' | 'products' | 'custom';
  config: Record<string, unknown>;
  allowed_permissions: PermissionKey[] | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerDebt = {
  id: string;
  customer_id: string;
  order_id: string | null;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'open' | 'paid' | 'partial';
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'phone'> | null;
};

export type CustomerReservation = {
  id: string;
  customer_id: string;
  reserved_by: string | null;
  note: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_type_snapshot: UnitType;
  unit_price_snapshot: number;
  quantity: number;
  line_total: number;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_read: boolean;
  related_order_id: string | null;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderStatusHistory = {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'role'> | null;
};

export type Coupon = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type ProductReview = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'phone'> | null;
  products?: Pick<Product, 'id' | 'name'> | null;
};

export type Wishlist = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  products?: Product | null;
};

// ─── Chat & Messaging Tables ───

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

// ─── Driver GPS Tables ───

export type DriverLocation = {
  driver_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  is_online: boolean;
  last_updated_at: string;
};

export type DriverLocationHistory = {
  id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  created_at: string;
};

// ─── Stock & Warehouse Tables ───

export type StockMovement = {
  id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_by: string | null;
  created_at: string;
  products?: { name: string; sku: string | null; barcode: string | null } | null;
  profiles?: { full_name: string | null } | null;
};

export type Stocktake = {
  id: string;
  title: string;
  status: StocktakeStatus;
  notes: string | null;
  total_items: number;
  discrepancies: number;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
};

export type StocktakeItem = {
  id: string;
  stocktake_id: string;
  product_id: string;
  system_quantity: number;
  counted_quantity: number | null;
  discrepancy: number;
  notes: string | null;
  counted_at: string | null;
  counted_by: string | null;
  products?: { name: string; sku: string | null; barcode: string | null; image_1_url: string | null } | null;
};

export type CustomerReturn = {
  id: string;
  order_id: string | null;
  customer_id: string;
  status: ReturnStatus;
  reason: string;
  total_amount: number;
  notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  profiles?: { full_name: string | null; phone: string | null } | null;
  customer_return_items?: CustomerReturnItem[];
};

export type CustomerReturnItem = {
  id: string;
  return_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  condition: ReturnCondition;
  products?: { name: string } | null;
};

export type BinLocation = {
  id: string;
  code: string;
  name: string;
  zone: string | null;
  capacity?: number | null;
  is_active: boolean;
  created_at: string;
};

// ─── Developer / SaaS Tables ───

export type AppTypography = {
  key: string;
  value: string;
  category: 'font' | 'size' | 'weight' | 'spacing';
  label: string;
  css_variable: string | null;
  updated_at: string;
};

export type AppLabel = {
  key: string;
  value: string;
  default_value: string;
  category: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type PlanConfig = {
  id: string;
  name: string;
  name_ar: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  limits: Record<string, number | string>;
  features: string[];
  is_active: boolean;
  sort_order: number;
  badge_text: string | null;
  updated_at: string;
};

export type AppCustomCSS = {
  id: string;
  css_content: string;
  is_active: boolean;
  updated_by: string | null;
  updated_at: string;
};

export type AppSnapshot = {
  id: string;
  title: string;
  description: string | null;
  snapshot_data: Record<string, unknown>;
  version: string;
  created_by: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, { old?: unknown; new?: unknown }> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profiles?: { full_name: string | null; role: string | null } | null;
};

// ─── Database Schema Type ───

// ─── Tenant / Billing Types ───

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  border_radius: string;
  login_background: string | null;
  plan_id: string;
  features: string[];
  limits: Record<string, string | number>;
  currency: string;
  currency_symbol: string;
  support_phone: string;
  support_whatsapp: string;
  delivery_fee: number;
  min_order_amount: number;
  tax_rate: number;
  custom_domain: string | null;
  is_active: boolean;
  trial_ends_at: string | null;
  expires_at: string | null;
  owner_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type TenantSubscription = {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  payment_method: string | null;
  payment_reference: string | null;
  starts_at: string;
  ends_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};

export type TenantUsage = {
  id: string;
  tenant_id: string;
  metric: string;
  value: number;
  period: string | null;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile>; Relationships: [] };
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category>; Relationships: [] };
      subcategories: { Row: Subcategory; Insert: Partial<Subcategory>; Update: Partial<Subcategory>; Relationships: [] };
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product>; Relationships: [] };
      orders: { Row: Order; Insert: Partial<Order>; Update: Partial<Order>; Relationships: [] };
      order_items: { Row: OrderItem; Insert: Partial<OrderItem>; Update: Partial<OrderItem>; Relationships: [] };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification>; Relationships: [] };
      push_subscriptions: { Row: PushSubscriptionRow; Insert: Partial<PushSubscriptionRow>; Update: Partial<PushSubscriptionRow>; Relationships: [] };
      order_status_history: { Row: OrderStatusHistory; Insert: Partial<OrderStatusHistory>; Update: Partial<OrderStatusHistory>; Relationships: [] };
      purchase_invoices: { Row: PurchaseInvoice; Insert: Partial<PurchaseInvoice>; Update: Partial<PurchaseInvoice>; Relationships: [] };
      purchase_invoice_items: { Row: PurchaseInvoiceItem; Insert: Partial<PurchaseInvoiceItem>; Update: Partial<PurchaseInvoiceItem>; Relationships: [] };
      purchase_returns: { Row: PurchaseReturn; Insert: Partial<PurchaseReturn>; Update: Partial<PurchaseReturn>; Relationships: [] };
      purchase_return_items: { Row: PurchaseReturnItem; Insert: Partial<PurchaseReturnItem>; Update: Partial<PurchaseReturnItem>; Relationships: [] };
      promotions: { Row: Promotion; Insert: Partial<Promotion>; Update: Partial<Promotion>; Relationships: [] };
      app_announcements: { Row: AppAnnouncement; Insert: Partial<AppAnnouncement>; Update: Partial<AppAnnouncement>; Relationships: [] };
      app_settings: { Row: AppSetting; Insert: Partial<AppSetting>; Update: Partial<AppSetting>; Relationships: [] };
      developer_reports: { Row: DeveloperReport; Insert: Partial<DeveloperReport>; Update: Partial<DeveloperReport>; Relationships: [] };
      customer_debts: { Row: CustomerDebt; Insert: Partial<CustomerDebt>; Update: Partial<CustomerDebt>; Relationships: [] };
      customer_reservations: { Row: CustomerReservation; Insert: Partial<CustomerReservation>; Update: Partial<CustomerReservation>; Relationships: [] };
      coupons: { Row: Coupon; Insert: Partial<Coupon>; Update: Partial<Coupon>; Relationships: [] };
      product_reviews: { Row: ProductReview; Insert: Partial<ProductReview>; Update: Partial<ProductReview>; Relationships: [] };
      wishlists: { Row: Wishlist; Insert: Partial<Wishlist>; Update: Partial<Wishlist>; Relationships: [] };
      // Chat & Messaging
      chat_conversations: { Row: ChatConversation; Insert: Partial<ChatConversation>; Update: Partial<ChatConversation>; Relationships: [] };
      chat_messages: { Row: ChatMessage; Insert: Partial<ChatMessage>; Update: Partial<ChatMessage>; Relationships: [] };
      chatbot_faqs: { Row: ChatbotFAQ; Insert: Partial<ChatbotFAQ>; Update: Partial<ChatbotFAQ>; Relationships: [] };
      internal_messages: { Row: InternalMessage; Insert: Partial<InternalMessage>; Update: Partial<InternalMessage>; Relationships: [] };
      // Driver GPS
      driver_locations: { Row: DriverLocation; Insert: Partial<DriverLocation>; Update: Partial<DriverLocation>; Relationships: [] };
      driver_location_history: { Row: DriverLocationHistory; Insert: Partial<DriverLocationHistory>; Update: Partial<DriverLocationHistory>; Relationships: [] };
      // Stock & Warehouse
      stock_movements: { Row: StockMovement; Insert: Partial<StockMovement>; Update: Partial<StockMovement>; Relationships: [] };
      stocktakes: { Row: Stocktake; Insert: Partial<Stocktake>; Update: Partial<Stocktake>; Relationships: [] };
      stocktake_items: { Row: StocktakeItem; Insert: Partial<StocktakeItem>; Update: Partial<StocktakeItem>; Relationships: [] };
      customer_returns: { Row: CustomerReturn; Insert: Partial<CustomerReturn>; Update: Partial<CustomerReturn>; Relationships: [] };
      customer_return_items: { Row: CustomerReturnItem; Insert: Partial<CustomerReturnItem>; Update: Partial<CustomerReturnItem>; Relationships: [] };
      bin_locations: { Row: BinLocation; Insert: Partial<BinLocation>; Update: Partial<BinLocation>; Relationships: [] };
      // Developer / SaaS
      app_typography: { Row: AppTypography; Insert: Partial<AppTypography>; Update: Partial<AppTypography>; Relationships: [] };
      app_labels: { Row: AppLabel; Insert: Partial<AppLabel>; Update: Partial<AppLabel>; Relationships: [] };
      plan_config: { Row: PlanConfig; Insert: Partial<PlanConfig>; Update: Partial<PlanConfig>; Relationships: [] };
      app_custom_css: { Row: AppCustomCSS; Insert: Partial<AppCustomCSS>; Update: Partial<AppCustomCSS>; Relationships: [] };
      app_snapshots: { Row: AppSnapshot; Insert: Partial<AppSnapshot>; Update: Partial<AppSnapshot>; Relationships: [] };
      audit_log: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog>; Relationships: [] };
      // Multi-Tenant / Billing
      tenants: { Row: Tenant; Insert: Partial<Tenant>; Update: Partial<Tenant>; Relationships: [] };
      tenant_subscriptions: { Row: TenantSubscription; Insert: Partial<TenantSubscription>; Update: Partial<TenantSubscription>; Relationships: [] };
      tenant_usage: { Row: TenantUsage; Insert: Partial<TenantUsage>; Update: Partial<TenantUsage>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      admin_change_order_status: {
        Args: { order_id_input: string; status_input: OrderStatus; actor_id_input: string | null };
        Returns: boolean;
      };
      admin_create_staff_user: {
        Args: {
          phone_input: string;
          password_input: string;
          full_name_input: string;
          role_input: Role;
          permissions_input: PermissionKey[];
        };
        Returns: Profile;
      };
      admin_create_customer_user: {
        Args: {
          phone_input: string;
          password_input: string;
          full_name_input: string;
          address_input: string | null;
        };
        Returns: Profile;
      };
      customer_create_order: {
        Args: {
          notes_input: string | null;
          items_input: Array<{ product_id: string; quantity: number }>;
        };
        Returns: string;
      };
      process_purchase_invoice: {
        Args: {
          items: Array<{ product_id: string; quantity: number; purchase_price: number }>;
          supplier: string | null;
          notes: string | null;
        };
        Returns: string;
      };
      process_purchase_return: {
        Args: {
          items: Array<{ product_id: string; quantity: number; purchase_price: number }>;
          supplier: string | null;
          notes: string | null;
        };
        Returns: string;
      };
      log_audit: {
        Args: {
          p_actor_id: string | null;
          p_action: string;
          p_entity_type: string;
          p_entity_id: string | null;
          p_changes: string | null;
          p_metadata: string | null;
        };
        Returns: void;
      };
      record_stock_movement: {
        Args: {
          p_product_id: string;
          p_movement_type: string;
          p_quantity: number;
          p_reason: string | null;
          p_reference_id: string | null;
          p_reference_type: string | null;
          p_actor_id: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: Role;
      unit_type: UnitType;
      order_status: OrderStatus;
      stock_movement_type: StockMovementType;
      stocktake_status: StocktakeStatus;
      return_status: ReturnStatus;
      return_condition: ReturnCondition;
      conversation_status: ConversationStatus;
      sender_type: SenderType;
    };
    CompositeTypes: Record<string, never>;
  };
};
