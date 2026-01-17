/*
  Warnings:

  - Added the required column `tradingType` to the `AIDecision` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AIDecision" ADD COLUMN     "breakeven" DECIMAL(10,2),
ADD COLUMN     "collateralRequired" DECIMAL(12,2),
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "comparisonAnalysis" TEXT,
ADD COLUMN     "maxLoss" DECIMAL(12,2),
ADD COLUMN     "maxProfit" DECIMAL(12,2),
ADD COLUMN     "optionsData" JSONB,
ADD COLUMN     "optionsLegs" JSONB,
ADD COLUMN     "optionsStrategy" TEXT,
ADD COLUMN     "probabilitySuccess" DECIMAL(5,2),
ADD COLUMN     "timeHorizon" TEXT,
ADD COLUMN     "tradingType" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "AIDecision_tradingType_idx" ON "AIDecision"("tradingType");
