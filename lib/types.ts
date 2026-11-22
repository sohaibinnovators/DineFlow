export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "refunded";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no-show";

export type TableStatus = "available" | "occupied" | "reserved" | "cleaning";
export type StaffRole = "manager" | "waiter" | "chef" | "host" | "cashier";
export type OrderType = "dine-in" | "takeaway" | "delivery";
export type ExpenseCategory =
  | "ingredients"
  | "staff"
  | "rent"
  | "utilities"
  | "maintenance"
  | "marketing"
  | "packaging"
  | "transportation"
  | "other"
  | "payroll";

export type InvoiceStatus =
  | "draft"
  | "unpaid"
  | "partially-paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type BillingPaymentMethod = "cash" | "bank-transfer" | "card" | "other";

export type BillingPaymentStatus = "successful" | "refunded" | "failed";

export type DiscountType = "fixed" | "percentage";

export interface FoodCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  itemCount: number;
}

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  categoryId: string;
  categorySlug: string;
  image: string;
  tags: string[];
  featured: boolean;
  popular: boolean;
  available: boolean;
  prepTimeMinutes: number;
  calories?: number;
  createdAt: string;
}

export interface Chef {
  id: string;
  name: string;
  slug: string;
  title: string;
  bio: string;
  specialty: string;
  image: string;
  experienceYears: number;
  signatureDish: string;
}

export type KitchenItemStatus = "pending" | "preparing" | "ready";

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  kitchenStatus?: KitchenItemStatus;
}

export type CheckoutPaymentMethod =
  | "cash-on-delivery"
  | "cash-at-restaurant"
  | "card-simulated"
  | "bank-transfer-demo";

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  tableId?: string;
  tableNumber?: string;
  items: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  type: OrderType;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  assignedStaffId?: string;
  prepStartedAt?: string;
  estimatedMinutes?: number;
  /** Prevents duplicate inventory deductions. */
  stockDeducted?: boolean;
  stockMovementIds?: string[];
  deliveryAddress?: string;
  orderNotes?: string;
  couponCode?: string;
  couponId?: string;
  checkoutPaymentMethod?: CheckoutPaymentMethod;
  /** Client token used to prevent accidental duplicate checkout submissions. */
  submissionToken?: string;
  loyaltyPointsAwarded?: boolean;
  statusHistory?: Array<{ status: OrderStatus; at: string }>;
}

export interface Reservation {
  id: string;
  guestName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  tableId?: string;
  status: ReservationStatus;
  notes?: string;
  createdAt: string;
  /** Duration override in minutes; falls back to settings. */
  durationMinutes?: number;
  checkedInAt?: string;
  seatedAt?: string;
}

export interface Table {
  id: string;
  number: string;
  capacity: number;
  status: TableStatus;
  section: string;
  currentOrderId?: string;
  /** Floor layout position (percent or grid units). */
  x?: number;
  y?: number;
  /** Tables sharing a combineGroupId act as one dining party. */
  combineGroupId?: string;
  occupiedAt?: string;
  currentReservationId?: string;
}

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export interface SavedAddress {
  id: string;
  label: string;
  line1: string;
  city: string;
  notes?: string;
  isDefault?: boolean;
}

export interface CustomerPreferences {
  orderUpdates: boolean;
  reservationReminders: boolean;
  couponAlerts: boolean;
  loyaltyAlerts: boolean;
  marketing: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  visits: number;
  totalSpent: number;
  favoriteDishIds: string[];
  joinedAt: string;
  avatar?: string;
  savedAddresses?: SavedAddress[];
  preferences?: CustomerPreferences;
  loyaltyPoints?: number;
  loyaltyTier?: LoyaltyTier;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  department?: string;
  status: "active" | "off-duty" | "on-leave";
  shift: string;
  avatar?: string;
  joinedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  supplierId: string;
  lastRestocked: string;
  costPerUnit: number;
  updatedAt?: string;
}

export type StockMovementType =
  | "received"
  | "adjustment"
  | "reduction"
  | "wastage"
  | "order-deduction"
  | "order-reversal";

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: StockMovementType;
  quantity: number;
  direction: "in" | "out";
  previousStock: number;
  updatedStock: number;
  reason: string;
  orderId?: string;
  createdAt: string;
}

export interface RecipeIngredient {
  inventoryItemId: string;
  quantityPerServing: number;
}

export interface Recipe {
  id: string;
  menuItemId: string;
  ingredients: RecipeIngredient[];
  updatedAt: string;
}

export interface DayHours {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  open: string;
  close: string;
  closed: boolean;
}

export interface BlockedSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  tableId?: string;
}

export interface RestaurantSettings {
  reservationDurationMinutes: number;
  bufferMinutes: number;
  hours: DayHours[];
  blockedSlots: BlockedSlot[];
}

export type ShiftStatus = "scheduled" | "cancelled";

export interface StaffShift {
  id: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  role?: string;
  notes?: string;
  status: ShiftStatus;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  category: string;
  status: "active" | "inactive";
  leadTimeDays: number;
}

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  vendor: string;
  notes?: string;
  description?: string;
  paymentMethod?: BillingPaymentMethod;
  status: "paid" | "pending";
  createdAt: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  menuItemId?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  orderId?: string;
  orderNumber?: string;
  issueDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  remainingBalance: number;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  method: BillingPaymentMethod;
  status: BillingPaymentStatus;
  paidAt: string;
  notes?: string;
  createdAt: string;
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  invoiceId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface BillingSettings {
  currency: string;
  taxRate: number;
  invoicePrefix: string;
  nextInvoiceSequence: number;
  defaultDueDays: number;
  defaultDiscountType: DiscountType;
  defaultDiscountValue: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "order" | "reservation" | "inventory" | "system" | "promo";
  read: boolean;
  createdAt: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  rating: number;
  avatar: string;
}

export interface SpecialOffer {
  id: string;
  title: string;
  description: string;
  discountLabel: string;
  validUntil: string;
  image: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "order" | "reservation" | "staff" | "inventory";
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface CartLineItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
  image?: string;
}

export interface CartState {
  items: CartLineItem[];
  couponCode?: string;
  updatedAt: string;
}

export interface LoyaltySettings {
  pointsPerCurrency: number;
  minRedemptionPoints: number;
  bronzeThreshold: number;
  silverThreshold: number;
  goldThreshold: number;
  platinumThreshold: number;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  active: boolean;
  validUntil?: string;
}

export type LoyaltyTxnType = "earn" | "redeem" | "adjust" | "reverse";

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  type: LoyaltyTxnType;
  points: number;
  balanceAfter: number;
  orderId?: string;
  rewardId?: string;
  note?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  startDate: string;
  expiryDate: string;
  usageLimit?: number;
  perCustomerLimit?: number;
  usageCount: number;
  applicableCategoryIds: string[];
  applicableMenuItemIds: string[];
  active: boolean;
  createdAt: string;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  couponCode: string;
  customerId: string;
  orderId: string;
  discountAmount: number;
  createdAt: string;
}

export interface MenuReview {
  id: string;
  customerId: string;
  customerName: string;
  menuItemId: string;
  orderId: string;
  rating: number;
  comment: string;
  status: "visible" | "hidden";
  createdAt: string;
  updatedAt: string;
}

export interface CustomerNotification {
  id: string;
  customerId: string;
  title: string;
  message: string;
  type:
    | "order"
    | "reservation"
    | "coupon"
    | "loyalty"
    | "promo"
    | "system";
  read: boolean;
  createdAt: string;
  href?: string;
}

export interface EngagementState {
  /** Demo session customer — not real authentication. */
  demoCustomerId: string;
  recentlyViewedIds: string[];
  loyaltySettings: LoyaltySettings;
  loyaltyRewards: LoyaltyReward[];
  loyaltyTransactions: LoyaltyTransaction[];
  coupons: Coupon[];
  couponUsages: CouponUsage[];
  reviews: MenuReview[];
  customerNotifications: CustomerNotification[];
}

export interface DineFlowStore {
  version: number;
  menuItems: MenuItem[];
  categories: FoodCategory[];
  orders: Order[];
  customers: Customer[];
  tables: Table[];
  reservations: Reservation[];
  staff: StaffMember[];
  inventory: InventoryItem[];
  suppliers: Supplier[];
  recipes: Recipe[];
  stockMovements: StockMovement[];
  shifts: StaffShift[];
  settings: RestaurantSettings;
  billingSettings: BillingSettings;
  invoices: Invoice[];
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  expenses: Expense[];
  engagement: EngagementState;
  cart: CartState;
}

export type MenuItemInput = Omit<
  MenuItem,
  "id" | "slug" | "createdAt" | "categorySlug"
> & {
  id?: string;
  slug?: string;
  createdAt?: string;
  categorySlug?: string;
};

export type CategoryInput = Omit<FoodCategory, "id" | "slug" | "itemCount"> & {
  id?: string;
  slug?: string;
};

export type CustomerInput = Omit<
  Customer,
  "id" | "visits" | "totalSpent" | "favoriteDishIds" | "joinedAt"
> & {
  id?: string;
  visits?: number;
  totalSpent?: number;
  favoriteDishIds?: string[];
  joinedAt?: string;
};

export type TableInput = Omit<
  Table,
  "id" | "currentOrderId" | "currentReservationId" | "occupiedAt"
> & {
  id?: string;
  currentOrderId?: string;
  currentReservationId?: string;
  occupiedAt?: string;
};

export type ReservationInput = Omit<Reservation, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

export type InventoryInput = Omit<InventoryItem, "id" | "updatedAt"> & {
  id?: string;
  updatedAt?: string;
};

export type SupplierInput = Omit<Supplier, "id"> & { id?: string };

export type RecipeInput = {
  menuItemId: string;
  ingredients: RecipeIngredient[];
};

export type StaffShiftInput = Omit<StaffShift, "id"> & { id?: string };

export type StaffInput = Omit<StaffMember, "id" | "joinedAt"> & {
  id?: string;
  joinedAt?: string;
};

export interface CreateOrderInput {
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  tableId?: string;
  type: OrderType;
  items: OrderItem[];
  discount?: number;
  taxRate?: number;
  assignedStaffId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  deliveryAddress?: string;
  orderNotes?: string;
  couponCode?: string;
  checkoutPaymentMethod?: CheckoutPaymentMethod;
  submissionToken?: string;
}

export type CouponInput = Omit<Coupon, "id" | "createdAt" | "usageCount"> & {
  id?: string;
  createdAt?: string;
  usageCount?: number;
};

export type LoyaltyRewardInput = Omit<LoyaltyReward, "id"> & { id?: string };

export type MenuReviewInput = {
  customerId: string;
  menuItemId: string;
  orderId: string;
  rating: number;
  comment: string;
};

export type CheckoutInput = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerId?: string;
  type: OrderType;
  tableId?: string;
  deliveryAddress?: string;
  orderNotes?: string;
  couponCode?: string;
  checkoutPaymentMethod: CheckoutPaymentMethod;
  submissionToken: string;
};

export type ExpenseInput = Omit<Expense, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

export type InvoiceDraftInput = {
  id?: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  orderId?: string;
  issueDate: string;
  dueDate: string;
  lineItems: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    menuItemId?: string;
  }>;
  discountType: DiscountType;
  discountValue: number;
  taxRate: number;
  notes?: string;
  status?: "draft" | "unpaid";
};

export type PaymentInput = {
  invoiceId: string;
  amount: number;
  method: BillingPaymentMethod;
  paidAt?: string;
  notes?: string;
};

export type RefundInput = {
  paymentId: string;
  amount: number;
  reason: string;
};
