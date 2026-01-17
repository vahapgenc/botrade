const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const stocks = [
  // Losers
  { ticker: 'VELO', companyName: 'Velo3D Inc', sector: 'Technology' },
  { ticker: 'FEIM', companyName: 'Frequency Electronics Inc', sector: 'Technology' },
  { ticker: 'ALMU', companyName: 'Alumis Inc', sector: 'Healthcare' },
  { ticker: 'FJET', companyName: 'Flexible Jet Inc', sector: 'Industrials' },
  { ticker: 'FLNC', companyName: 'Fluence Energy Inc', sector: 'Utilities' },
  { ticker: 'BE', companyName: 'Bloom Energy Corp', sector: 'Energy' },
  { ticker: 'GSIT', companyName: 'GSI Technology Inc', sector: 'Technology' },
  { ticker: 'XPEV', companyName: 'XPeng Inc', sector: 'Consumer Discretionary' },
  { ticker: 'ATI', companyName: 'ATI Inc', sector: 'Materials' },
  { ticker: 'RR', companyName: 'Richtech Robotics Inc', sector: 'Technology' },
  { ticker: 'FTAI', companyName: 'FTAI Aviation Ltd', sector: 'Industrials' },
  { ticker: 'OPRA', companyName: 'Opera Ltd', sector: 'Technology' },
  { ticker: 'TE', companyName: 'TPCO Holding Corp', sector: 'Consumer Discretionary' },
  { ticker: 'ROK', companyName: 'Rockwell Automation Inc', sector: 'Industrials' },
  { ticker: 'KRMN', companyName: 'Kearny Financial Corp', sector: 'Financials' },
  { ticker: 'LASR', companyName: 'nLIGHT Inc', sector: 'Technology' },
  { ticker: 'SSYS', companyName: 'Stratasys Ltd', sector: 'Technology' },
  // Gainers
  { ticker: 'JOBY', companyName: 'Joby Aviation Inc', sector: 'Industrials' },
  { ticker: 'OUST', companyName: 'Ouster Inc', sector: 'Technology' },
  { ticker: 'AIRO', companyName: 'Airobotics Ltd', sector: 'Industrials' },
  { ticker: 'HGRAF', companyName: 'HG Holdings Inc', sector: 'Technology' },
  { ticker: 'PL', companyName: 'Planet Labs PBC', sector: 'Technology' },
  { ticker: 'FLY', companyName: 'Fly Leasing Ltd', sector: 'Industrials' },
  { ticker: 'RDW', companyName: 'Redwire Corp', sector: 'Industrials' },
  { ticker: 'PRZO', companyName: 'ParaZero Technologies Ltd', sector: 'Technology' },
  { ticker: 'USAR', companyName: 'US Global Jets ETF', sector: 'Industrials' },
  { ticker: 'LTBR', companyName: 'Lightbridge Corp', sector: 'Energy' },
  { ticker: 'NVTX', companyName: 'NUVECTIS PHARMA Inc', sector: 'Healthcare' },
  { ticker: 'POET', companyName: 'POET Technologies Inc', sector: 'Technology' },
  { ticker: 'SIDU', companyName: 'Sidus Space Inc', sector: 'Industrials' },
  { ticker: 'CRML', companyName: 'Critical Metals Corp', sector: 'Materials' }
];

async function createSuperWingsWatchlist() {
  try {
    console.log('Creating Super Wings watchlist...');
    
    // Create the watchlist
    const watchlist = await prisma.watchlist.create({
      data: {
        name: 'Super Wings',
        description: 'High-volatility aerospace, robotics, and technology stocks - mix of daily gainers and losers'
      }
    });

    console.log(`✓ Created watchlist: ${watchlist.name} (ID: ${watchlist.id})`);

    // Add stocks to the watchlist
    console.log('\nAdding stocks to watchlist:');
    for (const stock of stocks) {
      // Check if stock already exists in this watchlist
      const existing = await prisma.watchlistStock.findUnique({
        where: {
          watchlistId_ticker: {
            watchlistId: watchlist.id,
            ticker: stock.ticker
          }
        }
      });

      if (!existing) {
        const added = await prisma.watchlistStock.create({
          data: {
            watchlistId: watchlist.id,
            ticker: stock.ticker,
            companyName: stock.companyName,
            sector: stock.sector,
            notes: 'High-volatility stock'
          }
        });
        console.log(`  ✓ Added ${stock.ticker} - ${stock.companyName}`);
      } else {
        console.log(`  ⊘ Skipped ${stock.ticker} (already exists)`);
      }
    }

    console.log(`\n🎉 Successfully created "Super Wings" watchlist!`);
    console.log('\nYou can view it at: http://localhost:3000/watchlist.html');

  } catch (error) {
    console.error('Error creating watchlist:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperWingsWatchlist();
