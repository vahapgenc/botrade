const { getHistoricalData } = require('./src/services/market/dataFetcher');
const logger = require('./src/utils/logger');

async function test() {
    try {
        console.log("Fetching AAPL data...");
        const data = await getHistoricalData('AAPL', 'daily', 250);
        console.log("Success:", data ? data.length : 0);
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
