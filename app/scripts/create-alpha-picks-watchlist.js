const { PrismaClient } = require('@prisma/client');

// Ensure DATABASE_URL is set - default for development
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://admin:admin123@localhost:5432/botrade';
  console.log('Set default DATABASE_URL for local development');
}

const prisma = new PrismaClient();

const alphaPicks = [
  { ticker: 'NEM', companyName: 'Newmont Corporation', sector: 'Materials', rating: 'STRONG BUY' },
  { ticker: 'B', companyName: 'Barrick Mining Corporation', sector: 'Materials', rating: 'STRONG BUY' },
  { ticker: 'TIGO', companyName: 'Millicom International Cellular S.A.', sector: 'Communication Services', rating: 'STRONG BUY' },
  { ticker: 'W', companyName: 'Wayfair Inc.', sector: 'Consumer Discretionary', rating: 'STRONG BUY' },
  { ticker: 'PARR', companyName: 'Par Pacific Holdings, Inc.', sector: 'Energy', rating: 'STRONG BUY' },
  { ticker: 'INCY', companyName: 'Incyte Corporation', sector: 'Health Care', rating: 'STRONG BUY' },
  { ticker: 'MU', companyName: 'Micron Technology, Inc.', sector: 'Information Technology', rating: 'STRONG BUY' },
  { ticker: 'TTMI', companyName: 'TTM Technologies, Inc.', sector: 'Information Technology', rating: 'STRONG BUY' },
  { ticker: 'CDE', companyName: 'Coeur Mining, Inc.', sector: 'Materials', rating: 'STRONG BUY' }
];

async function createAlphaPicksWatchlist() {
  try {
    console.log('Creating Alpha Picks watchlist...');
    
    // Create the watchlist
    const watchlist = await prisma.watchlist.create({
      data: {
        name: 'Alpha Picks',
        description: 'Top rated stocks with strong buy ratings across various sectors'
      }
    });

    console.log(`✓ Created watchlist: ${watchlist.name} (ID: ${watchlist.id})`);

    // Add stocks to the watchlist
    console.log('\nAdding stocks to watchlist:');
    let rank = 1;
    for (const stock of alphaPicks) {
      const added = await prisma.watchlistStock.create({
        data: {
          watchlistId: watchlist.id,
          ticker: stock.ticker,
          companyName: stock.companyName,
          sector: stock.sector,
          notes: 'Alpha Pick',
          rating: stock.rating,
          rank: rank++
        }
      });
      console.log(`  ✓ Added ${stock.ticker} - ${stock.companyName} (Rank: ${added.rank}, Rating: ${added.rating})`);
    }

    console.log(`\n🎉 Successfully created "Alpha Picks" watchlist with ${alphaPicks.length} stocks!`);
    console.log('\nYou can view it at: http://localhost:3000/watchlist.html');

  } catch (error) {
    console.error('Error creating watchlist:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAlphaPicksWatchlist();
