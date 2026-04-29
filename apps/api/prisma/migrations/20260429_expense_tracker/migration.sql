-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM (
  'FERTILIZER',
  'LABOUR',
  'EQUIPMENT',
  'TRANSPORT',
  'SEEDS',
  'PESTICIDE',
  'IRRIGATION',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PAID', 'PENDING');

-- CreateTable
CREATE TABLE "ExpenseEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "cropSeasonId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "expenseDate" DATE NOT NULL,
  "category" "ExpenseCategory" NOT NULL,
  "status" "ExpenseStatus" NOT NULL DEFAULT 'PAID',
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "vendor" TEXT,
  "note" TEXT,
  "receiptUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExpenseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseBudget" (
  "id" TEXT NOT NULL,
  "cropSeasonId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExpenseBudget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseEntry_userId_expenseDate_idx" ON "ExpenseEntry"("userId", "expenseDate" DESC);

-- CreateIndex
CREATE INDEX "ExpenseEntry_cropSeasonId_expenseDate_idx" ON "ExpenseEntry"("cropSeasonId", "expenseDate" DESC);

-- CreateIndex
CREATE INDEX "ExpenseEntry_userId_status_expenseDate_idx" ON "ExpenseEntry"("userId", "status", "expenseDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseBudget_cropSeasonId_key" ON "ExpenseBudget"("cropSeasonId");

-- CreateIndex
CREATE INDEX "ExpenseBudget_updatedAt_idx" ON "ExpenseBudget"("updatedAt" DESC);

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_cropSeasonId_fkey" FOREIGN KEY ("cropSeasonId") REFERENCES "CropSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseBudget" ADD CONSTRAINT "ExpenseBudget_cropSeasonId_fkey" FOREIGN KEY ("cropSeasonId") REFERENCES "CropSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
