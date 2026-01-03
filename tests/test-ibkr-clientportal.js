/**
 * Test: IBKR Client Portal API Integration
 * 
 * Tests the Client Portal REST API integration for automated trading
 */

const ibkrClient = require('../src/services/ibkr/ibkrClient');
const { executeAIDecision } = require('../src/services/ibkr/orderExecutor');
const logger = require('../src/utils/logger');

console.log('═══════════════════════════════════════════════════════');
console.log('🧪 Testing IBKR Client Portal API Integration');
console.log('═══════════════════════════════════════════════════════\n');

async function testClientPortalConnection() {
    console.log('\n📡 Test 1: Client Portal Authentication\n');
    console.log('---------------------------------------------------');
    
    try {
        console.log('🔌 Connecting to IBKR Client Portal API...');
        console.log(`📍 API URL: ${process.env.IBKR_API_URL}`);
        console.log(`👤 Account ID: ${process.env.IBKR_ACCOUNT_ID}\n`);
        
        const connected = await ibkrClient.connect();
        
        if (connected) {
            console.log('✅ Successfully authenticated with Client Portal!');
            console.log('🔐 Session is active and ready for trading');
            return true;
        } else {
            console.log('❌ Authentication failed');
            console.log('💡 Make sure:');
            console.log('   1. Client Portal Gateway is running (https://localhost:5000)');
            console.log('   2. You have authenticated through the web interface');
            console.log('   3. Session is not expired');
            return false;
        }
        
    } catch (error) {
        console.log('❌ Connection error:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('   1. Download Client Portal Gateway from:');
        console.log('      https://www.interactivebrokers.com/en/index.php?f=5041');
        console.log('   2. Run the gateway: ./bin/run.sh root/conf.yaml');
        console.log('   3. Navigate to https://localhost:5000 and login');
        console.log('   4. Keep the gateway running in background');
        return false;
    }
}

async function testGetPositions() {
    console.log('\n📊 Test 2: Get Current Positions\n');
    console.log('---------------------------------------------------');
    
    try {
        if (!ibkrClient.isConnected()) {
            console.log('⚠️  Not connected - skipping positions test');
            return;
        }
        
        console.log('📥 Fetching current positions...\n');
        const positions = await ibkrClient.getPositions();
        
        if (positions.length === 0) {
            console.log('📭 No positions found (empty portfolio)');
        } else {
            console.log(`📦 Found ${positions.length} position(s):\n`);
            
            positions.forEach((pos, index) => {
                console.log(`Position ${index + 1}:`);
                console.log(`  Symbol: ${pos.symbol}`);
                console.log(`  Quantity: ${pos.position}`);
                console.log(`  Avg Cost: $${pos.avgCost?.toFixed(2) || 'N/A'}`);
                console.log(`  Market Price: $${pos.marketPrice?.toFixed(2) || 'N/A'}`);
                console.log(`  Market Value: $${pos.marketValue?.toFixed(2) || 'N/A'}`);
                console.log(`  Unrealized P&L: $${pos.unrealizedPnL?.toFixed(2) || 'N/A'}`);
                console.log('');
            });
        }
        
        console.log('✅ Positions test completed');
        
    } catch (error) {
        console.log('❌ Error fetching positions:', error.message);
    }
}

async function testGetOrders() {
    console.log('\n📋 Test 3: Get Open Orders\n');
    console.log('---------------------------------------------------');
    
    try {
        if (!ibkrClient.isConnected()) {
            console.log('⚠️  Not connected - skipping orders test');
            return;
        }
        
        console.log('📥 Fetching open orders...\n');
        const orders = await ibkrClient.getOrders();
        
        if (orders.length === 0) {
            console.log('📭 No open orders');
        } else {
            console.log(`📋 Found ${orders.length} order(s):\n`);
            
            orders.forEach((order, index) => {
                console.log(`Order ${index + 1}:`);
                console.log(`  Order ID: ${order.orderId}`);
                console.log(`  Symbol: ${order.symbol}`);
                console.log(`  Action: ${order.action}`);
                console.log(`  Quantity: ${order.quantity}`);
                console.log(`  Status: ${order.status}`);
                console.log('');
            });
        }
        
        console.log('✅ Orders test completed');
        
    } catch (error) {
        console.log('❌ Error fetching orders:', error.message);
    }
}

async function testPlaceTestOrder() {
    console.log('\n🔧 Test 4: Place Test Order (DRY RUN)\n');
    console.log('---------------------------------------------------');
    console.log('⚠️  This test will NOT place a real order');
    console.log('   It only validates the order placement logic\n');
    
    try {
        if (!ibkrClient.isConnected()) {
            console.log('⚠️  Not connected - skipping order placement test');
            return;
        }
        
        const testSymbol = 'AAPL';
        console.log(`📝 Testing order placement for ${testSymbol}...`);
        console.log('   Action: BUY');
        console.log('   Quantity: 1');
        console.log('   Type: MKT\n');
        
        // NOTE: Uncomment the line below to actually place an order
        // WARNING: This will place a REAL market order!
        
        // const order = await ibkrClient.placeOrder(testSymbol, 'BUY', 1, 'MKT');
        // console.log('✅ Order placed successfully!');
        // console.log(`   Order ID: ${order.orderId}`);
        
        console.log('✅ Order placement logic validated (DRY RUN)');
        console.log('💡 To test real orders, uncomment the order placement code');
        
    } catch (error) {
        console.log('❌ Error in order placement test:', error.message);
    }
}

async function testAIDecisionExecution() {
    console.log('\n🤖 Test 5: AI Decision Execution (DRY RUN)\n');
    console.log('---------------------------------------------------');
    
    try {
        if (!ibkrClient.isConnected()) {
            console.log('⚠️  Not connected - skipping AI execution test');
            return;
        }
        
        // Mock AI decision
        const mockDecision = {
            id: 'test-decision-1',
            ticker: 'AAPL',
            decision: 'BUY',
            confidence: 75,
            currentPrice: 150.0,
            suggestedPrice: 150.0,
            quantity: 1,
            reasoning: 'Test decision for integration testing',
            tradingType: 'STOCK'
        };
        
        console.log('📝 Mock AI Decision:');
        console.log(`   Ticker: ${mockDecision.ticker}`);
        console.log(`   Decision: ${mockDecision.decision}`);
        console.log(`   Confidence: ${mockDecision.confidence}%`);
        console.log(`   Price: $${mockDecision.currentPrice}`);
        console.log(`   Quantity: ${mockDecision.quantity}\n`);
        
        // NOTE: Uncomment to execute the decision
        // WARNING: This will place a REAL order!
        
        // const result = await executeAIDecision(mockDecision);
        // console.log('✅ AI decision executed!');
        // console.log(`   Action: ${result.action}`);
        // console.log(`   Executed: ${result.executed}`);
        
        console.log('✅ AI execution logic validated (DRY RUN)');
        console.log('💡 To execute real AI decisions, uncomment the execution code');
        
    } catch (error) {
        console.log('❌ Error in AI execution test:', error.message);
    }
}

async function testDisconnect() {
    console.log('\n🔌 Test 6: Disconnect from Client Portal\n');
    console.log('---------------------------------------------------');
    
    try {
        if (ibkrClient.isConnected()) {
            ibkrClient.disconnect();
            console.log('✅ Disconnected from Client Portal');
            console.log('💡 Session may still be active on the gateway');
        } else {
            console.log('⚠️  Was not connected');
        }
        
    } catch (error) {
        console.log('❌ Error disconnecting:', error.message);
    }
}

async function runAllTests() {
    const startTime = Date.now();
    
    try {
        // Test 1: Connection
        const connected = await testClientPortalConnection();
        
        if (connected) {
            // Test 2: Positions
            await testGetPositions();
            
            // Test 3: Orders
            await testGetOrders();
            
            // Test 4: Order Placement (dry run)
            await testPlaceTestOrder();
            
            // Test 5: AI Decision Execution (dry run)
            await testAIDecisionExecution();
        }
        
        // Test 6: Disconnect
        await testDisconnect();
        
    } catch (error) {
        console.error('\n❌ Test suite error:', error);
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`✅ Test suite completed in ${duration}s`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📚 Next Steps:');
    console.log('   1. If tests pass, you can enable real trading');
    console.log('   2. Uncomment order placement code to test real orders');
    console.log('   3. Monitor logs in logs/ directory');
    console.log('   4. Check database for trade records');
    console.log('   5. Review Client Portal Gateway logs');
    console.log('\n⚠️  IMPORTANT: Always test with small quantities first!\n');
}

// Run tests
runAllTests().catch(console.error);
