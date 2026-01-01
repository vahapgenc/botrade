const axios = require('axios');
const logger = require('../../utils/logger');
const { get: getCache, set: setCache } = require('../cache/cacheManager');

const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = process.env.FMP_API_KEY;

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
        
        // Fetch available data with free tier
        const [profile, quote] = await Promise.all([
            fetchCompanyProfile(ticker),
            fetchQuote(ticker)
        ]);
        
        // Calculate simplified CAN SLIM score based on available data
        const canSlimScore = calculateSimplifiedCANSLIM({
            profile,
            quote
        });
        
        const result = {
            ticker,
            profile: {
                name: profile.companyName || ticker,
                sector: profile.sector || 'N/A',
                industry: profile.industry || 'N/A',
                description: profile.description || '',
                ceo: profile.ceo || 'N/A',
                website: profile.website || 'N/A',
                employees: profile.fullTimeEmployees || 0
            },
            quote: {
                price: quote.price || 0,
                marketCap: quote.marketCap || 0,
                volume: quote.volume || 0,
                avgVolume: quote.avgVolume || 0,
                pe: quote.pe || null,
                eps: quote.eps || null,
                beta: quote.beta || null,
                dayLow: quote.dayLow || 0,
                dayHigh: quote.dayHigh || 0,
                yearLow: quote.yearLow || 0,
                yearHigh: quote.yearHigh || 0,
                priceAvg50: quote.priceAvg50 || 0,
                priceAvg200: quote.priceAvg200 || 0
            },
            growth: {
                earningsGrowthYoY: canSlimScore.metrics.earningsGrowthYoY || 0,
                priceChange: canSlimScore.metrics.priceChange || 0,
                priceChange50Day: canSlimScore.metrics.priceChange50Day || 0,
                priceChange200Day: canSlimScore.metrics.priceChange200Day || 0
            },
            valuation: {
                pe: quote.pe || null,
                marketCap: quote.marketCap || 0,
                sharesOutstanding: quote.sharesOutstanding || 0
            },
            canSlim: canSlimScore,
            fetchedAt: new Date(),
            note: 'Limited analysis using free API tier. Upgrade to paid plan for full fundamental data.'
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

async function fetchCompanyProfile(ticker) {
    try {
        const url = `${FMP_BASE_URL}/profile/${ticker}`;
        const response = await axios.get(url, {
            params: { apikey: FMP_API_KEY },
            timeout: 10000
        });
        
        if (!response.data || response.data.length === 0) {
            throw new Error(`No profile data for ${ticker}`);
        }
        
        return response.data[0];
        
    } catch (error) {
        logger.error(`Profile fetch error: ${error.message}`);
        throw error;
    }
}

async function fetchQuote(ticker) {
    try {
        const url = `${FMP_BASE_URL}/quote/${ticker}`;
        const response = await axios.get(url, {
            params: { apikey: FMP_API_KEY },
            timeout: 5000
        });
        
        if (!response.data || response.data.length === 0) {
            throw new Error(`No quote data for ${ticker}`);
        }
        
        return response.data[0];
        
    } catch (error) {
        logger.error(`Quote fetch error: ${error.message}`);
        throw error;
    }
}

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
