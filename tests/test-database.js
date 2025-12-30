const { prisma, testConnection } = require('../src/database/prisma');

async function runTests() {
    console.log('🧪 Testing Database Connection...\n');
    
    // Test 1: Connection
    console.log('Test 1: Database Connection');
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Connection test failed');
        process.exit(1);
    }
    console.log('✅ Connection test passed\n');
    
    // Test 2: Create Portfolio Entry
    console.log('Test 2: Create Portfolio Entry');
    try {
        const position = await prisma.portfolio.create({
            data: {
                ticker: 'TEST',
                companyName: 'Test Company',
                sector: 'Technology',
                quantity: 10,
                entryPrice: 100.50,
                entryDate: new Date(),
                status: 'OPEN'
            }
        });
        console.log('✅ Created position:', position.id);
    } catch (error) {
        console.error('❌ Create test failed:', error.message);
        process.exit(1);
    }
    
    // Test 3: Read Portfolio Entry
    console.log('\nTest 3: Read Portfolio Entry');
    try {
        const positions = await prisma.portfolio.findMany({
            where: { ticker: 'TEST' }
        });
        console.log('✅ Found', positions.length, 'TEST position(s)');
    } catch (error) {
        console.error('❌ Read test failed:', error.message);
        process.exit(1);
    }
    
    // Test 4: Update Portfolio Entry
    console.log('\nTest 4: Update Portfolio Entry');
    try {
        const updated = await prisma.portfolio.updateMany({
            where: { ticker: 'TEST' },
            data: { currentPrice: 105.25 }
        });
        console.log('✅ Updated', updated.count, 'record(s)');
    } catch (error) {
        console.error('❌ Update test failed:', error.message);
        process.exit(1);
    }
    
    // Test 5: Delete Test Data
    console.log('\nTest 5: Clean Up Test Data');
    try {
        const deleted = await prisma.portfolio.deleteMany({
            where: { ticker: 'TEST' }
        });
        console.log('✅ Deleted', deleted.count, 'test record(s)');
    } catch (error) {
        console.error('❌ Delete test failed:', error.message);
        process.exit(1);
    }
    
    // Test 6: Verify All Tables Exist
    console.log('\nTest 6: Verify All Tables');
    try {
        await prisma.portfolio.count();
        await prisma.tradeHistory.count();
        await prisma.aIDecision.count();
        await prisma.taxTransaction.count();
        await prisma.analysisCache.count();
        await prisma.performanceMetrics.count();
        console.log('✅ All tables accessible');
    } catch (error) {
        console.error('❌ Table verification failed:', error.message);
        process.exit(1);
    }
    
    console.log('\n🎉 All database tests passed!');
    console.log('📝 You can now proceed to STEP 3');
    
    await prisma.$disconnect();
    process.exit(0);
}

runTests();
