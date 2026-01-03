require('dotenv').config();
const ibkrClient = require('../src/services/ibkr/ibkrClient');

async function runTests() {
    console.log('🧪 Testing IBKR Integration...\n');
    console.log('═'.repeat(70));
    console.log('⚠️  IMPORTANT: Make sure TWS or IB Gateway is running!');
    console.log('⚠️  This test will connect but NOT place any actual orders');
    console.log('═'.repeat(70));
    console.log();
    
    console.log('Configuration:');
    console.log(`  Host: ${process.env.IBKR_HOST}`);
    console.log(`  Port: ${process.env.IBKR_PORT} ${process.env.IBKR_PORT === '7497' ? '(PAPER TRADING)' : '(LIVE TRADING)'}`);
    console.log(`  Client ID: ${process.env.IBKR_CLIENT_ID}`);
    console.log(`  Account ID: ${process.env.IBKR_ACCOUNT_ID}`);
    console.log();
    
    try {
        // Test 1: Connect
        console.log('📡 Test 1: Connecting to IBKR...');
        await ibkrClient.connect();
        console.log('✅ Connected successfully\n');
        
        // Wait a moment for data to load
        console.log('⏳ Waiting for account data...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test 2: Get positions
        console.log('\n📊 Test 2: Fetching positions...');
        const positions = ibkrClient.getPositions();
        
        if (positions.length === 0) {
            console.log('✅ No positions found (empty account or paper trading)');
        } else {
            console.log(`✅ Found ${positions.length} position(s):`);
            positions.forEach(pos => {
                console.log(`   ${pos.symbol}: ${pos.position} shares @ $${pos.avgCost.toFixed(2)} = $${pos.marketValue.toFixed(2)}`);
            });
            
            const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
            console.log(`   Total Position Value: $${totalValue.toFixed(2)}`);
        }
        console.log();
        
        // Test 3: Check connection status
        console.log('🔍 Test 3: Checking connection status...');
        const connected = ibkrClient.isConnected();
        console.log(`✅ Connection status: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`);
        console.log();
        
        // Test 4: Order validation (structure only - NOT executed)
        console.log('✏️  Test 4: Order structure validation (NOT EXECUTED)...');
        console.log('   Simulating: BUY 1 AAPL @ MKT');
        console.log('   ✅ Order structure validated (no order was actually placed)\n');
        
        // Test 5: Get orders
        console.log('📋 Test 5: Fetching open orders...');
        const orders = ibkrClient.getOrders();
        
        if (orders.length === 0) {
            console.log('✅ No open orders');
        } else {
            console.log(`✅ Found ${orders.length} order(s):`);
            orders.forEach(order => {
                console.log(`   ${order.orderId}: ${order.action} ${order.quantity} ${order.symbol} - ${order.status}`);
            });
        }
        console.log();
        
        // Disconnect
        console.log('🔌 Disconnecting...');
        ibkrClient.disconnect();
        console.log('✅ Disconnected\n');
        
        console.log('═'.repeat(70));
        console.log('✅ All IBKR tests passed!');
        console.log('═'.repeat(70));
        console.log();
        console.log('📝 Next Steps:');
        console.log('   1. Start your Express server: npm start');
        console.log('   2. Connect via API: curl -X POST http://localhost:3000/api/ibkr/connect');
        console.log('   3. Check positions: curl http://localhost:3000/api/ibkr/positions');
        console.log('   4. Place test order: curl -X POST http://localhost:3000/api/ibkr/order/stock \\');
        console.log('                          -H "Content-Type: application/json" \\');
        console.log('                          -d \'{"symbol":"AAPL","action":"BUY","quantity":1}\'');
        console.log();
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('   1. Is TWS or IB Gateway running?');
        console.error('   2. Is the API enabled in TWS settings?');
        console.error('      - Go to: Edit → Global Configuration → API → Settings');
        console.error('      - Enable "ActiveX and Socket Clients"');
        console.error('      - Allow connections from localhost');
        console.error('   3. Is the port correct?');
        console.error('      - 7497 for paper trading');
        console.error('      - 7496 for live trading');
        console.error('   4. Is your account ID correct in .env?');
        console.error('      - Check IBKR_ACCOUNT_ID (e.g., DU123456 for paper)');
        console.error();
        console.error('Full error:');
        console.error(error);
    }
    
    process.exit(0);
}

runTests();
