const prisma = require('../../database/prisma');
const RankingEngine = require('../ai/rankingEngine');
const OrderService = require('../ibkr/orderService');
const logger = require('../../utils/logger');
const twsClient = require('../ibkr/twsClient');

class AutoTrader {
    constructor() {
        this.rankingEngine = RankingEngine;
        this.orderService = OrderService;
        this.isRunning = false;
        
        // Configuration
        this.maxOpenPositions = 5;
        this.defaultTradeValue = 2000; // $2000 per trade
        this.minConfidence = 75; // Minimum confidence to execute
    }

    /**
     * Run a full trading analysis and execution cycle
     */
    async runCycle() {
        if (this.isRunning) {
            logger.warn('AutoTrader cycle already running. Skipping.');
            return;
        }

        this.isRunning = true;
        logger.info('Starting AutoTrader analysis cycle...');

        try {
            // 1. Get Watchlist Tickers
            const tickers = await this.getWatchlistTickers();
            if (tickers.length === 0) {
                logger.warn('No tickers found in watchlists. Stopping cycle.');
                return;
            }

            logger.info(`Loaded ${tickers.length} tickers for analysis.`);

            // 2. Rank Opportunities
            // We use 'STOCK' for now to simplify, or 'BOTH' if we want options too
            const opportunities = await this.rankingEngine.rankOpportunities(tickers, 'STOCK');
            
            if (opportunities.length === 0) {
                logger.info('No valid opportunities found above threshold.');
                return;
            }

            logger.info(`Found ${opportunities.length} potential opportunities.`);
            const topPick = opportunities[0]; // Best ranked opportunity

            // 3. Validate Top Pick
            await this.validateAndExecute(topPick);

        } catch (error) {
            logger.error('Error in AutoTrader cycle:', error);
        } finally {
            this.isRunning = false;
            logger.info('AutoTrader cycle completed.');
        }
    }

    /**
     * Fetch all unique tickers from all active watchlists
     */
    async getWatchlistTickers() {
        try {
            const watchlists = await prisma.watchlist.findMany({
                include: {
                    stocks: true
                }
            });

            const uniqueTickers = new Set();
            watchlists.forEach(wl => {
                wl.stocks.forEach(stock => {
                    uniqueTickers.add(stock.ticker);
                });
            });

            // If no DB watchlists, fallback to a default list for testing
            if (uniqueTickers.size === 0) {
                logger.info('No DB watchlists found. Using default list.');
                return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'AMD'];
            }

            return Array.from(uniqueTickers);
        } catch (error) {
            logger.error('Error fetching watchlists:', error);
            return [];
        }
    }

    /**
     * Validate the opportunity and execute trade if checks pass
     */
    async validateAndExecute(opportunity) {
        const { ticker, decision, confidence, suggestedPrice } = opportunity;

        // check confidence
        if (confidence < this.minConfidence) {
            logger.info(`Top pick ${ticker} skipped: Confidence ${confidence}% < ${this.minConfidence}%`);
            return;
        }

        // check decision
        if (decision !== 'BUY') {
            logger.info(`Top pick ${ticker} skipped: Decision is ${decision}`);
            return;
        }

        // check existing positions
        if (await this.hasOpenPosition(ticker)) {
            logger.info(`Top pick ${ticker} skipped: Already have open position.`);
            return;
        }

        // calculate position size
        const quantity = this.calculatePositionSize(suggestedPrice);
        if (quantity === 0) {
            logger.warn(`Calculated quantity is 0 for ${ticker} @ $${suggestedPrice}. Skipping.`);
            return;
        }

        // execute
        logger.info(`EXECUTING TRADE: BUY ${quantity} ${ticker} @ ~$${suggestedPrice}`);
        
        const tradeData = {
            symbol: ticker,
            action: 'BUY',
            quantity: quantity,
            orderType: 'MARKET', // Or LIMIT if we want to be safe
            confidence: confidence,
            secType: 'STK'
        };

        const result = await this.orderService.executeTrade(tradeData);
        
        if (result && result.success) {
            logger.info(`Trade successfully submitted for ${ticker}`);
            // TODO: Ensure OrderService records this in DB, or we do it here.
            // OrderService usually records to 'Portfolio' or 'TradeHistory' via TWS callbacks?
            // checking orderService... it seems it just places order. TWSClient handles events.
        } else {
            logger.error(`Trade execution failed for ${ticker}: ${result ? result.reason : 'Unknown error'}`);
        }
    }

    /**
     * Check if we already have a position in this ticker
     */
    async hasOpenPosition(ticker) {
        // Check DB Portfolio
        const dbPosition = await prisma.portfolio.findFirst({
            where: {
                ticker: ticker,
                status: 'OPEN'
            }
        });

        if (dbPosition) return true;

        // Check TWS Positions (Real-time)
        if (twsClient.isConnected()) {
            const twsPos = twsClient.positions.get(ticker);
            if (twsPos && twsPos.pos !== 0) return true;
        }

        return false;
    }

    /**
     * Calculate position size based on risk rules
     */
    calculatePositionSize(price) {
        if (!price || price <= 0) return 0;
        
        // Simple Fixed Value Sizing
        // TODO: Enhance with Account Equity %
        const quantity = Math.floor(this.defaultTradeValue / price);
        return quantity;
    }
}

module.exports = new AutoTrader();
