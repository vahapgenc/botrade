// Test TWS Integration
const orderService = require('../src/services/ibkr/orderService');
const twsClient = require('../src/services/ibkr/twsClient');
const logger = require('../src/utils/logger');

async function testTWSIntegration() {
    console.log('🧪 Testing TWS Integration...\n');

    try {
        // Test 1: Connection Status
        console.log('1️⃣  Testing connection...');
        const status = await orderService.checkTradingStatus();
        console.log('   ✅ Connection Status:', status);
        console.log('');

        if (!status.connected) {
            console.log('   ❌ Not connected to TWS Gateway');
            console.log('   💡 Make sure TWS Gateway is running: docker-compose ps');
            console.log('   💡 Check logs: docker-compose logs tws-gateway');
            process.exit(1);
        }

        // Test 2: Account Summary
        console.log('2️⃣  Getting account summary...');
        const account = await orderService.getAccountSummary();
        console.log('   ✅ Account Summary:', account);
        console.log('');

        // Test 3: Current Positions
        console.log('3️⃣  Getting current positions...');
        const positions = await orderService.getPositions();
        console.log(`   ✅ Found ${positions.length} position(s)`);
        if (positions.length > 0) {
            positions.forEach(pos => {
                console.log(`      ${pos.symbol}: ${pos.position} shares @ $${pos.averageCost}`);
            });
        }
        console.log('');

        // Test 4: Open Orders
        console.log('4️⃣  Getting open orders...');
        const orders = await orderService.getOpenOrders();
        console.log(`   ✅ Found ${orders.length} open order(s)`);
        if (orders.length > 0) {
            orders.forEach(order => {
                console.log(`      Order ${order.orderId}: ${order.status}`);
            });
        }
        console.log('');

        // Test 5: Test Order (Paper Trading Only!)
        console.log('5️⃣  Testing order placement (DRY RUN - not actually placing)...');
        console.log('   To place a real test order, use:');
        console.log('   curl -X POST http://localhost:3000/api/trading/execute \\');
        console.log('     -H "Content-Type: application/json" \\');
        console.log('     -d \'{"symbol":"AAPL","action":"BUY","quantity":1,"confidence":85}\'');
        console.log('');

        // Test 6: Event Listeners
        console.log('6️⃣  Setting up event listeners...');
        
        twsClient.on('orderStatus', (order) => {
            console.log('   📊 Order Status Update:', order);
        });

        twsClient.on('execution', (exec) => {
            console.log('   ✅ Order Executed:', exec);
        });

        twsClient.on('error', (err) => {
            console.log('   ❌ TWS Error:', err);
        });

        console.log('   ✅ Event listeners registered');
        console.log('');

        // Summary
        console.log('═══════════════════════════════════════════');
        console.log('✅ TWS Integration Test Complete!');
        console.log('═══════════════════════════════════════════');
        console.log('');
        console.log('📊 Summary:');
        console.log(`   Connected: ${status.connected ? '✅' : '❌'}`);
        console.log(`   Account: ${process.env.TWS_ACCOUNT_ID}`);
        console.log(`   Positions: ${positions.length}`);
        console.log(`   Open Orders: ${orders.length}`);
        console.log('');
        console.log('🎯 Next Steps:');
        console.log('   1. Place a test order via API');
        console.log('   2. Check VNC: http://localhost:6080');
        console.log('   3. Monitor order status');
        console.log('   4. Verify position updates');
        console.log('');
        console.log('📡 API Endpoints:');
        console.log('   GET  http://localhost:3000/api/trading/status');
        console.log('   GET  http://localhost:3000/api/trading/positions');
        console.log('   GET  http://localhost:3000/api/trading/account');
        console.log('   POST http://localhost:3000/api/trading/execute');
        console.log('');

        // Keep connection alive for a moment to receive any events
        console.log('Listening for events for 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        process.exit(0);

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.log('');
        console.log('💡 Troubleshooting:');
        console.log('   1. Check if TWS Gateway is running:');
        console.log('      docker-compose ps');
        console.log('   2. Check TWS Gateway logs:');
        console.log('      docker-compose logs tws-gateway');
        console.log('   3. Verify credentials in .env file');
        console.log('   4. Check VNC interface:');
        console.log('      http://localhost:6080');
        process.exit(1);
    }
}

// Run tests
testTWSIntegration();
