import { z } from "zod";

const moneyInput = z.coerce.number().finite().min(0);
const positiveMoney = z.coerce.number().finite().positive();

export const loginSchema = z.object({
  email: z.email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1).max(200),
});

export const credentialsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  currentPassword: z.string().min(1).max(200),
  newEmail: z.email().transform((v) => v.trim().toLowerCase()),
  newPassword: z.string().min(10).max(200),
});

export const purchaseSchema = z.object({
  quantityKg: positiveMoney,
  costPricePerKg: positiveMoney,
  expectedSellingPricePerKg: positiveMoney,
  purchaseDate: z.coerce.date(),
});

export const gasSaleSchema = z.object({
  amount: positiveMoney,
  cashAmount: moneyInput,
  transferAmount: moneyInput,
  cardAmount: moneyInput,
  debtAmount: moneyInput,
  customerName: z.string().trim().max(120).optional().default(""),
  customerPhone: z.string().trim().max(40).optional().default(""),
  customerAddress: z.string().trim().max(240).optional().default(""),
});

export const adjustmentSchema = z.object({
  physicalQuantityKg: moneyInput,
  reason: z.string().trim().min(3).max(240),
});

export const debtPaymentSchema = z.object({
  amount: positiveMoney,
  paymentMethod: z.enum(["CASH", "TRANSFER", "CARD"]),
  paidAt: z.coerce.date().optional(),
  note: z.string().trim().max(240).optional(),
});

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(240).optional().nullable(),
  gasPricePerKg: positiveMoney,
});

export const posTransactionSchema = z.object({
  category: z.enum(["POS_SERVICE", "GAS_PAYMENT"]),
  service: z.enum(["CASH_WITHDRAWAL", "CARD_WITHDRAWAL", "CASH_DEPOSIT", "TRANSFER", "AIRTIME", "DATA"]).optional(),
  amount: positiveMoney,
  paymentMethod: z.enum(["CASH", "TRANSFER", "CARD"]).optional(),
  note: z.string().trim().max(240).optional(),
  debtId: z.string().optional(),
});

export const chargeRuleSchema = z.object({
  service: z.enum(["CASH_WITHDRAWAL", "CARD_WITHDRAWAL", "CASH_DEPOSIT", "TRANSFER", "AIRTIME", "DATA"]),
  minimumAmount: moneyInput,
  maximumAmount: moneyInput.nullable().optional(),
  serviceCharge: moneyInput,
  active: z.boolean().optional().default(true),
});
