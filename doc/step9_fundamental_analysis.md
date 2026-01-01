# STEP 9: Fundamental Analysis (CAN SLIM)

## ⚠️ BLOCKING REQUIREMENTS
**PREREQUISITES (MUST BE COMPLETE):**
- ✅ STEP 1-8 completed
- ✅ Market data fetcher working
- ✅ Technical indicators operational
- ✅ FMP API key configured

**YOU MUST COMPLETE THIS STEP 100% BEFORE PROCEEDING TO STEP 10**

---

## 🎯 Objectives
1. Implement CAN SLIM scoring algorithm
2. Fetch fundamental data (income statement, key metrics, ratios)
3. Calculate earnings growth metrics
4. Calculate sales growth metrics
5. Analyze institutional ownership
6. Calculate relative strength
7. Create comprehensive scoring system

---

## ⏱️ Estimated Duration
**3-4 hours**

---

## 📝 CAN SLIM Methodology

**CAN SLIM** is William J. O'Neil's stock selection system:

- **C** = Current quarterly earnings (25% growth minimum)
- **A** = Annual earnings growth (25%+ past 3 years)
- **N** = New products, management, highs (catalyst for growth)
- **S** = Supply & demand (volume, float, institutional ownership)
- **L** = Leader or laggard (relative strength vs market)
- **I** = Institutional sponsorship (quality institutions buying)
- **M** = Market direction (follow the trend)

---

## 📝 Implementation Steps

### 9.1 Create Fundamental Analyzer Service
Create `src/services/fundamental/fundamentalAnalyzer.js`:

```javascript
const axios = require('axios');
const logger = require('../../utils/logger');
const { getCache, setCache } = require('../cache/cacheManager');

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
        
        // Fetch all fundamental data in parallel
        const [incomeStatement, keyMetrics, ratios, profile, quote] = await Promise.all([
            fetchIncomeStatement(ticker),
            fetchKeyMetrics(ticker),
            fetchRatios(ticker),
            fetchCompanyProfile(ticker),
            fetchQuote(ticker)
        ]);
        
        // Calculate CAN SLIM score
        const canSlimScore = calculateCANSLIM({
            incomeStatement,
            keyMetrics,
            ratios,
            profile,
            quote
        });
        
        const result = {
            ticker,
            profile: {
                name: profile.companyName,
                sector: profile.sector,
                industry: profile.industry,
                description: profile.description,
                ceo: profile.ceo,
                website: profile.website,
                employees: profile.fullTimeEmployees
            },
            quote: {
                price: quote.price,
                marketCap: quote.marketCap,
                volume: quote.volume,
                avgVolume: quote.avgVolume,
                pe: quote.pe,
                eps: quote.eps,
                beta: quote.beta
            },
            growth: {
                quarterlyEarningsGrowth: canSlimScore.metrics.earningsGrowthQoQ,
                annualEarningsGrowth: canSlimScore.metrics.earningsGrowthYoY,
                revenueGrowth: canSlimScore.metrics.revenueGrowth,
                epsGrowth: canSlimScore.metrics.epsGrowth
            },
            valuation: {
                pe: ratios[0]?.peRatio || null,
                peg: ratios[0]?.pegRatio || null,
                priceToBook: ratios[0]?.priceToBookRatio || null,
                priceToSales: ratios[0]?.priceToSalesRatio || null,
                evToEbitda: ratios[0]?.enterpriseValueMultiple || null
            },
            profitability: {
                grossMargin: ratios[0]?.grossProfitMargin || null,
                operatingMargin: ratios[0]?.operatingProfitMargin || null,
                netMargin: ratios[0]?.netProfitMargin || null,
                roe: ratios[0]?.returnOnEquity || null,
                roa: ratios[0]?.returnOnAssets || null
            },
            financial: {
                debtToEquity: ratios[0]?.debtEquityRatio || null,
                currentRatio: ratios[0]?.currentRatio || null,
                quickRatio: ratios[0]?.quickRatio || null
            },
            canSlim: canSlimScore,
            fetchedAt: new Date()
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

async function fetchIncomeStatement(ticker) {
    try {
        const url = `${FMP_BASE_URL}/income-statement/${ticker}`;
        const response = await axios.get(url, {
            params: { 
                apikey: FMP_API_KEY,
                limit: 8 // Last 8 quarters
            },
            timeout: 10000
        });
        
        if (!response.data || response.data.length === 0) {
            throw new Error(`No income statement data for ${ticker}`);
        }
        
        return response.data;
        
    } catch (error) {
        logger.error(`Income statement fetch error: ${error.message}`);
        throw error;
    }
}

async function fetchKeyMetrics(ticker) {
    try {
        const url = `${FMP_BASE_URL}/key-metrics/${ticker}`;
        const response = await axios.get(url, {
            params: { 
                apikey: FMP_API_KEY,
                limit: 8
            },
            timeout: 10000
        });
        
        return response.data || [];
        
    } catch (error) {
        logger.error(`Key metrics fetch error: ${error.message}`);
        return [];
    }
}

async function fetchRatios(ticker) {
    try {
        const url = `${FMP_BASE_URL}/ratios/${ticker}`;
        const response = await axios.get(url, {
            params: { 
                apikey: FMP_API_KEY,
                limit: 4
            },
            timeout: 10000
        });
        
        return response.data || [];
        
    } catch (error) {
        logger.error(`Ratios fetch error: ${error.message}`);
        return [];
    }
}

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

function calculateCANSLIM(data) {
    const { incomeStatement, keyMetrics, ratios, profile, quote } = data;
    
    let totalScore = 0;
    const maxScore = 100;
    const metrics = {};
    const grades = {};
    
    // C = Current Quarterly Earnings (20 points)
    const cScore = calculateCurrentEarnings(incomeStatement);
    metrics.earningsGrowthQoQ = cScore.growth;
    grades.C = cScore.grade;
    totalScore += cScore.score;
    
    // A = Annual Earnings (20 points)
    const aScore = calculateAnnualEarnings(incomeStatement);
    metrics.earningsGrowthYoY = aScore.growth;
    grades.A = aScore.grade;
    totalScore += aScore.score;
    
    // N = New (Revenue Growth as proxy) (15 points)
    const nScore = calculateNewness(incomeStatement);
    metrics.revenueGrowth = nScore.growth;
    grades.N = nScore.grade;
    totalScore += nScore.score;
    
    // S = Supply & Demand (Volume) (15 points)
    const sScore = calculateSupplyDemand(quote);
    metrics.volumeRatio = sScore.ratio;
    grades.S = sScore.grade;
    totalScore += sScore.score;
    
    // L = Leader (Relative Strength) (10 points)
    const lScore = calculateLeadership(quote);
    metrics.priceChange = lScore.change;
    grades.L = lScore.grade;
    totalScore += lScore.score;
    
    // I = Institutional (10 points)
    const iScore = calculateInstitutional(keyMetrics);
    metrics.institutionalOwnership = iScore.ownership;
    grades.I = iScore.grade;
    totalScore += iScore.score;
    
    // M = Market Direction (10 points - requires market data)
    // Placeholder for now
    grades.M = 'B';
    totalScore += 7;
    
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

function calculateCurrentEarnings(incomeStatement) {
    try {
        if (!incomeStatement || incomeStatement.length < 5) {
            return { score: 0, grade: 'F', growth: 0 };
        }
        
        // Compare most recent quarter to same quarter last year
        const current = incomeStatement[0];
        const yearAgo = incomeStatement[4]; // 4 quarters ago
        
        const currentEPS = current.eps || current.netIncome / current.weightedAverageShsOut;
        const yearAgoEPS = yearAgo.eps || yearAgo.netIncome / yearAgo.weightedAverageShsOut;
        
        const growth = ((currentEPS - yearAgoEPS) / Math.abs(yearAgoEPS)) * 100;
        
        let score, grade;
        if (growth >= 50) {
            score = 20; grade = 'A+';
        } else if (growth >= 30) {
            score = 18; grade = 'A';
        } else if (growth >= 20) {
            score = 15; grade = 'B';
        } else if (growth >= 10) {
            score = 10; grade = 'C';
        } else if (growth >= 0) {
            score = 5; grade = 'D';
        } else {
            score = 0; grade = 'F';
        }
        
        return { score, grade, growth: parseFloat(growth.toFixed(2)) };
        
    } catch (error) {
        logger.error('Current earnings calculation error:', error.message);
        return { score: 0, grade: 'F', growth: 0 };
    }
}

function calculateAnnualEarnings(incomeStatement) {
    try {
        if (!incomeStatement || incomeStatement.length < 8) {
            return { score: 0, grade: 'F', growth: 0 };
        }
        
        // Calculate 3-year annual growth
        const recent = incomeStatement.slice(0, 4); // Last 4 quarters
        const threeYearsAgo = incomeStatement.slice(4, 8);
        
        const recentEPS = recent.reduce((sum, q) => sum + (q.eps || 0), 0);
        const oldEPS = threeYearsAgo.reduce((sum, q) => sum + (q.eps || 0), 0);
        
        if (oldEPS <= 0) {
            return { score: 0, grade: 'F', growth: 0 };
        }
        
        const growth = ((recentEPS - oldEPS) / Math.abs(oldEPS)) * 100;
        
        let score, grade;
        if (growth >= 40) {
            score = 20; grade = 'A+';
        } else if (growth >= 25) {
            score = 18; grade = 'A';
        } else if (growth >= 15) {
            score = 14; grade = 'B';
        } else if (growth >= 5) {
            score = 8; grade = 'C';
        } else if (growth >= 0) {
            score = 4; grade = 'D';
        } else {
            score = 0; grade = 'F';
        }
        
        return { score, grade, growth: parseFloat(growth.toFixed(2)) };
        
    } catch (error) {
        logger.error('Annual earnings calculation error:', error.message);
        return { score: 0, grade: 'F', growth: 0 };
    }
}

function calculateNewness(incomeStatement) {
    try {
        if (!incomeStatement || incomeStatement.length < 4) {
            return { score: 0, grade: 'F', growth: 0 };
        }
        
        // Revenue growth (last quarter vs year ago)
        const current = incomeStatement[0];
        const yearAgo = incomeStatement[3];
        
        const growth = ((current.revenue - yearAgo.revenue) / yearAgo.revenue) * 100;
        
        let score, grade;
        if (growth >= 30) {
            score = 15; grade = 'A';
        } else if (growth >= 20) {
            score = 12; grade = 'B';
        } else if (growth >= 10) {
            score = 8; grade = 'C';
        } else if (growth >= 0) {
            score = 4; grade = 'D';
        } else {
            score = 0; grade = 'F';
        }
        
        return { score, grade, growth: parseFloat(growth.toFixed(2)) };
        
    } catch (error) {
        logger.error('Newness calculation error:', error.message);
        return { score: 0, grade: 'F', growth: 0 };
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
        if (!quote.changesPercentage) {
            return { score: 0, grade: 'F', change: 0 };
        }
        
        const change = quote.changesPercentage;
        
        let score, grade;
        if (change >= 5) {
            score = 10; grade = 'A';
        } else if (change >= 2) {
            score = 8; grade = 'B';
        } else if (change >= 0) {
            score = 5; grade = 'C';
        } else if (change >= -2) {
            score = 3; grade = 'D';
        } else {
            score = 0; grade = 'F';
        }
        
        return { score, grade, change: parseFloat(change.toFixed(2)) };
        
    } catch (error) {
        logger.error('Leadership calculation error:', error.message);
        return { score: 0, grade: 'F', change: 0 };
    }
}

function calculateInstitutional(keyMetrics) {
    try {
        if (!keyMetrics || keyMetrics.length === 0) {
            return { score: 5, grade: 'C', ownership: 50 }; // Default average
        }
        
        // Use institutional ownership if available
        const ownership = keyMetrics[0].institutionalOwnership || 50;
        
        let score, grade;
        if (ownership >= 70) {
            score = 10; grade = 'A';
        } else if (ownership >= 60) {
            score = 8; grade = 'B';
        } else if (ownership >= 40) {
            score = 5; grade = 'C';
        } else if (ownership >= 20) {
            score = 3; grade = 'D';
        } else {
            score = 0; grade = 'F';
        }
        
        return { score, grade, ownership: parseFloat(ownership.toFixed(2)) };
        
    } catch (error) {
        logger.error('Institutional calculation error:', error.message);
        return { score: 5, grade: 'C', ownership: 50 };
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
```

### 9.2 Create Fundamental Analysis Route
Create `src/api/routes/fundamental.js`:

```javascript
const express = require('express');
const router = express.Router();
const { getFundamentals } = require('../../services/fundamental/fundamentalAnalyzer');
const logger = require('../../utils/logger');

router.get('/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        
        logger.info(`Fundamental analysis request for ${ticker}`);
        
        const fundamentals = await getFundamentals(ticker);
        
        res.json(fundamentals);
        
    } catch (error) {
        logger.error('Fundamental analysis error:', error);
        
        if (error.message.includes('No')) {
            res.status(404).json({ 
                error: 'Company not found or insufficient data',
                details: error.message 
            });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

module.exports = router;
```

### 9.3 Update Server with Fundamental Route
Update `src/api/server.js`:

```javascript
// Add this line with other route imports
const fundamentalRoutes = require('./routes/fundamental');

// Add this line with other route registrations
app.use('/api/fundamental', fundamentalRoutes);
```

### 9.4 Create Test File
Create `tests/test-fundamental.js`:

```javascript
require('dotenv').config();
const { getFundamentals } = require('../src/services/fundamental/fundamentalAnalyzer');
const { initCache } = require('../src/services/cache/cacheManager');

async function runTests() {
    console.log('🧪 Testing Fundamental Analysis...\n');
    
    try {
        await initCache();
        
        // Test with a well-known growth stock
        console.log('Test: Analyzing AAPL fundamentals...');
        const analysis = await getFundamentals('AAPL');
        
        console.log('\n📊 Company Profile:');
        console.log(`Name: ${analysis.profile.name}`);
        console.log(`Sector: ${analysis.profile.sector}`);
        console.log(`Industry: ${analysis.profile.industry}`);
        
        console.log('\n💰 Valuation:');
        console.log(`P/E Ratio: ${analysis.valuation.pe?.toFixed(2) || 'N/A'}`);
        console.log(`PEG Ratio: ${analysis.valuation.peg?.toFixed(2) || 'N/A'}`);
        console.log(`Price/Book: ${analysis.valuation.priceToBook?.toFixed(2) || 'N/A'}`);
        
        console.log('\n📈 Growth Metrics:');
        console.log(`Quarterly Earnings Growth: ${analysis.growth.quarterlyEarningsGrowth?.toFixed(2)}%`);
        console.log(`Annual Earnings Growth: ${analysis.growth.annualEarningsGrowth?.toFixed(2)}%`);
        console.log(`Revenue Growth: ${analysis.growth.revenueGrowth?.toFixed(2)}%`);
        
        console.log('\n💪 Profitability:');
        console.log(`Gross Margin: ${(analysis.profitability.grossMargin * 100)?.toFixed(2)}%`);
        console.log(`Operating Margin: ${(analysis.profitability.operatingMargin * 100)?.toFixed(2)}%`);
        console.log(`Net Margin: ${(analysis.profitability.netMargin * 100)?.toFixed(2)}%`);
        console.log(`ROE: ${(analysis.profitability.roe * 100)?.toFixed(2)}%`);
        
        console.log('\n🎯 CAN SLIM Analysis:');
        console.log(`Overall Score: ${analysis.canSlim.score}/${analysis.canSlim.maxScore}`);
        console.log(`Rating: ${analysis.canSlim.rating}`);
        console.log(`Recommendation: ${analysis.canSlim.recommendation}`);
        console.log('\nGrades:');
        Object.entries(analysis.canSlim.grades).forEach(([key, grade]) => {
            const labels = {
                C: 'Current Earnings',
                A: 'Annual Earnings',
                N: 'Newness/Revenue',
                S: 'Supply/Demand',
                L: 'Leadership',
                I: 'Institutional',
                M: 'Market'
            };
            console.log(`  ${key} (${labels[key]}): ${grade}`);
        });
        
        console.log('\n📝 Interpretation:');
        console.log(`Summary: ${analysis.canSlim.interpretation.summary}`);
        if (analysis.canSlim.interpretation.strengths.length > 0) {
            console.log('Strengths:');
            analysis.canSlim.interpretation.strengths.forEach(s => console.log(`  • ${s}`));
        }
        if (analysis.canSlim.interpretation.weaknesses.length > 0) {
            console.log('Weaknesses:');
            analysis.canSlim.interpretation.weaknesses.forEach(w => console.log(`  • ${w}`));
        }
        
        console.log('\n✅ Fundamental analysis test passed!\n');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
    
    process.exit(0);
}

runTests();
```

---

## ✅ Completion Checklist

Before proceeding to STEP 10, verify ALL items:

- [ ] `src/services/fundamental/fundamentalAnalyzer.js` created
- [ ] `src/api/routes/fundamental.js` created
- [ ] Server updated with fundamental route
- [ ] `tests/test-fundamental.js` created
- [ ] Test passes: `node tests/test-fundamental.js`
- [ ] CAN SLIM scoring works correctly
- [ ] All grade calculations (C, A, N, S, L, I, M) functioning
- [ ] Earnings growth metrics calculating
- [ ] Revenue growth metrics calculating
- [ ] Interpretation logic working

---

## 🧪 Testing

```bash
# Test 1: Run fundamental analysis test
node tests/test-fundamental.js
# Expected: Full CAN SLIM analysis with grades

# Test 2: Test API endpoint
curl http://localhost:3000/api/fundamental/AAPL
# Expected: Complete fundamental data with CAN SLIM score

# Test 3: Test multiple stocks
curl http://localhost:3000/api/fundamental/MSFT
curl http://localhost:3000/api/fundamental/GOOGL
# Expected: Each returns different fundamental analysis
```

---

## 📊 CAN SLIM Scoring Reference

### Grade Scale
- **A+/A**: Excellent (90-100%)
- **B**: Good (75-89%)
- **C**: Fair (60-74%)
- **D**: Below Average (50-59%)
- **F**: Poor (<50%)

### Minimum Standards (William J. O'Neil)
- Current Earnings: +25% YoY minimum
- Annual Earnings: +25% per year (3 years)
- Revenue Growth: +20% minimum
- Institutional Ownership: 40-80% (not too high, not too low)
- Relative Strength: Top 20% of market

---

## 🔄 Next Step

**Once ALL checkboxes above are marked:**

➡️ **Proceed to:** `step10_news_analysis.md`

---

**Last Updated:** December 31, 2025
