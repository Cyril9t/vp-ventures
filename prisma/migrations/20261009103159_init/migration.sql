-- CreateEnum
CREATE TYPE "StockBatchStatus" AS ENUM ('ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('COMPLETED', 'CORRECTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('OUTSTANDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD');

-- CreateEnum
CREATE TYPE "PosCategory" AS ENUM ('POS_SERVICE', 'GAS_PAYMENT');

-- CreateEnum
CREATE TYPE "PosService" AS ENUM ('CASH_WITHDRAWAL', 'CARD_WITHDRAWAL', 'CASH_DEPOSIT', 'TRANSFER', 'AIRTIME', 'DATA', 'GAS_PAYMENT');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('GAS_SALE', 'POS_TRANSACTION', 'STOCK_BATCH', 'DEBT', 'POS_CHARGE_RULE', 'SETTINGS', 'AUTH');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'CORRECT', 'VOID', 'ADJUST', 'PAYMENT', 'UPDATE', 'DELETE', 'LOGIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "forcePasswordChange" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "businessName" TEXT NOT NULL DEFAULT 'VP Ventures',
    "phone" TEXT,
    "address" TEXT,
    "gasPricePerKg" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBatch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "quantityPurchased" DECIMAL(14,4) NOT NULL,
    "remainingQuantity" DECIMAL(14,4) NOT NULL,
    "costPricePerKg" DECIMAL(14,2) NOT NULL,
    "expectedSellingPricePerKg" DECIMAL(14,2) NOT NULL,
    "totalPurchaseCost" DECIMAL(14,2) NOT NULL,
    "status" "StockBatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GasSale" (
    "id" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "quantityKg" DECIMAL(14,4) NOT NULL,
    "sellingPricePerKg" DECIMAL(14,2) NOT NULL,
    "costAmount" DECIMAL(14,2) NOT NULL,
    "grossProfit" DECIMAL(14,2) NOT NULL,
    "cashAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "transferAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cardAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "debtAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "GasSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GasSaleAllocation" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "stockBatchId" TEXT NOT NULL,
    "quantityKg" DECIMAL(14,4) NOT NULL,
    "costPricePerKg" DECIMAL(14,2) NOT NULL,
    "costAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GasSaleAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "stockBatchId" TEXT NOT NULL,
    "gasSaleId" TEXT,
    "type" "StockMovementType" NOT NULL,
    "quantityDelta" DECIMAL(14,4) NOT NULL,
    "unitCost" DECIMAL(14,2),
    "reason" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerAddress" TEXT NOT NULL,
    "originalAmount" DECIMAL(14,2) NOT NULL,
    "outstandingAmount" DECIMAL(14,2) NOT NULL,
    "status" "DebtStatus" NOT NULL DEFAULT 'OUTSTANDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtPayment" (
    "id" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosTransaction" (
    "id" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "category" "PosCategory" NOT NULL,
    "service" "PosService",
    "amount" DECIMAL(14,2) NOT NULL,
    "serviceCharge" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "debtPaymentId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "PosTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosChargeRule" (
    "id" TEXT NOT NULL,
    "service" "PosService" NOT NULL,
    "minimumAmount" DECIMAL(14,2) NOT NULL,
    "maximumAmount" DECIMAL(14,2),
    "serviceCharge" DECIMAL(14,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosChargeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "reason" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StockBatch_batchNumber_key" ON "StockBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "StockBatch_status_purchaseDate_idx" ON "StockBatch"("status", "purchaseDate");

-- CreateIndex
CREATE INDEX "StockBatch_purchaseDate_createdAt_idx" ON "StockBatch"("purchaseDate", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GasSale_saleNumber_key" ON "GasSale"("saleNumber");

-- CreateIndex
CREATE INDEX "GasSale_createdAt_idx" ON "GasSale"("createdAt");

-- CreateIndex
CREATE INDEX "GasSale_status_createdAt_idx" ON "GasSale"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GasSale_customerName_idx" ON "GasSale"("customerName");

-- CreateIndex
CREATE INDEX "GasSaleAllocation_saleId_idx" ON "GasSaleAllocation"("saleId");

-- CreateIndex
CREATE INDEX "GasSaleAllocation_stockBatchId_idx" ON "GasSaleAllocation"("stockBatchId");

-- CreateIndex
CREATE INDEX "StockMovement_stockBatchId_createdAt_idx" ON "StockMovement"("stockBatchId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_gasSaleId_idx" ON "StockMovement"("gasSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "Debt_saleId_key" ON "Debt"("saleId");

-- CreateIndex
CREATE INDEX "Debt_status_updatedAt_idx" ON "Debt"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Debt_customerName_idx" ON "Debt"("customerName");

-- CreateIndex
CREATE INDEX "Debt_customerPhone_idx" ON "Debt"("customerPhone");

-- CreateIndex
CREATE INDEX "DebtPayment_debtId_paidAt_idx" ON "DebtPayment"("debtId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "PosTransaction_transactionNumber_key" ON "PosTransaction"("transactionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PosTransaction_debtPaymentId_key" ON "PosTransaction"("debtPaymentId");

-- CreateIndex
CREATE INDEX "PosTransaction_category_createdAt_idx" ON "PosTransaction"("category", "createdAt");

-- CreateIndex
CREATE INDEX "PosTransaction_service_createdAt_idx" ON "PosTransaction"("service", "createdAt");

-- CreateIndex
CREATE INDEX "PosTransaction_status_createdAt_idx" ON "PosTransaction"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PosChargeRule_service_active_minimumAmount_idx" ON "PosChargeRule"("service", "active", "minimumAmount");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "GasSaleAllocation" ADD CONSTRAINT "GasSaleAllocation_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "GasSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GasSaleAllocation" ADD CONSTRAINT "GasSaleAllocation_stockBatchId_fkey" FOREIGN KEY ("stockBatchId") REFERENCES "StockBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stockBatchId_fkey" FOREIGN KEY ("stockBatchId") REFERENCES "StockBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_gasSaleId_fkey" FOREIGN KEY ("gasSaleId") REFERENCES "GasSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "GasSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosTransaction" ADD CONSTRAINT "PosTransaction_debtPaymentId_fkey" FOREIGN KEY ("debtPaymentId") REFERENCES "DebtPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
