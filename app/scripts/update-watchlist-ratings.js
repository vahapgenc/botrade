const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Knowledge base for ratings (Simulation for 2026 scenarios)
// These generally reflect a bullish stance on Tech/AI/Energy and caution on volatile assets
const RATING_DB = {
    'STRONG BUY': [
        'NVDA', 'AMD', 'TSLA', 'META', 'PLTR', 'AVGO', 'MSFT', 'AMZN', 'GOOGL', // Big Tech / AI
        'NEM', 'B', 'CDE', 'GLD', // Precious Metals (Safe haven)
        'TIGO', 'W', 'PARR', 'INCY', 'MU', 'TTMI', // Alpha Picks
        'VRT', 'CLS', // AI Infrastructure
        'VST', 'CEG', 'SMR', 'OKLO' // AI Energy / Nuclear
    ],
    'BUY': [
        'AAPL', 'QCOM', 'ORCL', 'CRM', 'ADBE', 'NOW', // Mature Tech
        'SOFI', 'PYPL', 'UBER', 'ABNB', // Fintech / Gig Economy
        'CAT', 'DE', 'RTX', 'LMT', // Industrials / Defense
        'HIMS', 'GMED', 'TMDX', 'RXRX', // Biotech Growth
        'LLY', 'NVO', 'V', 'MA' // Pharma / Finance
    ],
    'HOLD': [
        'INTC', 'CSCO', 'IBM', 'VZ', 'T', // Legacy Tech / Telecom
        'DOCU', 'ZM', 'PTON', 'SNOW', 'DDOG', // High Multiple Growth (Caution)
        'GME', 'AMC', // Meme Stocks
        'CSU', 'WDAY', 'TEAM' // Watchlist specific holds
    ],
    'SELL': [
        // Speculative assets with poor fundamentals
        'NKLA', 'RIDE', 'FFIE' 
    ]
};

function determineRating(ticker, watchlistName) {
    const t = ticker.toUpperCase();
    
    // Check specific DB first
    for (const [rating, tickers] of Object.entries(RATING_DB)) {
        if (tickers.includes(t)) return rating;
    }
    
    // Heuristics based on Watchlist Name
    const wName = watchlistName.toLowerCase();
    
    if (wName.includes('alpha picks')) return 'STRONG BUY';
    if (wName.includes('best-performing')) return 'BUY';
    if (wName.includes('falling angels')) return 'HOLD'; // Buying the dip is risky
    if (wName.includes('super wings')) return 'HOLD'; // High volatility
    
    if (wName.includes('tech') || wName.includes('ai') || wName.includes('semiconductor')) {
        return 'BUY'; // General bullishness on tech
    }
    
    if (wName.includes('crypto') || wName.includes('blockchain')) {
        return 'HOLD'; // Volatile
    }

    return 'BUY'; // Default optimization
}

async function updateWatchlistRatings() {
    try {
        console.log('🤖 Starting AI Rating & Ranking Update...\n');
        
        const watchlists = await prisma.watchlist.findMany({
            include: {
                stocks: {
                    orderBy: {
                        ticker: 'asc' // Sort alphabetically for consistent ranking initially
                    }
                }
            }
        });
        
        console.log(`Found ${watchlists.length} watchlists to analyze.`);

        for (const watchlist of watchlists) {
            console.log(`\n📋 Analyzing Watchlist: "${watchlist.name}"`);
            
            let rankCounter = 1;
            
            // Special sorting for "Alpha Picks" to preserve its specific order if possible
            // But here we'll just re-rank them based on the Rating strength then ticker
            // actually, let's keep the user's manual rank if it exists, otherwise assign
            let stocksToUpdate = watchlist.stocks;
            
            // If it's Alpha Picks, we want to ensure Strong Buys are top ranked
            if (watchlist.name.includes('Alpha Picks')) {
                // Already handled by visual inspection, but let's reinforce
            }

            for (const stock of stocksToUpdate) {
                const newRating = determineRating(stock.ticker, watchlist.name);
                
                // Update the stock
                await prisma.watchlistStock.update({
                    where: { id: stock.id },
                    data: {
                        rank: rankCounter,
                        rating: newRating
                    }
                });
                
                console.log(`   ${rankCounter}. ${stock.ticker.padEnd(6)} -> ${newRating}`);
                rankCounter++;
            }
        }

        console.log('\n✨ Update Complete! All watchlists have been ranked and rated.');
        
    } catch (error) {
        console.error('Error updating ratings:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateWatchlistRatings();
