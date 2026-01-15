const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const stocks = [
  { ticker: 'CSU', companyName: 'Capital Senior Living Corporation', sector: 'Healthcare' },
  { ticker: 'TEAM', companyName: 'Atlassian Corporation', sector: 'Technology' },
  { ticker: 'DOCU', companyName: 'DocuSign Inc', sector: 'Technology' },
  { ticker: 'WDAY', companyName: 'Workday Inc', sector: 'Technology' },
  { ticker: 'NOW', companyName: 'ServiceNow Inc', sector: 'Technology' },
  { ticker: 'DDOG', companyName: 'Datadog Inc', sector: 'Technology' },
  { ticker: 'NFLX', companyName: 'Netflix Inc', sector: 'Communication Services' },
  { ticker: 'ADBE', companyName: 'Adobe Inc', sector: 'Technology' },
  { ticker: 'SNOW', companyName: 'Snowflake Inc', sector: 'Technology' },
  { ticker: 'CRM', companyName: 'Salesforce Inc', sector: 'Technology' }
];

async function createFallingAngelsWatchlist() {
  try {
    console.log('Creating Falling Angels watchlist...');
    
    // Create the watchlist
    const watchlist = await prisma.watchlist.create({
      data: {
        name: 'Falling Angels',
        description: 'Stocks experiencing significant daily losses - potential buy opportunities or warning signs'
      }
    });

    console.log(`✓ Created watchlist: ${watchlist.name} (ID: ${watchlist.id})`);

    // Add stocks to the watchlist
    console.log('\nAdding stocks to watchlist:');
    for (const stock of stocks) {
      const added = await prisma.watchlistStock.create({
        data: {
          watchlistId: watchlist.id,
          ticker: stock.ticker,
          companyName: stock.companyName,
          sector: stock.sector,
          notes: 'Added from daily losers'
        }
      });
      console.log(`  ✓ Added ${stock.ticker} - ${stock.companyName}`);
    }

    console.log(`\n🎉 Successfully created "Falling Angels" watchlist with ${stocks.length} stocks!`);
    console.log('\nYou can view it at: http://localhost:3000/watchlist.html');

  } catch (error) {
    console.error('Error creating watchlist:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createFallingAngelsWatchlist();
