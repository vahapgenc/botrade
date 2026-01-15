const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const watchlists = [
  {
    name: 'Bora-Tech Devleri',
    description: 'Tech Giants - Major technology companies with market dominance',
    stocks: [
      { ticker: 'AMZN', companyName: 'Amazon.com Inc', sector: 'Consumer Discretionary' },
      { ticker: 'META', companyName: 'Meta Platforms Inc', sector: 'Technology' },
      { ticker: 'AVGO', companyName: 'Broadcom Inc', sector: 'Technology' },
      { ticker: 'ORCL', companyName: 'Oracle Corporation', sector: 'Technology' }
    ]
  },
  {
    name: 'Bora-Yarı İletkenler',
    description: 'Semiconductors - Chip manufacturers and semiconductor companies',
    stocks: [
      { ticker: 'AMD', companyName: 'Advanced Micro Devices Inc', sector: 'Technology' }
    ]
  },
  {
    name: 'Bora-Elektrikli Araçlar',
    description: 'Electric Vehicles - EV manufacturers and related technologies',
    stocks: [
      { ticker: 'TSLA', companyName: 'Tesla Inc', sector: 'Consumer Discretionary' }
    ]
  },
  {
    name: 'Bora-Fintech & Ödeme',
    description: 'Fintech & Payments - Digital banking, payments, and financial technology',
    stocks: [
      { ticker: 'SOFI', companyName: 'SoFi Technologies Inc', sector: 'Financials' },
      { ticker: 'PATH', companyName: 'UiPath Inc', sector: 'Technology' },
      { ticker: 'KBWB', companyName: 'Invesco KBW Bank ETF', sector: 'Financials' }
    ]
  },
  {
    name: 'Bora-Enerji & Yeşil Teknoloji',
    description: 'Energy & Green Technology - Clean energy, batteries, and sustainable solutions',
    stocks: [
      { ticker: 'EOSE', companyName: 'Eos Energy Enterprises Inc', sector: 'Energy' },
      { ticker: 'ERNG', companyName: 'Erin Energy Corporation', sector: 'Energy' },
      { ticker: 'IREN', companyName: 'Iris Energy Limited', sector: 'Energy' }
    ]
  },
  {
    name: 'Bora-Uzay & Havacılık',
    description: 'Space & Aerospace - Space exploration, satellites, and aviation',
    stocks: [
      { ticker: 'MKLB', companyName: 'Rocket Lab USA Inc', sector: 'Industrials' },
      { ticker: 'AVAV', companyName: 'AeroVironment Inc', sector: 'Industrials' }
    ]
  },
  {
    name: 'Bora-Sağlık & Biyoteknoloji',
    description: 'Healthcare & Biotech - Digital health, telemedicine, and biotechnology',
    stocks: [
      { ticker: 'HIMS', companyName: 'Hims & Hers Health Inc', sector: 'Healthcare' },
      { ticker: 'GMED', companyName: 'Globus Medical Inc', sector: 'Healthcare' }
    ]
  },
  {
    name: 'Bora-Lojistik & Kargo',
    description: 'Logistics & Cargo - Shipping, delivery, and supply chain',
    stocks: [
      { ticker: 'FDX', companyName: 'FedEx Corporation', sector: 'Industrials' },
      { ticker: 'FIX', companyName: 'Comfort Systems USA Inc', sector: 'Industrials' }
    ]
  },
  {
    name: 'Bora-Değerli Madenler',
    description: 'Precious Metals - Gold, silver, and commodities',
    stocks: [
      { ticker: 'GLD', companyName: 'SPDR Gold Shares ETF', sector: 'Materials' }
    ]
  },
  {
    name: 'Bora-Endüstriyel & İnşaat',
    description: 'Industrial & Construction - Heavy machinery, equipment, and construction',
    stocks: [
      { ticker: 'CAT', companyName: 'Caterpillar Inc', sector: 'Industrials' },
      { ticker: 'AAPX', companyName: 'Abraxas Petroleum Corporation', sector: 'Energy' },
      { ticker: 'CRS', companyName: 'Carpenter Technology Corporation', sector: 'Materials' }
    ]
  },
  {
    name: 'Bora-Telekomünikasyon',
    description: 'Telecommunications - Network infrastructure and communication services',
    stocks: [
      { ticker: 'TEN', companyName: 'Tencent Music Entertainment Group', sector: 'Communication Services' }
    ]
  },
  {
    name: 'Bora-Veri & Analitik',
    description: 'Data & Analytics - Big data, analytics platforms, and business intelligence',
    stocks: [
      { ticker: 'ZETA', companyName: 'Zeta Global Holdings Corp', sector: 'Technology' },
      { ticker: 'PDYN', companyName: 'Palladyne AI Corp', sector: 'Technology' },
      { ticker: 'FDYN', companyName: 'First Dynamics Inc', sector: 'Technology' }
    ]
  },
  {
    name: 'Bora-Kripto & Blockchain',
    description: 'Crypto & Blockchain - Cryptocurrency mining and blockchain technology',
    stocks: [
      { ticker: 'IREN', companyName: 'Iris Energy Limited', sector: 'Technology' }
    ]
  },
  {
    name: 'Bora-ETF Karışık',
    description: 'Mixed ETFs - Diversified exchange-traded funds across sectors',
    stocks: [
      { ticker: 'BKT', companyName: 'BlackRock Income Trust Inc', sector: 'Financials' },
      { ticker: 'NRDS', companyName: 'NerdWallet Inc', sector: 'Financials' },
      { ticker: 'BCAT', companyName: 'BlackRock Capital Allocation Term Trust', sector: 'Financials' },
      { ticker: 'JDZG', companyName: 'JD.com Inc', sector: 'Consumer Discretionary' },
      { ticker: 'JIS', companyName: 'Nuveen Select Tax-Free Income Portfolio', sector: 'Financials' },
      { ticker: 'FANUY', companyName: 'Fanuc Corp ADR', sector: 'Industrials' },
      { ticker: 'EVR', companyName: 'Evercore Inc', sector: 'Financials' },
      { ticker: 'RZLV', companyName: 'Rezolve AI Limited', sector: 'Technology' },
      { ticker: 'SKYT', companyName: 'SkyWater Technology Inc', sector: 'Technology' }
    ]
  }
];

async function createBoraPortfolioWatchlists() {
  try {
    console.log('Creating Bora portfolio watchlists...\n');
    
    for (const watchlistData of watchlists) {
      // Create the watchlist
      const watchlist = await prisma.watchlist.create({
        data: {
          name: watchlistData.name,
          description: watchlistData.description
        }
      });

      console.log(`✓ Created watchlist: ${watchlist.name} (ID: ${watchlist.id})`);

      // Add stocks to the watchlist
      for (const stock of watchlistData.stocks) {
        try {
          const added = await prisma.watchlistStock.create({
            data: {
              watchlistId: watchlist.id,
              ticker: stock.ticker,
              companyName: stock.companyName,
              sector: stock.sector
            }
          });
          console.log(`  ✓ Added ${stock.ticker} - ${stock.companyName}`);
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`  ⊘ Skipped ${stock.ticker} (already exists in this watchlist)`);
          } else {
            throw error;
          }
        }
      }
      console.log('');
    }

    console.log(`🎉 Successfully created ${watchlists.length} Bora portfolio watchlists!`);
    console.log('\nYou can view them at: http://localhost:3000/watchlist.html');

  } catch (error) {
    console.error('Error creating watchlists:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createBoraPortfolioWatchlists();
