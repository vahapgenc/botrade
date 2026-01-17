const twsClient = require('../app/src/services/ibkr/twsClient');
const { getHistoricalData } = require('../app/src/services/market/dataFetcher');
const { getFundamentals } = require('../app/src/services/fundamental/fundamentalAnalyzer');
const { getNewsForTicker } = require('../app/src/services/news/newsAnalyzer');
const logger = require('../app/src/utils/logger');
require('dotenv').config();

const TICKER = process.env.TEST_TICKER || 'AAPL';

async function testTWSFullFetch() {
    try {
        logger.info('=== STARTING FULL TWS INTEGRATION TEST ===');
        logger.info(`Target Ticker: ${TICKER}`);

        // Ensure TWS connection
        if (!twsClient.isConnected()) {
            await twsClient.connect();
        }

        // 1. Technical Data (Market Histoy)
        logger.info('\n--- 1. Testing Technical Data (History) ---');
        try {
            // Force TWS by checking implementation or logs (conceptually)
            // ideally we'd mock other env vars to null, but here we trust the priority logic
            const history = await getHistoricalData(TICKER, 10);
            if (history && history.length > 0) {
                logger.info(`✅ SUCCESS: Fetched ${history.length} candles.`);
                logger.info(`Sample: ${JSON.stringify(history[0])}`);
            } else {
                logger.error('❌ FAILURE: No history returned.');
            }
        } catch (e) {
            logger.error(`❌ FAILURE: Technical fetch error: ${e.message}`);
        }

        // 2. Fundamental Data
        logger.info('\n--- 2. Testing Fundamental Data ---');
        try {
            const fund = await getFundamentals(TICKER);
            if (fund && fund.source === 'IBKR') {
                logger.info(`✅ SUCCESS: Fetched fundamentals from ${fund.source}`);
                logger.info(`PE Ratio: ${fund.quote.pe}`);
                logger.info(`Description: ${fund.profile.description?.substring(0, 50)}...`);
            } else {
                logger.warn(`⚠️ WARNING: Source was ${fund?.source}, expected IBKR for this test.`);
            }
        } catch (e) {
            logger.error(`❌ FAILURE: Fundamental fetch error: ${e.message}`);
        }

        // 3. News & Sentiment
        logger.info('\n--- 3. Testing News & Sentiment ---');
        try {
            const news = await getNewsForTicker(TICKER, { limit: 5 });
            if (news && news.articles.length > 0) {
                logger.info(`✅ SUCCESS: Fetched ${news.itemsReturned} articles from ${news.source}`);
                
                // key check: did our sentiment fix work?
                const firstArticle = news.articles[0];
                if (firstArticle.sentiment && firstArticle.sentiment.score !== 0) {
                     logger.info(`✅ SUCCESS: Sentiment calculation active on results.`);
                     logger.info(`Sample score: ${firstArticle.sentiment.score} (${firstArticle.sentiment.label})`);
                } else {
                     logger.warn('⚠️ WARNING: Sentiment score appears zero/neutral. Verify text analysis.');
                }
            } else {
                logger.error('❌ FAILURE: No news returned.');
            }
        } catch (e) {
            logger.error(`❌ FAILURE: News fetch error: ${e.message}`);
        }

        logger.info('\n=== TEST COMPLETE ===');
        process.exit(0);

    } catch (error) {
        logger.error('CRITICAL ERROR:', error);
        process.exit(1);
    }
}

testTWSFullFetch();
