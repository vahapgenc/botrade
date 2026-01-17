// Script to update priceWhenAdded for existing watchlist stocks
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

async function getStockPrice(ticker) {
    try {
        const url = `${YAHOO_FINANCE_BASE_URL}/${ticker}`;
        const response = await axios.get(url, {
            params: {
                interval: '1d',
                range: '1d'
            },
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        if (response.data && response.data.chart && response.data.chart.result && response.data.chart.result.length > 0) {
            const data = response.data.chart.result[0];
            const meta = data.meta;
            const currentPrice = meta.regularMarketPrice;
            return parseFloat(currentPrice);
        }
        return null;
    } catch (error) {
        console.error(`Error fetching price for ${ticker}:`, error.message);
        return null;
    }
}

async function updateWatchlistPrices() {
    try {
        console.log('🔄 Fetching all watchlist stocks without priceWhenAdded...');
        
        // Get all stocks where priceWhenAdded is null
        const stocks = await prisma.watchlistStock.findMany({
            where: {
                priceWhenAdded: null
            }
        });
        
        console.log(`📊 Found ${stocks.length} stocks to update`);
        
        if (stocks.length === 0) {
            console.log('✅ All stocks already have prices!');
            return;
        }
        
        let updated = 0;
        let failed = 0;
        
        for (const stock of stocks) {
            console.log(`\n🔍 Fetching price for ${stock.ticker}...`);
            
            const price = await getStockPrice(stock.ticker);
            
            if (price) {
                await prisma.watchlistStock.update({
                    where: { id: stock.id },
                    data: { priceWhenAdded: price }
                });
                console.log(`✅ Updated ${stock.ticker}: $${price.toFixed(2)}`);
                updated++;
            } else {
                console.log(`❌ Failed to fetch price for ${stock.ticker}`);
                failed++;
            }
            
            // Wait 500ms between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('\n📈 Summary:');
        console.log(`   ✅ Updated: ${updated}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   📊 Total: ${stocks.length}`);
        
    } catch (error) {
        console.error('❌ Error updating watchlist prices:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
updateWatchlistPrices();
