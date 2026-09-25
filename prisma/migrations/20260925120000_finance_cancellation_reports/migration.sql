-- CreateEnum
CREATE TYPE "FinanceMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'UPI', 'OTHER');

-- CreateEnum
CREATE TYPE "SettlementParty" AS ENUM ('AGENT', 'OPERATOR');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('PAYMENT', 'REFUND', 'COMMISSION', 'COMMISSION_REVERSAL', 'SETTLEMENT', 'OPERATOR_PAYABLE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancellationFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "commissionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "commissionRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "commissionType" "DiscountType",
ADD COLUMN     "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxRate" DECIMAL(7,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FinanceSettings" (
    "agencyId" TEXT NOT NULL,
    "gstRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "gstAfterDiscount" BOOLEAN NOT NULL DEFAULT true,
    "commissionType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "commissionValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceSettings_pkey" PRIMARY KEY ("agencyId")
);

-- CreateTable
CREATE TABLE "CancellationTier" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "hoursBeforeDeparture" DECIMAL(8,2) NOT NULL,
    "feePercent" DECIMAL(7,4) NOT NULL,

    CONSTRAINT "CancellationTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "FinanceMethod" NOT NULL,
    "reference" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundRecord" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "FinanceMethod" NOT NULL,
    "reference" TEXT,
    "refundedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "RefundRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingCancellation" (
    "bookingId" TEXT NOT NULL,
    "eligibleRefund" DECIMAL(10,2) NOT NULL,
    "feeAmount" DECIMAL(10,2) NOT NULL,
    "cancelledById" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "BookingCancellation_pkey" PRIMARY KEY ("bookingId")
);

-- CreateTable
CREATE TABLE "AgentCommission" (
    "bookingId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reversedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "AgentCommission_pkey" PRIMARY KEY ("bookingId")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "party" "SettlementParty" NOT NULL,
    "partyId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "FinanceMethod" NOT NULL,
    "reference" TEXT,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceLedger" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "bookingId" TEXT,
    "type" "LedgerType" NOT NULL,
    "party" "SettlementParty",
    "partyId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CancellationTier_agencyId_hoursBeforeDeparture_idx" ON "CancellationTier"("agencyId", "hoursBeforeDeparture");

-- CreateIndex
CREATE UNIQUE INDEX "CancellationTier_agencyId_hoursBeforeDeparture_key" ON "CancellationTier"("agencyId", "hoursBeforeDeparture");

-- CreateIndex
CREATE INDEX "PaymentRecord_agencyId_receivedAt_idx" ON "PaymentRecord"("agencyId", "receivedAt");

-- CreateIndex
CREATE INDEX "PaymentRecord_bookingId_receivedAt_idx" ON "PaymentRecord"("bookingId", "receivedAt");

-- CreateIndex
CREATE INDEX "RefundRecord_agencyId_refundedAt_idx" ON "RefundRecord"("agencyId", "refundedAt");

-- CreateIndex
CREATE INDEX "RefundRecord_bookingId_refundedAt_idx" ON "RefundRecord"("bookingId", "refundedAt");

-- CreateIndex
CREATE INDEX "AgentCommission_agencyId_agentId_idx" ON "AgentCommission"("agencyId", "agentId");

-- CreateIndex
CREATE INDEX "Settlement_agencyId_party_partyId_settledAt_idx" ON "Settlement"("agencyId", "party", "partyId", "settledAt");

-- CreateIndex
CREATE INDEX "FinanceLedger_agencyId_createdAt_idx" ON "FinanceLedger"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceLedger_bookingId_createdAt_idx" ON "FinanceLedger"("bookingId", "createdAt");

-- AddForeignKey
ALTER TABLE "FinanceSettings" ADD CONSTRAINT "FinanceSettings_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationTier" ADD CONSTRAINT "CancellationTier_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRecord" ADD CONSTRAINT "RefundRecord_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRecord" ADD CONSTRAINT "RefundRecord_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingCancellation" ADD CONSTRAINT "BookingCancellation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCommission" ADD CONSTRAINT "AgentCommission_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCommission" ADD CONSTRAINT "AgentCommission_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCommission" ADD CONSTRAINT "AgentCommission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedger" ADD CONSTRAINT "FinanceLedger_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedger" ADD CONSTRAINT "FinanceLedger_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "code", "description") VALUES
  (md5(random()::text || clock_timestamp()::text), 'finance:read', 'Read finance records and reports'),
  (md5(random()::text || clock_timestamp()::text), 'finance:payment', 'Record booking payments'),
  (md5(random()::text || clock_timestamp()::text), 'finance:refund', 'Record booking refunds'),
  (md5(random()::text || clock_timestamp()::text), 'finance:cancel', 'Cancel bookings and release seats'),
  (md5(random()::text || clock_timestamp()::text), 'finance:settlement', 'Post settlements'),
  (md5(random()::text || clock_timestamp()::text), 'finance:settings', 'Manage finance policies')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r CROSS JOIN "Permission" p
WHERE p."code" LIKE 'finance:%'
  AND (
    r."code"::text IN ('SUPER_ADMIN', 'AGENCY_ADMIN')
    OR (r."code"::text = 'BRANCH_ADMIN' AND p."code" IN ('finance:read', 'finance:payment', 'finance:refund', 'finance:cancel'))
    OR (r."code"::text = 'AGENT' AND p."code" IN ('finance:read', 'finance:payment', 'finance:cancel'))
  )
ON CONFLICT DO NOTHING;
