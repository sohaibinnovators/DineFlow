"use client";

import * as actions from "@/lib/data/actions";
import * as billing from "@/lib/data/actions-billing";
import * as engagement from "@/lib/data/actions-engagement";
import * as ops from "@/lib/data/actions-ops";
import { computeDashboardStats } from "@/lib/data/calculations";
import {
  getSeedSnapshot,
  loadStore,
  resetDemoStore,
  saveStore,
} from "@/lib/data/store";
import type {
  BillingSettings,
  BlockedSlot,
  CartLineItem,
  CategoryInput,
  CheckoutInput,
  CouponInput,
  CreateOrderInput,
  CustomerInput,
  CustomerPreferences,
  DineFlowStore,
  ExpenseInput,
  InventoryInput,
  InvoiceDraftInput,
  KitchenItemStatus,
  LoyaltyRewardInput,
  LoyaltySettings,
  MenuItemInput,
  MenuReviewInput,
  OrderStatus,
  PaymentInput,
  PaymentStatus,
  RecipeInput,
  RefundInput,
  ReservationInput,
  ReservationStatus,
  RestaurantSettings,
  SavedAddress,
  StaffInput,
  StaffShiftInput,
  SupplierInput,
  TableInput,
  TableStatus,
} from "@/lib/types";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ActionResult = actions.ActionResult;

interface DataContextValue {
  hydrated: boolean;
  store: DineFlowStore;
  stats: ReturnType<typeof computeDashboardStats>;
  addMenuItem: (input: MenuItemInput) => ActionResult;
  updateMenuItem: (id: string, input: MenuItemInput) => ActionResult;
  deleteMenuItem: (id: string) => ActionResult;
  toggleMenuAvailability: (id: string) => ActionResult;
  toggleMenuFeatured: (id: string) => ActionResult;
  addCategory: (input: CategoryInput) => ActionResult;
  updateCategory: (id: string, input: CategoryInput) => ActionResult;
  deleteCategory: (
    id: string,
    options?: { reassignToCategoryId?: string; force?: boolean },
  ) => ActionResult;
  createOrder: (input: CreateOrderInput) => ActionResult;
  updateOrderStatus: (id: string, status: OrderStatus) => ActionResult;
  updateOrderPayment: (id: string, paymentStatus: PaymentStatus) => ActionResult;
  cancelOrder: (id: string) => ActionResult;
  updateKitchenItemStatus: (
    orderId: string,
    menuItemId: string,
    itemIndex: number,
    kitchenStatus: KitchenItemStatus,
  ) => ActionResult;
  reverseCompletedOrderStock: (orderId: string) => ActionResult;
  addCustomer: (input: CustomerInput) => ActionResult;
  updateCustomer: (id: string, input: CustomerInput) => ActionResult;
  deleteCustomer: (id: string) => ActionResult;
  addTable: (input: TableInput) => ActionResult;
  updateTable: (id: string, input: TableInput) => ActionResult;
  updateTableStatus: (id: string, status: TableStatus) => ActionResult;
  deleteTable: (
    id: string,
    options?: { reassignReservationsTo?: string },
  ) => ActionResult;
  combineTables: (tableIds: string[]) => ActionResult;
  separateTables: (tableId: string) => ActionResult;
  moveOrderToTable: (orderId: string, tableId: string) => ActionResult;
  addReservation: (input: ReservationInput) => ActionResult;
  updateReservation: (id: string, input: ReservationInput) => ActionResult;
  updateReservationStatus: (
    id: string,
    status: ReservationStatus,
  ) => ActionResult;
  cancelReservation: (id: string) => ActionResult;
  updateSettings: (settings: RestaurantSettings) => ActionResult;
  addBlockedSlot: (slot: Omit<BlockedSlot, "id">) => ActionResult;
  removeBlockedSlot: (id: string) => ActionResult;
  addInventoryItem: (input: InventoryInput) => ActionResult;
  updateInventoryItem: (id: string, input: InventoryInput) => ActionResult;
  deleteInventoryItem: (id: string) => ActionResult;
  recordStockMovement: (input: {
    inventoryItemId: string;
    type: "received" | "adjustment" | "reduction" | "wastage";
    quantity: number;
    reason: string;
    allowNegative?: boolean;
  }) => ActionResult;
  saveRecipe: (input: RecipeInput) => ActionResult;
  deleteRecipe: (menuItemId: string) => ActionResult;
  addSupplier: (input: SupplierInput) => ActionResult;
  updateSupplier: (id: string, input: SupplierInput) => ActionResult;
  deleteSupplier: (id: string) => ActionResult;
  addStaffMember: (input: StaffInput) => ActionResult;
  updateStaffMember: (id: string, input: StaffInput) => ActionResult;
  addStaffShift: (input: StaffShiftInput) => ActionResult;
  updateStaffShift: (id: string, input: StaffShiftInput) => ActionResult;
  cancelStaffShift: (id: string) => ActionResult;
  updateBillingSettings: (settings: BillingSettings) => ActionResult;
  addExpense: (input: ExpenseInput) => ActionResult;
  updateExpense: (id: string, input: ExpenseInput) => ActionResult;
  deleteExpense: (id: string) => ActionResult;
  createInvoice: (input: InvoiceDraftInput) => ActionResult;
  updateInvoice: (id: string, input: InvoiceDraftInput) => ActionResult;
  deleteInvoice: (id: string) => ActionResult;
  cancelInvoice: (id: string) => ActionResult;
  issueInvoice: (id: string) => ActionResult;
  createInvoiceFromOrder: (
    orderId: string,
    options?: { allowDuplicate?: boolean },
  ) => ActionResult;
  recordPayment: (input: PaymentInput) => ActionResult;
  recordRefund: (input: RefundInput) => ActionResult;
  addToCart: (menuItemId: string, quantity?: number, notes?: string) => ActionResult;
  updateCartQuantity: (
    menuItemId: string,
    quantity: number,
    notes?: string,
  ) => ActionResult;
  removeFromCart: (menuItemId: string, notes?: string) => ActionResult;
  clearCart: () => ActionResult;
  setCartItems: (items: CartLineItem[]) => ActionResult;
  applyCartCoupon: (code: string, customerId?: string) => ActionResult;
  removeCartCoupon: () => ActionResult;
  checkoutCart: (input: CheckoutInput) => ActionResult;
  toggleFavorite: (customerId: string, menuItemId: string) => ActionResult;
  trackMenuView: (menuItemId: string) => ActionResult;
  updateLoyaltySettings: (settings: LoyaltySettings) => ActionResult;
  saveLoyaltyReward: (input: LoyaltyRewardInput) => ActionResult;
  deleteLoyaltyReward: (id: string) => ActionResult;
  redeemLoyaltyReward: (customerId: string, rewardId: string) => ActionResult;
  saveCoupon: (input: CouponInput) => ActionResult;
  deleteCoupon: (id: string) => ActionResult;
  setCouponActive: (id: string, active: boolean) => ActionResult;
  submitReview: (input: MenuReviewInput) => ActionResult;
  updateReview: (
    id: string,
    input: { rating: number; comment: string; customerId: string },
  ) => ActionResult;
  deleteReview: (id: string, customerId?: string) => ActionResult;
  setReviewVisibility: (id: string, status: "visible" | "hidden") => ActionResult;
  markNotificationRead: (id: string) => ActionResult;
  markAllNotificationsRead: (customerId: string) => ActionResult;
  deleteNotification: (id: string) => ActionResult;
  updateCustomerPreferences: (
    customerId: string,
    preferences: CustomerPreferences,
  ) => ActionResult;
  saveCustomerAddress: (
    customerId: string,
    address: Omit<SavedAddress, "id"> & { id?: string },
  ) => ActionResult;
  deleteCustomerAddress: (customerId: string, addressId: string) => ActionResult;
  /** Explicit confirmed reset of LocalStorage demo data. */
  resetDemoData: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<DineFlowStore>(() => getSeedSnapshot());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setStore(loadStore());
      setHydrated(true);
    });
  }, []);

  const commit = useCallback(
    (recipe: (current: DineFlowStore) => actions.ActionResult<DineFlowStore>) => {
      let outcome: ActionResult = { ok: false, errors: ["Unable to update data."] };
      setStore((current) => {
        const result = recipe(current);
        if (!result.ok) {
          outcome = result;
          return current;
        }
        saveStore(result.data);
        outcome = { ok: true, data: undefined };
        return result.data;
      });
      return outcome;
    },
    [],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      hydrated,
      store,
      stats: computeDashboardStats(store),
      addMenuItem: (input) => commit((c) => actions.addMenuItem(c, input)),
      updateMenuItem: (id, input) =>
        commit((c) => actions.updateMenuItem(c, id, input)),
      deleteMenuItem: (id) => commit((c) => actions.deleteMenuItem(c, id)),
      toggleMenuAvailability: (id) =>
        commit((c) => actions.toggleMenuAvailability(c, id)),
      toggleMenuFeatured: (id) =>
        commit((c) => actions.toggleMenuFeatured(c, id)),
      addCategory: (input) => commit((c) => actions.addCategory(c, input)),
      updateCategory: (id, input) =>
        commit((c) => actions.updateCategory(c, id, input)),
      deleteCategory: (id, options) =>
        commit((c) => actions.deleteCategory(c, id, options)),
      createOrder: (input) => commit((c) => actions.createOrder(c, input)),
      updateOrderStatus: (id, status) =>
        commit((c) => engagement.updateOrderStatusWithEngagement(c, id, status)),
      updateOrderPayment: (id, paymentStatus) =>
        commit((c) => actions.updateOrderPayment(c, id, paymentStatus)),
      cancelOrder: (id) =>
        commit((c) =>
          engagement.updateOrderStatusWithEngagement(c, id, "cancelled"),
        ),
      updateKitchenItemStatus: (orderId, menuItemId, itemIndex, kitchenStatus) =>
        commit((c) =>
          ops.updateKitchenItemStatus(c, orderId, menuItemId, itemIndex, kitchenStatus),
        ),
      reverseCompletedOrderStock: (orderId) =>
        commit((c) => ops.reverseCompletedOrderStock(c, orderId)),
      addCustomer: (input) => commit((c) => actions.addCustomer(c, input)),
      updateCustomer: (id, input) =>
        commit((c) => actions.updateCustomer(c, id, input)),
      deleteCustomer: (id) => commit((c) => actions.deleteCustomer(c, id)),
      addTable: (input) => commit((c) => actions.addTable(c, input)),
      updateTable: (id, input) => commit((c) => actions.updateTable(c, id, input)),
      updateTableStatus: (id, status) =>
        commit((c) => actions.updateTableStatus(c, id, status)),
      deleteTable: (id, options) =>
        commit((c) => actions.deleteTable(c, id, options)),
      combineTables: (tableIds) => commit((c) => ops.combineTables(c, tableIds)),
      separateTables: (tableId) => commit((c) => ops.separateTables(c, tableId)),
      moveOrderToTable: (orderId, tableId) =>
        commit((c) => ops.moveOrderToTable(c, orderId, tableId)),
      addReservation: (input) => commit((c) => actions.addReservation(c, input)),
      updateReservation: (id, input) =>
        commit((c) => actions.updateReservation(c, id, input)),
      updateReservationStatus: (id, status) =>
        commit((c) => actions.updateReservationStatus(c, id, status)),
      cancelReservation: (id) => commit((c) => actions.cancelReservation(c, id)),
      updateSettings: (settings) => commit((c) => ops.updateSettings(c, settings)),
      addBlockedSlot: (slot) => commit((c) => ops.addBlockedSlot(c, slot)),
      removeBlockedSlot: (id) => commit((c) => ops.removeBlockedSlot(c, id)),
      addInventoryItem: (input) => commit((c) => ops.addInventoryItem(c, input)),
      updateInventoryItem: (id, input) =>
        commit((c) => ops.updateInventoryItem(c, id, input)),
      deleteInventoryItem: (id) => commit((c) => ops.deleteInventoryItem(c, id)),
      recordStockMovement: (input) =>
        commit((c) => ops.recordStockMovement(c, input)),
      saveRecipe: (input) => commit((c) => ops.saveRecipe(c, input)),
      deleteRecipe: (menuItemId) => commit((c) => ops.deleteRecipe(c, menuItemId)),
      addSupplier: (input) => commit((c) => ops.addSupplier(c, input)),
      updateSupplier: (id, input) =>
        commit((c) => ops.updateSupplier(c, id, input)),
      deleteSupplier: (id) => commit((c) => ops.deleteSupplier(c, id)),
      addStaffMember: (input) => commit((c) => ops.addStaffMember(c, input)),
      updateStaffMember: (id, input) =>
        commit((c) => ops.updateStaffMember(c, id, input)),
      addStaffShift: (input) => commit((c) => ops.addStaffShift(c, input)),
      updateStaffShift: (id, input) =>
        commit((c) => ops.updateStaffShift(c, id, input)),
      cancelStaffShift: (id) => commit((c) => ops.cancelStaffShift(c, id)),
      updateBillingSettings: (settings) =>
        commit((c) => billing.updateBillingSettings(c, settings)),
      addExpense: (input) => commit((c) => billing.addExpense(c, input)),
      updateExpense: (id, input) =>
        commit((c) => billing.updateExpense(c, id, input)),
      deleteExpense: (id) => commit((c) => billing.deleteExpense(c, id)),
      createInvoice: (input) => commit((c) => billing.createInvoice(c, input)),
      updateInvoice: (id, input) =>
        commit((c) => billing.updateInvoice(c, id, input)),
      deleteInvoice: (id) => commit((c) => billing.deleteInvoice(c, id)),
      cancelInvoice: (id) => commit((c) => billing.cancelInvoice(c, id)),
      issueInvoice: (id) => commit((c) => billing.issueInvoice(c, id)),
      createInvoiceFromOrder: (orderId, options) =>
        commit((c) => billing.createInvoiceFromOrder(c, orderId, options)),
      recordPayment: (input) => commit((c) => billing.recordPayment(c, input)),
      recordRefund: (input) => commit((c) => billing.recordRefund(c, input)),
      addToCart: (menuItemId, quantity, notes) =>
        commit((c) => engagement.addToCart(c, menuItemId, quantity, notes)),
      updateCartQuantity: (menuItemId, quantity, notes) =>
        commit((c) =>
          engagement.updateCartQuantity(c, menuItemId, quantity, notes),
        ),
      removeFromCart: (menuItemId, notes) =>
        commit((c) => engagement.removeFromCart(c, menuItemId, notes)),
      clearCart: () => commit((c) => engagement.clearCart(c)),
      setCartItems: (items) => commit((c) => engagement.setCartItems(c, items)),
      applyCartCoupon: (code, customerId) =>
        commit((c) => engagement.applyCartCoupon(c, code, customerId)),
      removeCartCoupon: () => commit((c) => engagement.removeCartCoupon(c)),
      checkoutCart: (input) => commit((c) => engagement.checkoutCart(c, input)),
      toggleFavorite: (customerId, menuItemId) =>
        commit((c) => engagement.toggleFavorite(c, customerId, menuItemId)),
      trackMenuView: (menuItemId) =>
        commit((c) => engagement.trackMenuView(c, menuItemId)),
      updateLoyaltySettings: (settings) =>
        commit((c) => engagement.updateLoyaltySettings(c, settings)),
      saveLoyaltyReward: (input) =>
        commit((c) => engagement.saveLoyaltyReward(c, input)),
      deleteLoyaltyReward: (id) =>
        commit((c) => engagement.deleteLoyaltyReward(c, id)),
      redeemLoyaltyReward: (customerId, rewardId) =>
        commit((c) => engagement.redeemLoyaltyReward(c, customerId, rewardId)),
      saveCoupon: (input) => commit((c) => engagement.saveCoupon(c, input)),
      deleteCoupon: (id) => commit((c) => engagement.deleteCoupon(c, id)),
      setCouponActive: (id, active) =>
        commit((c) => engagement.setCouponActive(c, id, active)),
      submitReview: (input) => commit((c) => engagement.submitReview(c, input)),
      updateReview: (id, input) =>
        commit((c) => engagement.updateReview(c, id, input)),
      deleteReview: (id, customerId) =>
        commit((c) => engagement.deleteReview(c, id, customerId)),
      setReviewVisibility: (id, status) =>
        commit((c) => engagement.setReviewVisibility(c, id, status)),
      markNotificationRead: (id) =>
        commit((c) => engagement.markNotificationRead(c, id)),
      markAllNotificationsRead: (customerId) =>
        commit((c) => engagement.markAllNotificationsRead(c, customerId)),
      deleteNotification: (id) =>
        commit((c) => engagement.deleteNotification(c, id)),
      updateCustomerPreferences: (customerId, preferences) =>
        commit((c) =>
          engagement.updateCustomerPreferences(c, customerId, preferences),
        ),
      saveCustomerAddress: (customerId, address) =>
        commit((c) => engagement.saveCustomerAddress(c, customerId, address)),
      deleteCustomerAddress: (customerId, addressId) =>
        commit((c) =>
          engagement.deleteCustomerAddress(c, customerId, addressId),
        ),
      resetDemoData: () => {
        const seed = resetDemoStore();
        setStore(seed);
      },
    }),
    [commit, hydrated, store],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
}
