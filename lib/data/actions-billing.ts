import type {
  BillingSettings,
  DineFlowStore,
  ExpenseInput,
  Invoice,
  InvoiceDraftInput,
  PaymentInput,
  RefundInput,
} from "@/lib/types";
import type { ActionResult } from "./actions";
import {
  buildLineItem,
  calcInvoiceTotals,
  defaultBillingSettings,
  deriveInvoiceStatus,
  formatInvoiceNumber,
  refundableAmount,
} from "./billing";
import { createId, nowIso } from "./ids";
import { roundMoney } from "./calculations";

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
function err<T = void>(errors: string[]): ActionResult<T> {
  return { ok: false, errors };
}

function refreshInvoiceBalances(
  invoice: Invoice,
  store: Pick<DineFlowStore, "payments" | "refunds">,
  today = "2026-11-22",
): Invoice {
  const paid = store.payments
    .filter(
      (payment) =>
        payment.invoiceId === invoice.id && payment.status === "successful",
    )
    .reduce((sum, payment) => sum + payment.amount, 0);
  const refunded = store.refunds
    .filter((refund) => refund.invoiceId === invoice.id)
    .reduce((sum, refund) => sum + refund.amount, 0);
  const amountPaid = roundMoney(Math.max(0, paid - refunded));
  const totals = calcInvoiceTotals({
    lineItems: invoice.lineItems,
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    taxRate: invoice.taxRate,
    amountPaid,
  });
  const status = deriveInvoiceStatus({
    status: invoice.status,
    remainingBalance: totals.remainingBalance,
    amountPaid: totals.amountPaid,
    grandTotal: totals.grandTotal,
    dueDate: invoice.dueDate,
    today,
  });
  return {
    ...invoice,
    ...totals,
    status,
    updatedAt: nowIso(),
  };
}

export function updateBillingSettings(
  store: DineFlowStore,
  settings: BillingSettings,
): ActionResult<DineFlowStore> {
  if (!settings.currency?.trim()) return err(["Currency is required."]);
  if (settings.taxRate < 0) return err(["Tax rate cannot be negative."]);
  if (!settings.invoicePrefix?.trim()) {
    return err(["Invoice prefix is required."]);
  }
  if (settings.defaultDueDays < 0) {
    return err(["Due period cannot be negative."]);
  }
  return ok({
    ...store,
    billingSettings: {
      ...defaultBillingSettings(),
      ...settings,
      currency: settings.currency.trim().toUpperCase(),
      invoicePrefix: settings.invoicePrefix.trim(),
      taxRate: Number(settings.taxRate) || 0,
      nextInvoiceSequence: Math.max(1, Number(settings.nextInvoiceSequence) || 1),
      defaultDueDays: Number(settings.defaultDueDays) || 0,
      defaultDiscountValue: Math.max(0, Number(settings.defaultDiscountValue) || 0),
    },
  });
}

export function addExpense(
  store: DineFlowStore,
  input: ExpenseInput,
): ActionResult<DineFlowStore> {
  if (!input.title?.trim()) return err(["Expense title is required."]);
  if (Number(input.amount) < 0) return err(["Amount cannot be negative."]);
  const expense = {
    id: createId("exp"),
    title: input.title.trim(),
    category: input.category,
    amount: roundMoney(Number(input.amount) || 0),
    date: input.date,
    vendor: input.vendor?.trim() || "Internal",
    notes: input.notes?.trim(),
    description: input.description?.trim() || input.notes?.trim(),
    paymentMethod: input.paymentMethod ?? "cash",
    status: input.status ?? "paid",
    createdAt: nowIso(),
  };
  return ok({ ...store, expenses: [expense, ...store.expenses] });
}

export function updateExpense(
  store: DineFlowStore,
  id: string,
  input: ExpenseInput,
): ActionResult<DineFlowStore> {
  if (!store.expenses.some((expense) => expense.id === id)) {
    return err(["Expense not found."]);
  }
  if (!input.title?.trim()) return err(["Expense title is required."]);
  if (Number(input.amount) < 0) return err(["Amount cannot be negative."]);
  return ok({
    ...store,
    expenses: store.expenses.map((expense) =>
      expense.id === id
        ? {
            ...expense,
            title: input.title.trim(),
            category: input.category,
            amount: roundMoney(Number(input.amount) || 0),
            date: input.date,
            vendor: input.vendor?.trim() || expense.vendor,
            notes: input.notes?.trim(),
            description: input.description?.trim() || input.notes?.trim(),
            paymentMethod: input.paymentMethod ?? expense.paymentMethod,
            status: input.status ?? expense.status,
          }
        : expense,
    ),
  });
}

export function deleteExpense(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  return ok({
    ...store,
    expenses: store.expenses.filter((expense) => expense.id !== id),
  });
}

function validateDraft(input: InvoiceDraftInput): string[] {
  const errors: string[] = [];
  if (!input.customerName?.trim()) errors.push("Customer name is required.");
  if (!input.issueDate) errors.push("Invoice date is required.");
  if (!input.dueDate) errors.push("Due date is required.");
  if (!input.lineItems.length) errors.push("Add at least one line item.");
  for (const line of input.lineItems) {
    if (!line.description?.trim()) errors.push("Each line needs a description.");
    if (line.quantity <= 0) errors.push("Quantities must be greater than zero.");
    if (line.unitPrice < 0) errors.push("Unit prices cannot be negative.");
  }
  if (input.discountValue < 0) errors.push("Discount cannot be negative.");
  if (input.taxRate < 0) errors.push("Tax rate cannot be negative.");
  return errors;
}

export function createInvoice(
  store: DineFlowStore,
  input: InvoiceDraftInput,
): ActionResult<DineFlowStore> {
  const errors = validateDraft(input);
  if (errors.length) return err(errors);

  if (input.orderId) {
    const existing = store.invoices.find(
      (invoice) =>
        invoice.orderId === input.orderId && invoice.status !== "cancelled",
    );
    if (existing) {
      return err([
        `Order already has invoice ${existing.invoiceNumber}. Cancel it first or use a controlled duplicate workflow.`,
      ]);
    }
  }

  const lineItems = input.lineItems.map((line) =>
    buildLineItem({
      id: line.id ?? createId("line"),
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      menuItemId: line.menuItemId,
    }),
  );
  const totals = calcInvoiceTotals({
    lineItems,
    discountType: input.discountType,
    discountValue: input.discountValue,
    taxRate: input.taxRate,
    amountPaid: 0,
  });
  const status = input.status ?? "draft";
  const invoiceNumber = formatInvoiceNumber(
    store.billingSettings.invoicePrefix,
    store.billingSettings.nextInvoiceSequence,
  );
  const stamp = nowIso();
  const order = input.orderId
    ? store.orders.find((entry) => entry.id === input.orderId)
    : undefined;

  const invoice: Invoice = {
    id: createId("inv"),
    invoiceNumber,
    customerId: input.customerId,
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail?.trim(),
    customerPhone: input.customerPhone?.trim(),
    orderId: input.orderId,
    orderNumber: order?.orderNumber,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    lineItems,
    discountType: input.discountType,
    discountValue: input.discountValue,
    taxRate: input.taxRate,
    notes: input.notes?.trim(),
    createdAt: stamp,
    updatedAt: stamp,
    ...totals,
    status:
      status === "draft"
        ? "draft"
        : deriveInvoiceStatus({
            status: "unpaid",
            remainingBalance: totals.remainingBalance,
            amountPaid: 0,
            grandTotal: totals.grandTotal,
            dueDate: input.dueDate,
          }),
  };

  return ok({
    ...store,
    invoices: [invoice, ...store.invoices],
    billingSettings: {
      ...store.billingSettings,
      nextInvoiceSequence: store.billingSettings.nextInvoiceSequence + 1,
    },
  });
}

export function updateInvoice(
  store: DineFlowStore,
  id: string,
  input: InvoiceDraftInput,
): ActionResult<DineFlowStore> {
  const existing = store.invoices.find((invoice) => invoice.id === id);
  if (!existing) return err(["Invoice not found."]);
  if (existing.status !== "draft") {
    return err(["Only draft invoices can be edited."]);
  }
  const errors = validateDraft(input);
  if (errors.length) return err(errors);

  const lineItems = input.lineItems.map((line) =>
    buildLineItem({
      id: line.id ?? createId("line"),
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      menuItemId: line.menuItemId,
    }),
  );
  const totals = calcInvoiceTotals({
    lineItems,
    discountType: input.discountType,
    discountValue: input.discountValue,
    taxRate: input.taxRate,
    amountPaid: existing.amountPaid,
  });

  return ok({
    ...store,
    invoices: store.invoices.map((invoice) =>
      invoice.id === id
        ? {
            ...invoice,
            customerId: input.customerId,
            customerName: input.customerName.trim(),
            customerEmail: input.customerEmail?.trim(),
            customerPhone: input.customerPhone?.trim(),
            issueDate: input.issueDate,
            dueDate: input.dueDate,
            lineItems,
            discountType: input.discountType,
            discountValue: input.discountValue,
            taxRate: input.taxRate,
            notes: input.notes?.trim(),
            ...totals,
            status: input.status === "unpaid" ? "unpaid" : "draft",
            updatedAt: nowIso(),
          }
        : invoice,
    ),
  });
}

export function deleteInvoice(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  const existing = store.invoices.find((invoice) => invoice.id === id);
  if (!existing) return err(["Invoice not found."]);
  if (existing.status !== "draft") {
    return err(["Only draft invoices can be deleted."]);
  }
  return ok({
    ...store,
    invoices: store.invoices.filter((invoice) => invoice.id !== id),
  });
}

export function cancelInvoice(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  const existing = store.invoices.find((invoice) => invoice.id === id);
  if (!existing) return err(["Invoice not found."]);
  if (existing.amountPaid > 0) {
    return err(["Cancel refunds first or keep invoice with payments recorded."]);
  }
  return ok({
    ...store,
    invoices: store.invoices.map((invoice) =>
      invoice.id === id
        ? {
            ...invoice,
            status: "cancelled",
            remainingBalance: 0,
            updatedAt: nowIso(),
          }
        : invoice,
    ),
  });
}

export function issueInvoice(
  store: DineFlowStore,
  id: string,
): ActionResult<DineFlowStore> {
  const existing = store.invoices.find((invoice) => invoice.id === id);
  if (!existing) return err(["Invoice not found."]);
  if (existing.status !== "draft") return err(["Invoice is already issued."]);
  return ok({
    ...store,
    invoices: store.invoices.map((invoice) =>
      invoice.id === id
        ? refreshInvoiceBalances(
            { ...invoice, status: "unpaid" },
            store,
          )
        : invoice,
    ),
  });
}

export function createInvoiceFromOrder(
  store: DineFlowStore,
  orderId: string,
  options?: { allowDuplicate?: boolean },
): ActionResult<DineFlowStore> {
  const order = store.orders.find((entry) => entry.id === orderId);
  if (!order) return err(["Order not found."]);
  if (!options?.allowDuplicate) {
    const existing = store.invoices.find(
      (invoice) =>
        invoice.orderId === orderId && invoice.status !== "cancelled",
    );
    if (existing) {
      return err([
        `Invoice ${existing.invoiceNumber} already exists for this order.`,
      ]);
    }
  }

  const issueDate = order.createdAt.slice(0, 10);
  const due = new Date(issueDate);
  due.setDate(due.getDate() + store.billingSettings.defaultDueDays);
  const taxableBase = Math.max(0, order.subtotal - order.discount);
  const historicalTaxRate =
    taxableBase > 0
      ? roundMoney(order.tax / taxableBase)
      : store.billingSettings.taxRate;

  return createInvoice(store, {
    customerId: order.customerId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    orderId: order.id,
    issueDate,
    dueDate: due.toISOString().slice(0, 10),
    lineItems: order.items.map((item) => ({
      description: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      menuItemId: item.menuItemId,
    })),
    discountType: "fixed",
    discountValue: order.discount,
    taxRate: historicalTaxRate,
    status: "unpaid",
    notes: `Generated from order ${order.orderNumber}`,
  });
}

export function recordPayment(
  store: DineFlowStore,
  input: PaymentInput,
): ActionResult<DineFlowStore> {
  const invoice = store.invoices.find((entry) => entry.id === input.invoiceId);
  if (!invoice) return err(["Invoice not found."]);
  if (["draft", "cancelled", "paid"].includes(invoice.status) && invoice.status !== "paid") {
    if (invoice.status === "draft" || invoice.status === "cancelled") {
      return err(["Cannot record payments on draft or cancelled invoices."]);
    }
  }
  if (invoice.status === "paid" && invoice.remainingBalance <= 0) {
    return err(["Invoice is already fully paid."]);
  }
  const amount = roundMoney(Number(input.amount) || 0);
  if (amount <= 0) return err(["Payment amount must be greater than zero."]);
  if (amount - invoice.remainingBalance > 0.001) {
    return err([
      `Payment exceeds remaining balance of ${invoice.remainingBalance.toFixed(2)}.`,
    ]);
  }

  const payment = {
    id: createId("pay"),
    receiptNumber: `RCT-${Date.now().toString().slice(-8)}`,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    amount,
    method: input.method,
    status: "successful" as const,
    paidAt: input.paidAt ?? nowIso(),
    notes: input.notes?.trim(),
    createdAt: nowIso(),
  };

  const nextPayments = [payment, ...store.payments];
  const refreshed = refreshInvoiceBalances(invoice, {
    payments: nextPayments,
    refunds: store.refunds,
  });

  return ok({
    ...store,
    payments: nextPayments,
    invoices: store.invoices.map((entry) =>
      entry.id === invoice.id ? refreshed : entry,
    ),
  });
}

export function recordRefund(
  store: DineFlowStore,
  input: RefundInput,
): ActionResult<DineFlowStore> {
  const payment = store.payments.find((entry) => entry.id === input.paymentId);
  if (!payment) return err(["Payment not found."]);
  if (payment.status === "failed") {
    return err(["Cannot refund a failed payment."]);
  }
  const amount = roundMoney(Number(input.amount) || 0);
  if (amount <= 0) return err(["Refund amount must be greater than zero."]);
  if (!input.reason?.trim()) return err(["Refund reason is required."]);

  const available = refundableAmount(payment, store.refunds);
  if (amount - available > 0.001) {
    return err([
      `Refund exceeds refundable amount of ${available.toFixed(2)}.`,
    ]);
  }

  const refund = {
    id: createId("ref"),
    paymentId: payment.id,
    invoiceId: payment.invoiceId,
    amount,
    reason: input.reason.trim(),
    createdAt: nowIso(),
  };

  const nextRefunds = [refund, ...store.refunds];
  const totalRefunded = nextRefunds
    .filter((entry) => entry.paymentId === payment.id)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const nextPayments = store.payments.map((entry) =>
    entry.id === payment.id
      ? {
          ...entry,
          status:
            totalRefunded >= entry.amount - 0.001
              ? ("refunded" as const)
              : entry.status,
        }
      : entry,
  );

  const invoice = store.invoices.find((entry) => entry.id === payment.invoiceId);
  const invoices = invoice
    ? store.invoices.map((entry) =>
        entry.id === invoice.id
          ? refreshInvoiceBalances(entry, {
              payments: nextPayments,
              refunds: nextRefunds,
            })
          : entry,
      )
    : store.invoices;

  return ok({
    ...store,
    refunds: nextRefunds,
    payments: nextPayments,
    invoices,
  });
}
