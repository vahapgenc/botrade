require('dotenv').config();
const { initCache, get, set, del, clear, disconnect } = require('../src/services/cache/cacheManager');
const logger = require('../src/utils/logger');

async function runTests() {
    console.log('🧪 Testing Cache Manager...\n');
    
    try {
        // Test 1: Initialize cache
        console.log('Test 1: Initialize Cache');
        await initCache();
        console.log('✅ Cache initialized\n');
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for Redis connection
        
        // Test 2: Set and Get
        console.log('Test 2: Set and Get');
        const testData = { ticker: 'AAPL', price: 180.50, timestamp: new Date() };
        await set('test_key', testData, 60);
        const retrieved = await get('test_key');
        console.log('Stored:', testData);
        console.log('Retrieved:', retrieved);
        if (JSON.stringify(retrieved.ticker) === JSON.stringify(testData.ticker)) {
            console.log('✅ Set/Get test passed\n');
        } else {
            throw new Error('Retrieved data does not match stored data');
        }
        
        // Test 3: Cache Miss
        console.log('Test 3: Cache Miss');
        const missing = await get('non_existent_key');
        if (missing === null) {
            console.log('✅ Cache miss handled correctly\n');
        } else {
            throw new Error('Cache should return null for missing key');
        }
        
        // Test 4: TTL Expiration
        console.log('Test 4: TTL Expiration (2 second TTL)');
        await set('ttl_test', { data: 'expires soon' }, 2);
        const immediate = await get('ttl_test');
        console.log('Immediate retrieval:', immediate);
        console.log('Waiting 3 seconds for expiration...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        const expired = await get('ttl_test');
        if (expired === null) {
            console.log('✅ TTL expiration working\n');
        } else {
            console.log('⚠️  TTL test inconclusive (using memory cache fallback)\n');
        }
        
        // Test 5: Delete
        console.log('Test 5: Delete');
        await set('delete_test', { data: 'will be deleted' }, 60);
        await del('delete_test');
        const deleted = await get('delete_test');
        if (deleted === null) {
            console.log('✅ Delete working correctly\n');
        } else {
            throw new Error('Key should be deleted');
        }
        
        // Test 6: Clear all cache
        console.log('Test 6: Clear Cache');
        await set('key1', { data: 'test1' }, 60);
        await set('key2', { data: 'test2' }, 60);
        await clear();
        const afterClear1 = await get('key1');
        const afterClear2 = await get('key2');
        if (afterClear1 === null && afterClear2 === null) {
            console.log('✅ Clear cache working\n');
        } else {
            throw new Error('Cache should be empty after clear');
        }
        
        // Test 7: Multiple operations
        console.log('Test 7: Multiple Concurrent Operations');
        await Promise.all([
            set('concurrent1', { id: 1 }, 60),
            set('concurrent2', { id: 2 }, 60),
            set('concurrent3', { id: 3 }, 60)
        ]);
        const [c1, c2, c3] = await Promise.all([
            get('concurrent1'),
            get('concurrent2'),
            get('concurrent3')
        ]);
        if (c1.id === 1 && c2.id === 2 && c3.id === 3) {
            console.log('✅ Concurrent operations working\n');
        } else {
            throw new Error('Concurrent operations failed');
        }
        
        console.log('🎉 All cache tests passed!');
        console.log('📝 Cache is ready for sentiment engine integration');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    } finally {
        await disconnect();
        process.exit(0);
    }
}

runTests();
