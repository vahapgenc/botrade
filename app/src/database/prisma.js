const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
});

// Test connection
async function testConnection() {
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Graceful shutdown
async function disconnect() {
    await prisma.$disconnect();
    console.log('Database disconnected');
}

// Handle cleanup
process.on('beforeExit', async () => {
    await disconnect();
});

module.exports = { prisma, testConnection, disconnect };
