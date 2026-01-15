-- CreateTable
CREATE TABLE "Watchlist" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistStock" (
    "id" SERIAL NOT NULL,
    "watchlistId" INTEGER NOT NULL,
    "ticker" TEXT NOT NULL,
    "companyName" TEXT,
    "sector" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "WatchlistStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Watchlist_name_idx" ON "Watchlist"("name");

-- CreateIndex
CREATE INDEX "WatchlistStock_watchlistId_idx" ON "WatchlistStock"("watchlistId");

-- CreateIndex
CREATE INDEX "WatchlistStock_ticker_idx" ON "WatchlistStock"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistStock_watchlistId_ticker_key" ON "WatchlistStock"("watchlistId", "ticker");

-- AddForeignKey
ALTER TABLE "WatchlistStock" ADD CONSTRAINT "WatchlistStock_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
