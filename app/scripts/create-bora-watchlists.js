const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const watchlists = [
  {
    name: 'Bora-AI Infrastructure / Yapay Zeka Altyapı',
    description: 'AI chips, data centers, and infrastructure | Yapay zeka çipleri, veri merkezleri ve altyapı',
    stocks: [
      { ticker: 'NVDA', companyName: 'Nvidia Corporation', sector: 'Technology' },
      { ticker: 'AMD', companyName: 'Advanced Micro Devices Inc', sector: 'Technology' },
      { ticker: 'QCOM', companyName: 'Qualcomm Inc', sector: 'Technology' },
      { ticker: 'VRT', companyName: 'Vertiv Holdings Co', sector: 'Technology' },
      { ticker: 'CLS', companyName: 'Celestica Inc', sector: 'Technology' },
      { ticker: 'NVT', companyName: 'NVent Electric plc', sector: 'Industrials' }
    ]
  },
  {
    name: 'Bora-AI Energy / Yapay Zeka Enerji',
    description: 'Power generation and energy solutions for AI | YZ için güç üretimi ve enerji çözümleri',
    stocks: [
      { ticker: 'VST', companyName: 'Vistra Corp', sector: 'Utilities' },
      { ticker: 'CEG', companyName: 'Constellation Energy Corporation', sector: 'Utilities' },
      { ticker: 'SMR', companyName: 'NuScale Power Corporation', sector: 'Energy' },
      { ticker: 'OKLO', companyName: 'Oklo Inc', sector: 'Energy' }
    ]
  },
  {
    name: 'Bora-Robotics & Transport / Robotlar ve Ulaşım',
    description: 'Autonomous vehicles, robotics, and mobility | Otonom araçlar, robotik ve mobilite',
    stocks: [
      { ticker: 'TSLA', companyName: 'Tesla Inc', sector: 'Consumer Discretionary' },
      { ticker: 'UBER', companyName: 'Uber Technologies Inc', sector: 'Technology' },
      { ticker: 'JOBY', companyName: 'Joby Aviation Inc', sector: 'Industrials' },
      { ticker: 'GRAB', companyName: 'Grab Holdings Limited', sector: 'Technology' }
    ]
  },
  {
    name: 'Bora-AI & Data / Yapay Zeka ve Veri',
    description: 'Data analytics, cloud platforms, AI software | Veri analitiği, bulut platformları, YZ yazılımı',
    stocks: [
      { ticker: 'PLTR', companyName: 'Palantir Technologies Inc', sector: 'Technology' },
      { ticker: 'ESTC', companyName: 'Elastic N.V.', sector: 'Technology' },
      { ticker: 'SNOW', companyName: 'Snowflake Inc', sector: 'Technology' }
    ]
  },
  {
    name: 'Bora-Battery / Batarya',
    description: 'Energy storage and battery technology | Enerji depolama ve batarya teknolojisi',
    stocks: [
      { ticker: 'EOSE', companyName: 'Eos Energy Enterprises Inc', sector: 'Energy' },
      { ticker: 'ASPN', companyName: 'Aspen Aerogels Inc', sector: 'Materials' },
      { ticker: 'ENVX', companyName: 'Enovix Corporation', sector: 'Technology' }
    ]
  },
  {
    name: 'Bora-Space / Uzay',
    description: 'Space exploration, satellites, and aerospace | Uzay araştırması, uydular ve havacılık',
    stocks: [
      { ticker: 'RKLB', companyName: 'Rocket Lab USA Inc', sector: 'Industrials' },
      { ticker: 'LUNR', companyName: 'Intuitive Machines Inc', sector: 'Industrials' },
      { ticker: 'DXYZ', companyName: 'Destiny Tech100 Inc', sector: 'Technology' }
    ]
  },
  {
    name: 'Bora-AR/VR / Artırılmış Gerçeklik',
    description: 'Augmented reality, VR, and metaverse | Artırılmış gerçeklik, VR ve metaverse',
    stocks: [
      { ticker: 'META', companyName: 'Meta Platforms Inc', sector: 'Technology' }
    ]
  },
  {
    name: 'Bora-Finance / Finans',
    description: 'Fintech, digital banking, and investment | Fintech, dijital bankacılık ve yatırım',
    stocks: [
      { ticker: 'SOFI', companyName: 'SoFi Technologies Inc', sector: 'Financials' },
      { ticker: 'PYPL', companyName: 'PayPal Holdings Inc', sector: 'Financials' },
      { ticker: 'BRK.B', companyName: 'Berkshire Hathaway Inc Class B', sector: 'Financials' }
    ]
  },
  {
    name: 'Bora-Quantum & IoT / Kuantum ve IoT',
    description: 'Quantum computing and Internet of Things | Kuantum bilişim ve Nesnelerin İnterneti',
    stocks: [
      { ticker: 'IONQ', companyName: 'IonQ Inc', sector: 'Technology' },
      { ticker: 'LTRX', companyName: 'Lantronix Inc', sector: 'Technology' }
    ]
  },
  {
    name: 'Bora-BioTech & Health / Biyoteknoloji ve Sağlık',
    description: 'Biotechnology, medical devices, healthcare innovation | Biyoteknoloji, tıbbi cihazlar, sağlık inovasyonu',
    stocks: [
      { ticker: 'RXRX', companyName: 'Recursion Pharmaceuticals Inc', sector: 'Healthcare' },
      { ticker: 'TMDX', companyName: 'TransMedics Group Inc', sector: 'Healthcare' },
      { ticker: 'DNA', companyName: 'Ginkgo Bioworks Holdings Inc', sector: 'Healthcare' },
      { ticker: 'QSI', companyName: 'Quantum-Si Incorporated', sector: 'Healthcare' },
      { ticker: 'DCTH', companyName: 'Delcath Systems Inc', sector: 'Healthcare' }
    ]
  }
];

async function createBoraWatchlists() {
  try {
    console.log('Creating Bora watchlists...\n');
    
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
            console.log(`  ⊘ Skipped ${stock.ticker} (already exists)`);
          } else {
            throw error;
          }
        }
      }
      console.log('');
    }

    console.log(`🎉 Successfully created ${watchlists.length} Bora watchlists!`);
    console.log('\nYou can view them at: http://localhost:3000/watchlist.html');

  } catch (error) {
    console.error('Error creating watchlists:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createBoraWatchlists();
