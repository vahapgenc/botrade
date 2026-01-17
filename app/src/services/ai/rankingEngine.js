const { makeAIDecision } = require('./aiEngine');
const logger = require('../../utils/logger');
const EventEmitter = require('events');

class RankingEngine extends EventEmitter {
    constructor() {
        super();
        this.results = new Map();
        this.isProcessing = false;
        // Configuration
        this.minConfidence = 70;
        this.batchSize = 3; // Process 3 stocks concurrently
        this.delayBetweenBatches = 2000; // 2 seconds delay
    }

    /**
     * Set ranking criteria
     */
    setCriteria({ minConfidence = 70, minSentiment = 0.15 }) {
        this.minConfidence = minConfidence;
        this.minSentiment = minSentiment;
    }

    /**
     * Rank a list of tickers
     * @param {string[]} tickers - List of ticker symbols
     * @param {string} tradingType - 'STOCK', 'OPTIONS', or 'BOTH'
     */
    async rankOpportunities(tickers, tradingType = 'BOTH') {
        if (this.isProcessing) {
            throw new Error('Ranking engine is already processing. Please wait.');
        }

        this.isProcessing = true;
        this.results.clear();
        const opportunities = [];
        const errors = [];
        
        logger.info(`Starting ranking process for ${tickers.length} tickers (${tradingType})...`);

        // Process in batches to avoid rate limits
        for (let i = 0; i < tickers.length; i += this.batchSize) {
            const batch = tickers.slice(i, i + this.batchSize);
            logger.info(`Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(tickers.length / this.batchSize)}: ${batch.join(', ')}`);
            
            const batchPromises = batch.map(ticker => 
                this.analyzeSafe(ticker, tradingType)
                    .then(result => {
                        if (result) {
                            opportunities.push(result);
                            this.emit('progress', { ticker, status: 'complete', result });
                        }
                    })
                    .catch(err => {
                        errors.push({ ticker, error: err.message });
                        this.emit('progress', { ticker, status: 'error', error: err.message });
                    })
            );

            await Promise.all(batchPromises);
            
            // Delay between batches
            if (i + this.batchSize < tickers.length) {
                await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
            }
        }

        this.isProcessing = false;

        // Sorting & Ranking Logic
        // 1. Filter by Signal ("BUY")
        // 2. Filter by Confidence > threshold
        // 3. Sort by Confidence (Primary) and Sentiment Score (Secondary)
        
        const rankedList = opportunities
            .filter(opp => opp.decision.signal === 'BUY')
            .filter(opp => opp.decision.confidence >= this.minConfidence)
            .sort((a, b) => {
                // Sort by confidence descending
                if (b.decision.confidence !== a.decision.confidence) {
                    return b.decision.confidence - a.decision.confidence;
                }
                // If confidence equal, sort by sentiment score
                return (b.analysis.sentiment?.score || 0) - (a.analysis.sentiment?.score || 0);
            });

        logger.info(`Ranking complete. Found ${rankedList.length} viable opportunities out of ${tickers.length} analyzed.`);
        
        return {
            ranked: rankedList,
            all: opportunities,
            errors,
            timestamp: new Date()
        };
    }

    /**
     * Wrapper to handle individual analysis errors gracefully
     */
    async analyzeSafe(ticker, tradingType) {
        try {
            // Need company name for better AI context, fetching basic quote first usually helpful
            // For now passing ticker as name if unknown, AI handles it
            const decision = await makeAIDecision(ticker, ticker, tradingType);
            
            return {
                ticker,
                decision: decision.decision, // Structure from aiEngine output
                analysis: {
                    price: decision.analysis.currentPrice,
                    technical: decision.analysis.technical.composite,
                    sentiment: decision.analysis.sentiment
                },
                raw: decision // Keep full data if needed
            };
        } catch (error) {
            logger.warn(`Analysis failed for ${ticker}: ${error.message}`);
            // Return null so it gets filtered out
            return null;
        }
    }
}

module.exports = new RankingEngine();
