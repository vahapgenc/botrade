# Botrade - AI-Powered Algorithmic Trading Platform

[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-15-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An advanced algorithmic trading platform that combines sentiment analysis, technical indicators, and AI-powered decision making to execute trades via Interactive Brokers.

---

## 📁 Project Structure

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed architecture.

```
botrade/
├── src/
│   ├── services/       # Business logic (sentiment, technical, ai, portfolio, execution)
│   ├── database/       # Prisma ORM & models
│   ├── api/            # REST API endpoints
│   ├── web/            # Web UI
│   └── utils/          # Shared utilities
├── config/             # Configuration files
├── prisma/             # Database schema & migrations
├── doc/                # Documentation
├── tests/              # Test files
└── docker-compose.yml  # Docker orchestration
```

---

## 🚀 Quick Start (Docker - Recommended)

### Prerequisites
- Docker Desktop installed
- Git installed

### Setup
```bash
# 1. Clone and navigate to project
cd c:\projects\teblab\botrade

# 2. Configure environment
# Edit .env file and set your API keys and DB password

# 3. Build and start services
npm run docker:build
npm run docker:up

# 4. Initialize database
docker-compose exec app npm install @prisma/client
docker-compose exec app npm install --save-dev prisma
docker-compose exec app npx prisma init

# 5. Create database schema (Step 2)
# Copy schema from doc/step2_database.md to prisma/schema.prisma
docker-compose exec app npx prisma migrate dev --name init

# 6. Verify everything is running
docker-compose ps
curl http://localhost:3000/health
```

---

## 📋 Available Commands

### Docker Commands
```bash
npm run docker:build      # Build Docker images
npm run docker:up         # Start all services
npm run docker:down       # Stop all services
npm run docker:logs       # View app logs
npm run docker:restart    # Restart app container
```

### Database Commands
```bash
npm run prisma:migrate    # Run database migrations
npm run prisma:generate   # Generate Prisma client
npm run prisma:studio     # Open Prisma Studio (DB GUI)
```

### Development Commands
```bash
npm start                 # Start app (local)
npm run dev               # Start with auto-reload (local)
npm test                  # Run tests
```

See [doc/DOCKER_COMMANDS.md](doc/DOCKER_COMMANDS.md) for comprehensive command reference.

---

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **ORM**: Prisma
- **Containerization**: Docker & Docker Compose
- **Broker**: Interactive Brokers (Client Portal API)

### System Components

1. **Sentiment Analysis** (`src/services/sentiment/`)
   - News aggregation (NewsAPI, FMP)
   - Social media sentiment
   - Fear & Greed Index

2. **Technical Analysis** (`src/services/technical/`)
   - Price data (Polygon, FMP)
   - Technical indicators (SMA, RSI, MACD, etc.)
   - Pattern recognition

3. **AI Decision Engine** (`src/services/ai/`)
   - OpenAI GPT-4 integration
   - Context-aware decision making
   - Risk assessment

4. **Portfolio Manager** (`src/services/portfolio/`)
   - Position sizing
   - Risk management
   - Correlation analysis

5. **Trade Execution** (`src/services/execution/`)
   - Interactive Brokers API
   - Order management
   - Fill tracking

---

## 🔧 Configuration

### Environment Variables

Edit `.env` file:

```bash
# Database
DB_PASSWORD=your_secure_password_here
DATABASE_URL="postgresql://botrade_user:your_password@postgres:5432/botrade?schema=public"

# API Keys
FMP_API_KEY=your_fmp_key_here
OPENAI_API_KEY=your_openai_key_here
POLYGON_API_KEY=your_polygon_key_here
NEWSAPI_KEY=your_newsapi_key_here

# Interactive Brokers
IB_PORT=7497              # 7497 for paper, 7496 for live
IB_CLIENT_ID=1

# Trading Settings
MIN_CONFIDENCE=70         # Minimum AI confidence to trade (%)
MAX_POSITION_PCT=10       # Max % of portfolio per position
MAX_DAILY_TRADES=10       # Max trades per day
```

### API Keys

You'll need accounts and API keys from:
- [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs/) - Market data
- [OpenAI](https://platform.openai.com/api-keys) - AI decision making
- [Polygon.io](https://polygon.io/) - Real-time market data
- [NewsAPI](https://newsapi.org/) - News aggregation

---

## 📚 Documentation

- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Detailed architecture
- [doc/DOCKER_COMMANDS.md](doc/DOCKER_COMMANDS.md) - Docker reference
- [doc/IMPLEMENTATION_GUIDE.md](doc/IMPLEMENTATION_GUIDE.md) - Implementation guide
- [doc/step1_foundation.md](doc/step1_foundation.md) - Step 1: Foundation
- [doc/step1b_docker_setup.md](doc/step1b_docker_setup.md) - Step 1b: Docker setup
- [doc/step2_database.md](doc/step2_database.md) - Step 2: Database
- [doc/step3_logging.md](doc/step3_logging.md) - Step 3: Logging

---

## 🧪 Testing

```bash
# Run all tests
docker-compose exec app npm test

# Run specific test
docker-compose exec app node tests/test-database.js

# Check health
curl http://localhost:3000/health
```

---

## 📊 Services

| Service | Port | Container | Description |
|---------|------|-----------|-------------|
| App | 3000 | botrade-app | Trading bot application |
| PostgreSQL | 15432 | botrade-db | Database |
| Redis | 6379 | botrade-redis | Cache |
| Prisma Studio | 5555 | botrade-prisma | DB GUI (optional) |

---

## 🔒 Security Notes

- Never commit `.env` file to git
- Use strong passwords for database
- Keep API keys secure
- Run in paper trading mode first
- Review all trades before executing

---

## 📈 Development Roadmap

- [x] Step 1: Project foundation
- [x] Step 1b: Docker setup
- [ ] Step 2: Database schema
- [ ] Step 3: Logging system
- [ ] Step 4: Sentiment analysis
- [ ] Step 5: Technical analysis
- [ ] Step 6: AI decision engine
- [ ] Step 7: Portfolio management
- [ ] Step 8: Trade execution
- [ ] Step 9: Web UI
- [ ] Step 10: Testing & deployment

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## ⚠️ Disclaimer

This software is for educational purposes only. Trading involves substantial risk of loss. Past performance is not indicative of future results. Always consult with a financial advisor before making investment decisions.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🛠️ Troubleshooting

### Common Issues

**Container keeps restarting**
```bash
docker-compose logs app
docker-compose restart app
```

**Database connection failed**
```bash
docker-compose exec postgres psql -U botrade_user -d botrade
```

**Port already in use**
```bash
# Change port in docker-compose.yml
ports: "3001:3000"
```

See [doc/DOCKER_COMMANDS.md](doc/DOCKER_COMMANDS.md) for more troubleshooting tips.

---

## 📞 Support

- Check documentation in `/doc` folder
- Review Docker commands reference
- Open an issue on GitHub
- Read implementation guides

---

**Built with ❤️ for algorithmic traders**

---

**Last Updated:** December 30, 2025
