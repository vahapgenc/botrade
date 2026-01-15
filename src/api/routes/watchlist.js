const express = require('express');
const router = express.Router();
const { prisma } = require('../../database/prisma');
const logger = require('../../utils/logger');
const dataFetcher = require('../../services/market/dataFetcher');
const { analyzeStock } = require('../routes/ai');

// Get all watchlists
router.get('/', async (req, res) => {
  try {
    const watchlists = await prisma.watchlist.findMany({
      include: {
        stocks: true,
        _count: {
          select: { stocks: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      watchlists: watchlists
    });
  } catch (error) {
    logger.error('Error fetching watchlists:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single watchlist with enriched stock data
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const watchlist = await prisma.watchlist.findUnique({
      where: { id: parseInt(id) },
      include: {
        stocks: {
          orderBy: {
            addedAt: 'desc'
          }
        }
      }
    });

    if (!watchlist) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found'
      });
    }

    // Enrich stock data with live prices and AI analysis
    const enrichedStocks = await Promise.all(
      watchlist.stocks.map(async (stock) => {
        try {
          // Fetch current market data
          const marketData = await dataFetcher.getStockQuote(stock.ticker);
          
          // Get latest AI analysis if available
          const latestAIAnalysis = await prisma.aIDecision.findFirst({
            where: { ticker: stock.ticker },
            orderBy: { timestamp: 'desc' },
            select: {
              decision: true,
              confidence: true,
              riskLevel: true,
              timeHorizon: true,
              reasoning: true,
              timestamp: true
            }
          });

          return {
            ...stock,
            currentPrice: marketData?.price || null,
            priceChange: marketData?.change || null,
            priceChangePct: marketData?.changePercent || null,
            marketCap: marketData?.marketCap || null,
            sector: stock.sector || marketData?.sector || null,
            volume: marketData?.volume || null,
            aiAnalysis: latestAIAnalysis || null
          };
        } catch (error) {
          logger.error(`Error enriching stock ${stock.ticker}:`, error);
          return {
            ...stock,
            currentPrice: null,
            priceChange: null,
            priceChangePct: null,
            marketCap: null,
            aiAnalysis: null
          };
        }
      })
    );

    res.json({
      success: true,
      watchlist: {
        ...watchlist,
        stocks: enrichedStocks
      }
    });
  } catch (error) {
    logger.error('Error fetching watchlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new watchlist
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Watchlist name is required'
      });
    }

    const watchlist = await prisma.watchlist.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    });

    logger.info(`Created watchlist: ${watchlist.name} (ID: ${watchlist.id})`);

    res.json({
      success: true,
      watchlist: watchlist
    });
  } catch (error) {
    logger.error('Error creating watchlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Rename watchlist
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Watchlist name is required'
      });
    }

    const watchlist = await prisma.watchlist.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    });

    logger.info(`Updated watchlist: ${watchlist.name} (ID: ${watchlist.id})`);

    res.json({
      success: true,
      watchlist: watchlist
    });
  } catch (error) {
    logger.error('Error updating watchlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete watchlist
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.watchlist.delete({
      where: { id: parseInt(id) }
    });

    logger.info(`Deleted watchlist ID: ${id}`);

    res.json({
      success: true,
      message: 'Watchlist deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting watchlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add stock to watchlist
router.post('/:id/stocks', async (req, res) => {
  try {
    const { id } = req.params;
    const { ticker, companyName, sector, notes } = req.body;

    if (!ticker || ticker.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Ticker symbol is required'
      });
    }

    const tickerUpper = ticker.trim().toUpperCase();

    // Check if stock already exists in this watchlist
    const existing = await prisma.watchlistStock.findUnique({
      where: {
        watchlistId_ticker: {
          watchlistId: parseInt(id),
          ticker: tickerUpper
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Stock already exists in this watchlist'
      });
    }

    // Fetch company info if not provided
    let finalCompanyName = companyName;
    let finalSector = sector;
    
    if (!companyName || !sector) {
      try {
        const marketData = await dataFetcher.getStockQuote(tickerUpper);
        finalCompanyName = finalCompanyName || marketData?.companyName || tickerUpper;
        finalSector = finalSector || marketData?.sector || null;
      } catch (error) {
        logger.warn(`Could not fetch company info for ${tickerUpper}:`, error.message);
        finalCompanyName = finalCompanyName || tickerUpper;
      }
    }

    const stock = await prisma.watchlistStock.create({
      data: {
        watchlistId: parseInt(id),
        ticker: tickerUpper,
        companyName: finalCompanyName,
        sector: finalSector,
        notes: notes?.trim() || null
      }
    });

    logger.info(`Added ${tickerUpper} to watchlist ID: ${id}`);

    res.json({
      success: true,
      stock: stock
    });
  } catch (error) {
    logger.error('Error adding stock to watchlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Remove stock from watchlist
router.delete('/:id/stocks/:stockId', async (req, res) => {
  try {
    const { id, stockId } = req.params;

    await prisma.watchlistStock.delete({
      where: {
        id: parseInt(stockId),
        watchlistId: parseInt(id)
      }
    });

    logger.info(`Removed stock ID ${stockId} from watchlist ID: ${id}`);

    res.json({
      success: true,
      message: 'Stock removed from watchlist'
    });
  } catch (error) {
    logger.error('Error removing stock from watchlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk refresh watchlist data (get fresh prices and AI analysis)
router.post('/:id/refresh', async (req, res) => {
  try {
    const { id } = req.params;
    
    const watchlist = await prisma.watchlist.findUnique({
      where: { id: parseInt(id) },
      include: { stocks: true }
    });

    if (!watchlist) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found'
      });
    }

    const refreshedStocks = await Promise.all(
      watchlist.stocks.map(async (stock) => {
        try {
          const marketData = await dataFetcher.getStockQuote(stock.ticker);
          return {
            ticker: stock.ticker,
            price: marketData?.price || null,
            change: marketData?.change || null,
            changePct: marketData?.changePercent || null
          };
        } catch (error) {
          return {
            ticker: stock.ticker,
            error: error.message
          };
        }
      })
    );

    res.json({
      success: true,
      refreshedStocks: refreshedStocks
    });
  } catch (error) {
    logger.error('Error refreshing watchlist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
