-- CreateTable
CREATE TABLE "Portfolio" (
    "id" SERIAL NOT NULL,
    "ticker" TEXT NOT NULL,
    "companyName" TEXT,
    "sector" TEXT,
    "industry" TEXT,
    "quantity" INTEGER NOT NULL,
    "entryPrice" DECIMAL(10,2) NOT NULL,
    "currentPrice" DECIMAL(10,2),
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stopLoss" DECIMAL(10,2),
    "takeProfit" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "correlationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeHistory" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT,
    "ticker" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "entryPrice" DECIMAL(10,2) NOT NULL,
    "exitPrice" DECIMAL(10,2),
    "entryDate" TIMESTAMP(3) NOT NULL,
    "exitDate" TIMESTAMP(3),
    "realizedPnL" DECIMAL(10,2),
    "realizedPnLPct" DECIMAL(10,4),
    "costBasis" DECIMAL(10,2),
    "proceeds" DECIMAL(10,2),
    "commission" DECIMAL(10,2),
    "taxLotMethod" TEXT,
    "washSale" BOOLEAN NOT NULL DEFAULT false,
    "shortTerm" BOOLEAN,
    "taxYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIDecision" (
    "id" SERIAL NOT NULL,
    "ticker" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marketContext" JSONB,
    "assetAnalysis" JSONB,
    "portfolioContext" JSONB,
    "aiModel" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "quantity" INTEGER,
    "suggestedPrice" DECIMAL(10,2),
    "stopLoss" DECIMAL(10,2),
    "takeProfit" DECIMAL(10,2),
    "primaryFactors" JSONB,
    "supportingFactors" JSONB,
    "riskFactors" JSONB,
    "reasoning" TEXT,
    "riskLevel" TEXT,
    "maxLossPct" DECIMAL(5,2),
    "rewardRiskRatio" DECIMAL(5,2),
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "executedAt" TIMESTAMP(3),
    "actualOutcome" TEXT,
    "performancePnl" DECIMAL(10,2),
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "apiCostUsd" DECIMAL(10,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxTransaction" (
    "id" SERIAL NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "ticker" TEXT NOT NULL,
    "description" TEXT,
    "transactionType" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "pricePerShare" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "commission" DECIMAL(10,2),
    "costBasis" DECIMAL(12,2),
    "proceeds" DECIMAL(12,2),
    "capitalGain" DECIMAL(12,2),
    "gainType" TEXT,
    "washSale" BOOLEAN NOT NULL DEFAULT false,
    "relatedTradeId" INTEGER,
    "washSaleAmount" DECIMAL(10,2),
    "form8949Required" BOOLEAN NOT NULL DEFAULT false,
    "form1099BReceived" BOOLEAN NOT NULL DEFAULT false,
    "orderId" TEXT,
    "confirmationNum" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisCache" (
    "id" SERIAL NOT NULL,
    "ticker" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "cacheType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceMetrics" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalValue" DECIMAL(12,2) NOT NULL,
    "cashBalance" DECIMAL(12,2) NOT NULL,
    "positionsValue" DECIMAL(12,2) NOT NULL,
    "dailyPnL" DECIMAL(12,2) NOT NULL,
    "dailyPnLPct" DECIMAL(10,4) NOT NULL,
    "totalReturn" DECIMAL(10,4) NOT NULL,
    "sharpeRatio" DECIMAL(10,4),
    "maxDrawdown" DECIMAL(10,4),
    "winRate" DECIMAL(5,2),
    "tradesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Portfolio_ticker_idx" ON "Portfolio"("ticker");

-- CreateIndex
CREATE INDEX "Portfolio_status_idx" ON "Portfolio"("status");

-- CreateIndex
CREATE INDEX "TradeHistory_ticker_idx" ON "TradeHistory"("ticker");

-- CreateIndex
CREATE INDEX "TradeHistory_entryDate_idx" ON "TradeHistory"("entryDate");

-- CreateIndex
CREATE INDEX "TradeHistory_taxYear_idx" ON "TradeHistory"("taxYear");

-- CreateIndex
CREATE INDEX "AIDecision_ticker_idx" ON "AIDecision"("ticker");

-- CreateIndex
CREATE INDEX "AIDecision_timestamp_idx" ON "AIDecision"("timestamp");

-- CreateIndex
CREATE INDEX "AIDecision_decision_idx" ON "AIDecision"("decision");

-- CreateIndex
CREATE INDEX "AIDecision_executed_idx" ON "AIDecision"("executed");

-- CreateIndex
CREATE INDEX "TaxTransaction_taxYear_idx" ON "TaxTransaction"("taxYear");

-- CreateIndex
CREATE INDEX "TaxTransaction_ticker_idx" ON "TaxTransaction"("ticker");

-- CreateIndex
CREATE INDEX "TaxTransaction_transactionType_idx" ON "TaxTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "TaxTransaction_transactionDate_idx" ON "TaxTransaction"("transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisCache_cacheKey_key" ON "AnalysisCache"("cacheKey");

-- CreateIndex
CREATE INDEX "AnalysisCache_ticker_idx" ON "AnalysisCache"("ticker");

-- CreateIndex
CREATE INDEX "AnalysisCache_cacheType_idx" ON "AnalysisCache"("cacheType");

-- CreateIndex
CREATE INDEX "AnalysisCache_expiresAt_idx" ON "AnalysisCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceMetrics_date_key" ON "PerformanceMetrics"("date");

-- CreateIndex
CREATE INDEX "PerformanceMetrics_date_idx" ON "PerformanceMetrics"("date");
