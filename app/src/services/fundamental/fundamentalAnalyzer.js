const axios = require('axios');
let yahooFinance;
try {
    const YahooFinanceClass = require('yahoo-finance2').default;
    try {
        yahooFinance = new YahooFinanceClass();
    } catch (e) {
        yahooFinance = YahooFinanceClass;
    }
} catch (e) {
    console.error("Failed to load yahoo-finance2", e);
}

const logger = require('../../utils/logger');
const { get: getCache, set: setCache } = require('../cache/cacheManager');
const twsClient = require('../ibkr/twsClient');

// Multiple data sources for fallback strategy
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = process.env.FMP_API_KEY;

/**
 * Fetch fundamental data from Yahoo Finance (Primary - Free & Reliable)
 */
async function fetchFromYahoo(ticker) {
    logger.info(`[Yahoo] Fetching fundamental data for ${ticker}...`);
    
    // Modules to fetch:
    // summaryProfile: Industry, sector, description, employees
    // summaryDetail: Price, marketCap, volume
    // defaultKeyStatistics: PE, EPS, Beta, Margins
    // financialData: Target price, revenue growth
    // calendarEvents: Earnings date
    const modules = ['summaryProfile', 'summaryDetail', 'defaultKeyStatistics', 'financialData', 'calendarEvents', 'price'];
    
    const result = await yahooFinance.quoteSummary(ticker, { modules });
    
    if (!result) {
        throw new Error('No data returned from Yahoo Finance');
    }

    const { summaryProfile, summaryDetail, defaultKeyStatistics, financialData, calendarEvents, price } = result;

    if (!summaryProfile || !price) {
        throw new Error('Incomplete data from Yahoo Finance');
    }

    // Map to standard format
    return {
        profile: {
            companyName: price.longName || ticker,
            sector: summaryProfile.sector || 'N/A',
            industry: summaryProfile.industry || 'N/A',
            description: summaryProfile.longBusinessSummary || 'N/A',
            ceo: (summaryProfile.companyOfficers && summaryProfile.companyOfficers.length > 0) ? summaryProfile.companyOfficers[0].name : 'N/A',
            website: summaryProfile.website || 'N/A',
            fullTimeEmployees: summaryProfile.fullTimeEmployees || 0
        },
        quote: {
            price: price.regularMarketPrice || 0,
            marketCap: price.marketCap || 0,
            volume: summaryDetail.volume || 0,
            avgVolume: summaryDetail.averageVolume || 0,
            pe: summaryDetail.trailingPE || null,
            eps: defaultKeyStatistics.trailingEps || null,
            beta: defaultKeyStatistics.beta || null,
            dividendYield: summaryDetail.dividendYield || null,
            bookValue: defaultKeyStatistics.bookValue || null,
            profitMargin: defaultKeyStatistics.profitMargins || null,
            returnOnEquity: financialData.returnOnEquity || null
        },
        calendar: {
            earnings: calendarEvents && calendarEvents.earnings ? [calendarEvents.earnings] : [],
            dividends: [], // Not directly in summary
            splits: []
        },
        source: 'Yahoo Finance'
    };
}

/**
 * Fetch fundamental data from IBKR (Secondary)
 */
async function fetchFromIBKR(ticker) {
    try {
        logger.info(`[IBKR] Fetching fundamental data for ${ticker}...`);
        
        // Get snapshot report (company overview and key metrics)
        const snapshotData = await twsClient.getFundamentalData(ticker, 'ReportsFinSummary');
        
        // Get calendar data (earnings, dividends)
        let calendar = { earnings: [], dividends: [], splits: [] };
        try {
            calendar = await twsClient.getCompanyCalendar(ticker);
        } catch (err) {
            logger.warn(`⚠️  Could not fetch calendar: ${err.message}`);
        }
        
        // Parse the XML data (simplified - in production you'd use a proper XML parser)
        const parsedData = parseIBKRFundamentals(snapshotData);
        
        return {
            profile: parsedData.profile,
            quote: parsedData.quote,
            calendar: calendar,
            source: 'IBKR'
        };
    } catch (error) {
        throw new Error(`IBKR fundamentals fetch failed: ${error.message}`);
    }
}

/**
 * Parse IBKR fundamental XML data
 */
function parseIBKRFundamentals(xmlData) {
    const result = {
        profile: {
            companyName: extractXMLValue(xmlData, 'CoName') || 'N/A',
            sector: extractXMLValue(xmlData, 'Sector') || 'N/A',
            industry: extractXMLValue(xmlData, 'Industry') || 'N/A',
            description: extractXMLValue(xmlData, 'BusinessSummary') || 'N/A',
            ceo: extractXMLValue(xmlData, 'CEO') || 'N/A',
            website: extractXMLValue(xmlData, 'WebSite') || 'N/A',
            fullTimeEmployees: parseInt(extractXMLValue(xmlData, 'Employees')) || 0
        },
        quote: {
            price: parseFloat(extractXMLValue(xmlData, 'LastPrice')) || 0,
            marketCap: parseFloat(extractXMLValue(xmlData, 'MktCap')) || 0,
            volume: parseFloat(extractXMLValue(xmlData, 'Volume')) || 0,
            avgVolume: parseFloat(extractXMLValue(xmlData, 'AvgVolume')) || 0,
            pe: parseFloat(extractXMLValue(xmlData, 'PE')) || null,
            eps: parseFloat(extractXMLValue(xmlData, 'EPS')) || null,
            beta: parseFloat(extractXMLValue(xmlData, 'Beta')) || null,
            dividendYield: parseFloat(extractXMLValue(xmlData, 'DivYield')) || null,
            bookValue: parseFloat(extractXMLValue(xmlData, 'BookValue')) || null,
            profitMargin: parseFloat(extractXMLValue(xmlData, 'ProfitMargin')) || null,
            returnOnEquity: parseFloat(extractXMLValue(xmlData, 'ROE')) || null
        }
    };
    
    return result;
}

/**
 * Extract value from XML string
 */
function extractXMLValue(xmlString, tagName) {
    const regex = new RegExp(`<${tagName}>([^<]+)</${tagName}>`, 'i');
    const match = xmlString.match(regex);
    return match ? match[1].trim() : null;
}

/**
 * Fetch from Alpha Vantage OVERVIEW
 */
async function fetchFromAlphaVantage(ticker) {
    const params = {
        function: 'OVERVIEW',
        symbol: ticker,
        apikey: ALPHA_VANTAGE_API_KEY
    };
    
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, { params, timeout: 5000 });
    
    if (response.data.Note) {
        throw new Error('Alpha Vantage rate limit (500/day)');
    }
    
    if (!response.data.Symbol) {
        throw new Error('No overview data available');
    }
    
    const data = response.data;
    
    // Convert to standard format
    return {
        profile: {
            companyName: data.Name,
            sector: data.Sector,
            industry: data.Industry,
            description: data.Description,
            ceo: 'N/A', // Not in Alpha Vantage
            website: 'N/A', // Not in Alpha Vantage
            fullTimeEmployees: parseInt(data.FullTimeEmployees) || 0
        },
        quote: {
            price: parseFloat(data.Price) || 0,
            marketCap: parseFloat(data.MarketCapitalization) || 0,
            volume: parseFloat(data.Volume) || 0,
            avgVolume: parseFloat(data.Volume) || 0, // Use same as volume
            pe: parseFloat(data.PERatio) || null,
            eps: parseFloat(data.EPS) || null,
            beta: parseFloat(data.Beta) || null,
            dividendYield: parseFloat(data.DividendYield) || null,
            bookValue: parseFloat(data.BookValue) || null,
            profitMargin: parseFloat(data.ProfitMargin) || null,
            returnOnEquity: parseFloat(data.ReturnOnEquityTTM) || null
        }
    };
}

/**
 * Fetch from FMP (Fallback)
 */
async function fetchFromFMP(ticker) {
    const [profile, quote] = await Promise.all([
        fetchCompanyProfileFMP(ticker),
        fetchQuoteFMP(ticker)
    ]);
    
    return { profile, quote };
}

async function fetchCompanyProfileFMP(ticker) {
    const url = `${FMP_BASE_URL}/profile/${ticker}`;
    const response = await axios.get(url, {
        params: { apikey: FMP_API_KEY },
        timeout: 10000
    });
    
    if (!response.data || response.data.length === 0) {
        throw new Error('No profile data');
    }
    
    return response.data[0];
}

async function fetchQuoteFMP(ticker) {
    const url = `${FMP_BASE_URL}/quote/${ticker}`;
    const response = await axios.get(url, {
        params: { apikey: FMP_API_KEY },
        timeout: 10000
    });
    
    if (!response.data || response.data.length === 0) {
        throw new Error('No quote data');
    }
    
    return response.data[0];
}

async function getFundamentals(ticker) {
    try {
        const cacheKey = `fundamentals:${ticker}`;
        
        // Check cache (6 hours)
        const cached = await getCache(cacheKey);
        if (cached) {
            logger.info(`Cache HIT for fundamentals: ${ticker}`);
            return cached;
        }
        
        logger.info(`Fetching fundamental data for ${ticker}...`);
        
        let data = null;
        let source = null;
        
        // Try 1: Yahoo Finance (Primary - Free & Reliable)
        try {
            logger.info(`[1/4] Trying Yahoo Finance for ${ticker}...`);
            data = await fetchFromYahoo(ticker);
            if (data && data.profile) {
                source = 'Yahoo Finance';
                logger.info(`✅ Yahoo Finance returned fundamental data with calendar events`);
            }
        } catch (error) {
            logger.warn(`⚠️  Yahoo Finance failed: ${error.message}`);
            // Continue to fallbacks
        }

        // Try 2: IBKR (Secondary)
        if (!data) {
            try {
                logger.info(`[2/4] Trying IBKR for ${ticker}...`);
                data = await fetchFromIBKR(ticker);
                if (data && data.profile) {
                    source = 'IBKR';
                    logger.info(`✅ IBKR returned fundamental data with calendar events`);
                }
            } catch (error) {
                logger.warn(`⚠️  IBKR failed: ${error.message}`);
                // Continue to fallbacks
            }
        }
        
        // Try 3: Alpha Vantage (fallback)
        if (!data && ALPHA_VANTAGE_API_KEY) {
            try {
                logger.info(`[3/4] Trying Alpha Vantage for ${ticker}...`);
                data = await fetchFromAlphaVantage(ticker);
                if (data && data.profile) {
                    source = 'Alpha Vantage';
                    data.calendar = { earnings: [], dividends: [], splits: [] }; // No calendar from AV
                    logger.info(`✅ Alpha Vantage returned fundamental data`);
                }
            } catch (error) {
                logger.warn(`⚠️  Alpha Vantage failed: ${error.message}`);
            }
        } else if (!data) {
            logger.info(`⚠️  Alpha Vantage not configured (ALPHA_VANTAGE_API_KEY missing)`);
        }
        
        // Try 4: FMP (secondary fallback)
        if (!data && FMP_API_KEY) {
            try {
                logger.info(`[4/4] Trying FMP for ${ticker}...`);
                data = await fetchFromFMP(ticker);
                if (data && data.profile) {
                    source = 'FMP';
                    data.calendar = { earnings: [], dividends: [], splits: [] }; // No calendar from FMP
                    logger.info(`✅ FMP returned fundamental data`);
                }
            } catch (error) {
                logger.warn(`⚠️  FMP failed: ${error.message}`);
            }
        } else if (!data) {
            logger.info(`⚠️  FMP not configured (FMP_API_KEY missing)`);
        }
        
        // If all sources failed
        if (!data || !data.profile) {
            logger.error(`❌ All fundamental data sources failed for ${ticker}`);
            return {
                ticker,
                error: 'Unable to fetch fundamental data - all sources failed',
                score: 0,
                grade: 'F',
                rating: 'Unable to analyze',
                factors: {}
            };
        }
        
        logger.info(`Fundamental data source used: ${source}`);
        
        // Calculate simplified CAN SLIM score based on available data
        const canSlimScore = calculateSimplifiedCANSLIM({
            profile: data.profile,
            quote: data.quote
        });
        
        const result = {
            ticker,
            source,
            profile: {
                name: data.profile.companyName || ticker,
                sector: data.profile.sector || 'N/A',
                industry: data.profile.industry || 'N/A',
                description: data.profile.description || '',
                ceo: data.profile.ceo || 'N/A',
                website: data.profile.website || 'N/A',
                employees: data.profile.fullTimeEmployees || 0
            },
            quote: {
                price: data.quote.price || 0,
                marketCap: data.quote.marketCap || 0,
                volume: data.quote.volume || 0,
                avgVolume: data.quote.avgVolume || 0,
                pe: data.quote.pe || null,
                eps: data.quote.eps || null,
                beta: data.quote.beta || null,
                dayLow: data.quote.dayLow || 0,
                dayHigh: data.quote.dayHigh || 0,
                yearLow: data.quote.yearLow || 0,
                yearHigh: data.quote.yearHigh || 0,
                priceAvg50: data.quote.priceAvg50 || 0,
                priceAvg200: data.quote.priceAvg200 || 0
            },
            growth: {
                earningsGrowthYoY: canSlimScore.metrics.earningsGrowthYoY || 0,
                priceChange: canSlimScore.metrics.priceChange || 0,
                priceChange50Day: canSlimScore.metrics.priceChange50Day || 0,
                priceChange200Day: canSlimScore.metrics.priceChange200Day || 0
            },
            valuation: {
                pe: data.quote.pe || null,
                marketCap: data.quote.marketCap || 0,
                sharesOutstanding: data.quote.sharesOutstanding || 0
            },
            calendar: data.calendar || { earnings: [], dividends: [], splits: [] },
            canSlim: canSlimScore,
            fetchedAt: new Date(),
            note: source === 'IBKR' 
                ? 'Comprehensive data from Interactive Brokers with calendar events' 
                : 'Limited analysis using free API tier. Calendar data not available.'
        };
        
        // Cache for 6 hours (21600 seconds)
        await setCache(cacheKey, result, 21600);
        logger.info(`Fundamental data cached for ${ticker}`);
        
        return result;
        
    } catch (error) {
        logger.error(`Fundamental analysis error for ${ticker}:`, error.message);
        throw error;
    }
}

// NOTE: The following endpoints require paid FMP API subscription
// They were available in the free tier before August 31, 2025
// - /income-statement (403 Forbidden on free tier)
// - /key-metrics (403 Forbidden on free tier)
// - /ratios (403 Forbidden on free tier)
// This simplified version uses only free tier endpoints

function calculateSimplifiedCANSLIM(data) {
    const { profile, quote } = data;
    
    let totalScore = 0;
    const maxScore = 100;
    const metrics = {};
    const grades = {};
    
    // C = Current Earnings - Using EPS if available (20 points)
    const cScore = calculateCurrentEarningsFromQuote(quote);
    metrics.earningsGrowthYoY = cScore.growth;
    grades.C = cScore.grade;
    totalScore += cScore.score;
    
    // A = Annual Earnings - Estimated from PE and EPS (20 points)
    const aScore = calculateAnnualEarningsFromQuote(quote);
    metrics.earningsGrowthYoY = aScore.growth;
    grades.A = aScore.grade;
    totalScore += aScore.score;
    
    // N = Newness - Price momentum vs 52-week high (15 points)
    const nScore = calculateNewnessFromPrice(quote);
    metrics.priceChange = nScore.change;
    grades.N = nScore.grade;
    totalScore += nScore.score;
    
    // S = Supply & Demand (Volume) (15 points)
    const sScore = calculateSupplyDemand(quote);
    metrics.volumeRatio = sScore.ratio;
    grades.S = sScore.grade;
    totalScore += sScore.score;
    
    // L = Leader (Relative Strength vs 50/200 day MA) (10 points)
    const lScore = calculateLeadership(quote);
    metrics.priceChange50Day = lScore.change50Day;
    metrics.priceChange200Day = lScore.change200Day;
    grades.L = lScore.grade;
    totalScore += lScore.score;
    
    // I = Institutional - Using market cap as proxy (10 points)
    const iScore = calculateInstitutionalFromMarketCap(quote);
    metrics.marketCap = iScore.marketCap;
    grades.I = iScore.grade;
    totalScore += iScore.score;
    
    // M = Market Direction (10 points)
    const mScore = calculateMarketDirection(quote);
    grades.M = mScore.grade;
    totalScore += mScore.score;
    
    // Determine overall rating
    let rating, recommendation;
    if (totalScore >= 85) {
        rating = 'EXCELLENT';
        recommendation = 'STRONG_BUY';
    } else if (totalScore >= 70) {
        rating = 'GOOD';
        recommendation = 'BUY';
    } else if (totalScore >= 55) {
        rating = 'FAIR';
        recommendation = 'HOLD';
    } else if (totalScore >= 40) {
        rating = 'POOR';
        recommendation = 'SELL';
    } else {
        rating = 'VERY_POOR';
        recommendation = 'STRONG_SELL';
    }
    
    return {
        score: Math.round(totalScore),
        maxScore,
        rating,
        recommendation,
        grades,
        metrics,
        interpretation: getCANSLIMInterpretation(grades, totalScore)
    };
}

function calculateCurrentEarningsFromQuote(quote) {
    try {
        // Use EPS and PE ratio as indicators
        if (!quote.eps || !quote.pe) {
            return { score: 10, grade: 'C', growth: 0 }; // Neutral if no data
        }
        
        const eps = quote.eps;
        
        let score, grade, growth = 0;
        
        // Higher EPS is better
        if (eps >= 5) {
            score = 20; grade = 'A+'; growth = 50;
        } else if (eps >= 3) {
            score = 18; grade = 'A'; growth = 30;
        } else if (eps >= 1) {
            score = 15; grade = 'B'; growth = 20;
        } else if (eps >= 0) {
            score = 10; grade = 'C'; growth = 10;
        } else {
            score = 0; grade = 'F'; growth = -10;
        }
        
        return { score, grade, growth: parseFloat(growth.toFixed(2)) };
        
    } catch (error) {
        logger.error('Current earnings calculation error:', error.message);
        return { score: 10, grade: 'C', growth: 0 };
    }
}

function calculateAnnualEarningsFromQuote(quote) {
    try {
        // Use PE ratio as indicator (lower is often better for growth)
        if (!quote.pe) {
            return { score: 10, grade: 'C', growth: 0 };
        }
        
        const pe = quote.pe;
        let score, grade, growth = 0;
        
        // PE between 15-25 is ideal for growth stocks
        if (pe >= 15 && pe <= 25) {
            score = 20; grade = 'A+'; growth = 25;
        } else if (pe >= 10 && pe <= 30) {
            score = 18; grade = 'A'; growth = 20;
        } else if (pe >= 5 && pe <= 40) {
            score = 14; grade = 'B'; growth = 15;
        } else if (pe > 0) {
            score = 8; grade = 'C'; growth = 5;
        } else {
            score = 0; grade = 'F'; growth = 0;
        }
        
        return { score, grade, growth: parseFloat(growth.toFixed(2)) };
        
    } catch (error) {
        logger.error('Annual earnings calculation error:', error.message);
        return { score: 10, grade: 'C', growth: 0 };
    }
}

function calculateNewnessFromPrice(quote) {
    try {
        if (!quote.price || !quote.yearHigh) {
            return { score: 8, grade: 'C', change: 0 };
        }
        
        // Calculate how close to 52-week high
        const priceToHighRatio = (quote.price / quote.yearHigh) * 100;
        
        let score, grade;
        if (priceToHighRatio >= 95) {
            score = 15; grade = 'A';
        } else if (priceToHighRatio >= 85) {
            score = 12; grade = 'B';
        } else if (priceToHighRatio >= 70) {
            score = 8; grade = 'C';
        } else if (priceToHighRatio >= 50) {
            score = 4; grade = 'D';
        } else {
            score = 0; grade = 'F';
        }
        
        return { score, grade, change: parseFloat(priceToHighRatio.toFixed(2)) };
        
    } catch (error) {
        logger.error('Newness calculation error:', error.message);
        return { score: 8, grade: 'C', change: 0 };
    }
}

function calculateSupplyDemand(quote) {
    try {
        if (!quote.volume || !quote.avgVolume) {
            return { score: 0, grade: 'F', ratio: 0 };
        }
        
        const ratio = quote.volume / quote.avgVolume;
        
        let score, grade;
        if (ratio >= 2.0) {
            score = 15; grade = 'A';
        } else if (ratio >= 1.5) {
            score = 12; grade = 'B';
        } else if (ratio >= 1.0) {
            score = 8; grade = 'C';
        } else if (ratio >= 0.5) {
            score = 4; grade = 'D';
        } else {
            score = 0; grade = 'F';
        }
        
        return { score, grade, ratio: parseFloat(ratio.toFixed(2)) };
        
    } catch (error) {
        logger.error('Supply/demand calculation error:', error.message);
        return { score: 0, grade: 'F', ratio: 0 };
    }
}

function calculateLeadership(quote) {
    try {
        // Use price vs moving averages
        if (!quote.price || !quote.priceAvg50 || !quote.priceAvg200) {
            return { score: 5, grade: 'C', change50Day: 0, change200Day: 0 };
        }
        
        const change50 = ((quote.price - quote.priceAvg50) / quote.priceAvg50) * 100;
        const change200 = ((quote.price - quote.priceAvg200) / quote.priceAvg200) * 100;
        
        let score, grade;
        if (change50 >= 5 && change200 >= 10) {
            score = 10; grade = 'A';
        } else if (change50 >= 2 && change200 >= 5) {
            score = 8; grade = 'B';
        } else if (change50 >= 0 && change200 >= 0) {
            score = 5; grade = 'C';
        } else if (change50 >= -5 && change200 >= -5) {
            score = 3; grade = 'D';
        } else {
            score = 0; grade = 'F';
        }
        
        return { 
            score, 
            grade, 
            change50Day: parseFloat(change50.toFixed(2)),
            change200Day: parseFloat(change200.toFixed(2))
        };
        
    } catch (error) {
        logger.error('Leadership calculation error:', error.message);
        return { score: 5, grade: 'C', change50Day: 0, change200Day: 0 };
    }
}

function calculateInstitutionalFromMarketCap(quote) {
    try {
        // Use market cap as a proxy for institutional interest
        if (!quote.marketCap) {
            return { score: 5, grade: 'C', marketCap: 0 };
        }
        
        const marketCap = quote.marketCap;
        
        let score, grade;
        // Large cap (>10B) typically has strong institutional ownership
        if (marketCap >= 10000000000) {
            score = 10; grade = 'A';
        } else if (marketCap >= 2000000000) {
            score = 8; grade = 'B';
        } else if (marketCap >= 300000000) {
            score = 5; grade = 'C';
        } else if (marketCap >= 50000000) {
            score = 3; grade = 'D';
        } else {
            score = 0; grade = 'F';
        }
        
        return { score, grade, marketCap };
        
    } catch (error) {
        logger.error('Institutional calculation error:', error.message);
        return { score: 5, grade: 'C', marketCap: 0 };
    }
}

function calculateMarketDirection(quote) {
    try {
        // Use day change as market direction indicator
        if (!quote.changesPercentage) {
            return { score: 7, grade: 'B' };
        }
        
        const dayChange = quote.changesPercentage;
        
        let score, grade;
        if (dayChange >= 1) {
            score = 10; grade = 'A';
        } else if (dayChange >= 0) {
            score = 7; grade = 'B';
        } else if (dayChange >= -1) {
            score = 5; grade = 'C';
        } else if (dayChange >= -2) {
            score = 3; grade = 'D';
        } else {
            score = 0; grade = 'F';
        }
        
        return { score, grade };
        
    } catch (error) {
        logger.error('Market direction calculation error:', error.message);
        return { score: 7, grade: 'B' };
    }
}

function getCANSLIMInterpretation(grades, score) {
    const strengths = [];
    const weaknesses = [];
    
    if (grades.C === 'A' || grades.C === 'A+') {
        strengths.push('Strong quarterly earnings growth');
    } else if (grades.C === 'D' || grades.C === 'F') {
        weaknesses.push('Weak quarterly earnings');
    }
    
    if (grades.A === 'A' || grades.A === 'A+') {
        strengths.push('Excellent annual earnings history');
    } else if (grades.A === 'D' || grades.A === 'F') {
        weaknesses.push('Poor annual earnings growth');
    }
    
    if (grades.N === 'A') {
        strengths.push('Strong revenue growth momentum');
    } else if (grades.N === 'D' || grades.N === 'F') {
        weaknesses.push('Declining or slow revenue growth');
    }
    
    if (grades.S === 'A' || grades.S === 'B') {
        strengths.push('High volume indicates strong demand');
    } else if (grades.S === 'D' || grades.S === 'F') {
        weaknesses.push('Low volume suggests weak interest');
    }
    
    let summary;
    if (score >= 85) {
        summary = 'Exceptional CAN SLIM candidate with strong fundamentals across all criteria';
    } else if (score >= 70) {
        summary = 'Solid CAN SLIM stock with good growth characteristics';
    } else if (score >= 55) {
        summary = 'Moderate quality with mixed fundamental signals';
    } else {
        summary = 'Below CAN SLIM standards - avoid or wait for improvement';
    }
    
    return {
        summary,
        strengths,
        weaknesses
    };
}

module.exports = {
    getFundamentals
};
