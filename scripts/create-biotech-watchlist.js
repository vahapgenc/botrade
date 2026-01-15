const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const biotechETFs = [
  { ticker: 'BBP', companyName: 'Virtus LifeSci Biotech Products ETF', sector: 'Healthcare' },
  { ticker: 'BBH', companyName: 'VanEck Biotech ETF', sector: 'Healthcare' },
  { ticker: 'ARKG', companyName: 'ARK Genomic Revolution ETF', sector: 'Healthcare' },
  { ticker: 'IBB', companyName: 'iShares Biotechnology ETF', sector: 'Healthcare' },
  { ticker: 'PBE', companyName: 'Invesco Biotechnology & Genome ETF', sector: 'Healthcare' },
  { ticker: 'BTEC', companyName: 'Principal Healthcare Innovators ETF', sector: 'Healthcare' },
  { ticker: 'FBT', companyName: 'First Trust NYSE Arca Biotechnology Index Fund', sector: 'Healthcare' }
];

async function createBiotechWatchlist() {
  try {
    console.log('Creating Best-Performing Biotech ETFs watchlist...');
    
    // Create the watchlist
    const watchlist = await prisma.watchlist.create({
      data: {
        name: 'Best-Performing Biotech ETFs',
        description: 'Top biotech and genomics ETFs with strong 5-year returns - diversified exposure to healthcare innovation'
      }
    });

    console.log(`✓ Created watchlist: ${watchlist.name} (ID: ${watchlist.id})`);

    // Add ETFs to the watchlist
    console.log('\nAdding ETFs to watchlist:');
    for (const etf of biotechETFs) {
      const added = await prisma.watchlistStock.create({
        data: {
          watchlistId: watchlist.id,
          ticker: etf.ticker,
          companyName: etf.companyName,
          sector: etf.sector,
          notes: 'Top-performing biotech ETF'
        }
      });
      console.log(`  ✓ Added ${etf.ticker} - ${etf.companyName}`);
    }

    console.log(`\n🎉 Successfully created "Best-Performing Biotech ETFs" watchlist with ${biotechETFs.length} ETFs!`);
    console.log('\nYou can view it at: http://localhost:3000/watchlist.html');

  } catch (error) {
    console.error('Error creating watchlist:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createBiotechWatchlist();
