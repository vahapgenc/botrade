const cron = require('node-cron');
// Lazy load autoTrader to avoid circular dependency/startup hang
// const autoTrader = require('./services/trading/autoTrader');
const logger = require('./utils/logger');
let autoTrader = null;

class TradingBot {
    constructor() {
        this.scheduledTasks = [];
        this.lastRun = null;
        this.isCycleRunning = false;
        this.cronExpression = '*/15 9-16 * * 1-5'; // Made public for reference
        this.nextRun = null; // We'll try to calculate this
    }

    /**
     * Start the automated trading bot
     */
    start() {
        if (this.scheduledTasks.length > 0) {
            logger.warn('Bot scheduler is already running.');
            return;
        }

        logger.info('🤖 Starting Trading Bot Scheduler...');

        // Initialize dependencies if needed
        if (!autoTrader) {
             try {
                 autoTrader = require('./services/trading/autoTrader');
             } catch (e) {
                 logger.error('Failed to load autoTrader:', e);
                 return;
             }
        }

        // Schedule Trading Cycle
        const tradeTask = cron.schedule(this.cronExpression, async () => {
            await this.executeCycle();
        });

        this.scheduledTasks.push(tradeTask);
        this.calculateNextRun();
        logger.info('✅ Trading Bot Scheduler Active: Running every 15 mins during market hours.');
    }

    /**
     * Execute a single trading cycle (wrapper for status tracking)
     * @param {boolean} force - If true, ignores market hours check
     */
    async executeCycle(force = false) {
        logger.info('⏰ Triggering Scheduled Trading Cycle...');
        this.isCycleRunning = true;
        this.lastRun = new Date();

        // Ensure loaded
        if (!autoTrader) {
            try {
                autoTrader = require('./services/trading/autoTrader');
            } catch (e) {
                logger.error('Failed to load autoTrader during cycle:', e);
                this.isCycleRunning = false;
                return;
            }
        }
        
        try {
            const isOpen = await this.isMarketOpen();
            if (force || isOpen) {
                if (force && !isOpen) {
                    logger.warn('⚠️ Force running cycle despite Market Closed.');
                }
                await autoTrader.runCycle();
            } else {
                logger.info('Market is closed. Skipping cycle.');
            }
        } catch (error) {
            logger.error('Error in trading cycle:', error);
        } finally {
            this.isCycleRunning = false;
            this.calculateNextRun();
        }
    }
    
    /**
     * Stop all scheduled tasks
     */
    stop() {
        logger.info('🛑 Stopping Trading Bot Scheduler...');
        this.scheduledTasks.forEach(task => task.stop());
        this.scheduledTasks = [];
        this.nextRun = null;
    }
    
    /**
     * Get current status of the bot
     */
    getStatus() {
        // ... same code ...
        return {
            enabled: this.scheduledTasks.length > 0,
            running: this.isCycleRunning || (autoTrader && autoTrader.isRunning),
            lastRun: this.lastRun,
            nextRun: this.nextRun,
            marketOpen: this.checkMarketOpenSimple(), // Non-async version for status check
            config: {
                cron: this.cronExpression,
                timezone: 'EST (Assumed)'
            }
        };
    }

    calculateNextRun() {
         // cron doesn't easily give next run, but we can approximate or use a library
         // For now, simpler to leave null or "Scheduled"
         // Actually, if we use a cron parser we could know, but let's keep it simple.
         if (this.scheduledTasks.length > 0) {
             this.nextRun = "Scheduled (follows cron)"; 
         } else {
             this.nextRun = "Stopped";
         }
    }

    checkMarketOpenSimple() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const day = now.getDay();
        
        if (day === 0 || day === 6) return false; // Weekend
        if (hours === 9 && minutes < 30) return false;
        if (hours >= 16) return false;
        return true;
    }

    /**
     * Check if market is open (Simple check, can be enhanced)
     */
    async isMarketOpen() {
        // TODO: Implement real market hours check via TWS or Date object
        // For now, assume open if cron triggered (cron handles time)
        // But cron "9-16" covers 9:00 to 16:59. Market opens 9:30.
        // We can add logic here.
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // Simple EST check (assuming server is in EST or UTC correction needed)
        // If server is UTC, we need shift. Assuming server matches market time for now.
        
        if (hours === 9 && minutes < 30) return false;
        if (hours >= 16) return false;
        
        return true;
    }
}

module.exports = new TradingBot();
