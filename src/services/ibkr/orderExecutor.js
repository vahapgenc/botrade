const ibkrClient = require('./ibkrClient');
const logger = require('../../utils/logger');
const { prisma } = require('../../database/prisma');

const MAX_POSITION_SIZE = parseFloat(process.env.MAX_POSITION_SIZE) || 10000;
const MAX_PORTFOLIO_RISK = parseFloat(process.env.MAX_PORTFOLIO_RISK) || 0.02;
const MIN_CONFIDENCE = parseInt(process.env.MIN_CONFIDENCE) || 70;

async function executeAIDecision(aiDecision) {
    try {
        logger.info(`Executing AI decision for ${aiDecision.ticker}: ${aiDecision.decision}`);
        
        // Check confidence threshold
        if (aiDecision.confidence < MIN_CONFIDENCE) {
            logger.warn(`Confidence ${aiDecision.confidence}% below threshold ${MIN_CONFIDENCE}% - skipping execution`);
            return {
                action: aiDecision.decision,
                executed: false,
                reason: `Confidence below threshold (${aiDecision.confidence}% < ${MIN_CONFIDENCE}%)`
            };
        }
        
        // Connect to IBKR if not already connected
        if (!ibkrClient.isConnected()) {
            await ibkrClient.connect();
        }
        
        // Handle different trading types
        if (aiDecision.tradingType === 'OPTIONS' && aiDecision.optionsStrategy) {
            return await executeOptionsStrategy(aiDecision);
        } else {
            return await executeStockTrade(aiDecision);
        }
        
    } catch (error) {
        logger.error('Order execution error:', error);
        throw error;
    }
}

async function executeStockTrade(aiDecision) {
    try {
        // Get current position
        const currentPosition = ibkrClient.getPosition(aiDecision.ticker);
        const currentShares = currentPosition ? currentPosition.position : 0;
        
        logger.info(`Current position in ${aiDecision.ticker}: ${currentShares} shares`);
        
        // Calculate position size
        const positionSize = calculatePositionSize(aiDecision);
        
        // Determine action
        let action, quantity;
        
        if (aiDecision.decision === 'BUY') {
            if (currentShares >= 0) {
                // Buy new or add to position
                action = 'BUY';
                quantity = positionSize;
            } else {
                // Cover short first
                action = 'BUY';
                quantity = Math.abs(currentShares) + positionSize;
            }
        } else if (aiDecision.decision === 'SELL') {
            if (currentShares > 0) {
                // Sell existing position
                action = 'SELL';
                quantity = currentShares;
            } else if (currentShares < 0) {
                // Already short - do nothing
                logger.info(`Already short ${Math.abs(currentShares)} shares - no action`);
                return {
                    action: 'HOLD',
                    executed: false,
                    reason: 'Already short position'
                };
            } else {
                // No position - short sell
                action = 'SELL';
                quantity = positionSize;
            }
        } else {
            // HOLD - do nothing
            logger.info(`Decision is HOLD for ${aiDecision.ticker} - no action taken`);
            return {
                action: 'HOLD',
                executed: false,
                reason: 'AI recommended HOLD'
            };
        }
        
        // Validate position size
        if (quantity <= 0) {
            logger.warn(`Invalid quantity ${quantity} - no action taken`);
            return {
                action: aiDecision.decision,
                executed: false,
                reason: 'Invalid quantity calculated'
            };
        }
        
        logger.info(`Executing: ${action} ${quantity} shares of ${aiDecision.ticker}`);
        
        // Place order
        const order = await ibkrClient.placeOrder(
            aiDecision.ticker,
            action,
            quantity,
            'MKT' // Market order for simplicity
        );
        
        // Record trade in database
        await recordTrade(aiDecision, order, currentShares);
        
        // Create tax transaction if selling
        if (action === 'SELL' && currentShares > 0) {
            await createTaxTransaction(aiDecision, order, currentPosition);
        }
        
        logger.info(`✅ Trade executed: ${action} ${quantity} shares of ${aiDecision.ticker}`);
        
        return {
            action,
            quantity,
            order,
            executed: true,
            previousPosition: currentShares,
            newPosition: currentShares + (action === 'BUY' ? quantity : -quantity)
        };
        
    } catch (error) {
        logger.error('Stock trade execution error:', error);
        throw error;
    }
}

async function executeOptionsStrategy(aiDecision) {
    try {
        logger.info(`Executing options strategy: ${aiDecision.optionsStrategy}`);
        
        if (!aiDecision.optionsLegs || aiDecision.optionsLegs.length === 0) {
            throw new Error('No options legs defined in AI decision');
        }
        
        const orders = [];
        
        // Execute each leg of the strategy
        for (const leg of aiDecision.optionsLegs) {
            const expiry = leg.expiry.replace(/-/g, ''); // Convert YYYY-MM-DD to YYYYMMDD
            const right = leg.type === 'CALL' ? 'C' : 'P';
            
            const order = await ibkrClient.placeOptionsOrder(
                aiDecision.ticker,
                right,
                leg.strike,
                expiry,
                leg.action,
                leg.contracts || 1,
                'LMT', // Use limit orders for options
                leg.premium
            );
            
            orders.push(order);
            
            // Small delay between legs
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Record options trade
        await recordOptionsTrade(aiDecision, orders);
        
        logger.info(`✅ Options strategy executed: ${orders.length} legs`);
        
        return {
            action: aiDecision.decision,
            strategy: aiDecision.optionsStrategy,
            orders,
            executed: true,
            legs: orders.length
        };
        
    } catch (error) {
        logger.error('Options trade execution error:', error);
        throw error;
    }
}

function calculatePositionSize(aiDecision) {
    const currentPrice = aiDecision.currentPrice || aiDecision.suggestedPrice;
    const confidence = aiDecision.confidence / 100;
    
    // Base position size on confidence and max position size
    const baseShares = Math.floor(MAX_POSITION_SIZE / currentPrice);
    const adjustedShares = Math.floor(baseShares * confidence);
    
    // Use suggested quantity if provided and reasonable
    if (aiDecision.quantity && aiDecision.quantity > 0 && aiDecision.quantity <= baseShares * 2) {
        logger.info(`Using AI-suggested quantity: ${aiDecision.quantity}`);
        return aiDecision.quantity;
    }
    
    // Minimum 1 share
    const finalShares = Math.max(1, adjustedShares);
    logger.info(`Calculated position size: ${finalShares} shares (base: ${baseShares}, confidence: ${(confidence * 100).toFixed(0)}%)`);
    
    return finalShares;
}

async function recordTrade(aiDecision, order, previousPosition) {
    try {
        await prisma.tradeHistory.create({
            data: {
                ticker: aiDecision.ticker,
                action: order.action,
                quantity: order.quantity,
                price: aiDecision.currentPrice || aiDecision.suggestedPrice,
                totalValue: order.quantity * (aiDecision.currentPrice || aiDecision.suggestedPrice),
                orderType: order.orderType,
                orderId: order.orderId.toString(),
                aiDecisionId: aiDecision.id,
                previousPosition,
                confidence: aiDecision.confidence,
                reasoning: aiDecision.reasoning
            }
        });
        
        logger.info('Trade recorded in database');
        
    } catch (error) {
        logger.error('Error recording trade:', error);
        // Don't throw - trade was placed, just recording failed
    }
}

async function recordOptionsTrade(aiDecision, orders) {
    try {
        // Record the overall strategy
        await prisma.tradeHistory.create({
            data: {
                ticker: aiDecision.ticker,
                action: aiDecision.decision,
                quantity: orders[0].quantity, // Primary leg quantity
                price: aiDecision.currentPrice || 0,
                totalValue: aiDecision.collateralRequired || 0,
                orderType: 'OPTIONS',
                orderId: orders.map(o => o.orderId).join(','),
                aiDecisionId: aiDecision.id,
                previousPosition: 0,
                confidence: aiDecision.confidence,
                reasoning: aiDecision.reasoning,
                metadata: {
                    strategy: aiDecision.optionsStrategy,
                    legs: orders.length,
                    maxProfit: aiDecision.maxProfit,
                    maxLoss: aiDecision.maxLoss
                }
            }
        });
        
        logger.info('Options trade recorded in database');
        
    } catch (error) {
        logger.error('Error recording options trade:', error);
    }
}

async function createTaxTransaction(aiDecision, order, currentPosition) {
    try {
        const avgCost = currentPosition ? currentPosition.avgCost : aiDecision.currentPrice;
        const sellPrice = aiDecision.currentPrice || aiDecision.suggestedPrice;
        
        const proceeds = order.quantity * sellPrice;
        const costBasis = order.quantity * avgCost;
        const gainLoss = proceeds - costBasis;
        
        await prisma.taxTransaction.create({
            data: {
                ticker: aiDecision.ticker,
                transactionType: 'SELL',
                quantity: order.quantity,
                costBasis: costBasis,
                proceeds: proceeds,
                gainLoss: gainLoss,
                transactionDate: new Date()
            }
        });
        
        logger.info(`Tax transaction recorded: ${gainLoss > 0 ? 'Gain' : 'Loss'} of $${Math.abs(gainLoss).toFixed(2)}`);
        
    } catch (error) {
        logger.error('Error creating tax transaction:', error);
    }
}

module.exports = {
    executeAIDecision,
    calculatePositionSize
};
