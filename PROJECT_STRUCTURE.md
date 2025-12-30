# Botrade - Trading Bot Project Structure

```
botrade/
├── .dockerignore              # Docker ignore file
├── .env                       # Environment variables (not in git)
├── .env_example               # Example environment variables
├── .gitignore                 # Git ignore file
├── docker-compose.yml         # Docker services configuration
├── Dockerfile                 # Application container definition
├── package.json               # Node.js dependencies
├── LICENSE                    # License file
│
├── doc/                       # Documentation
│   ├── DOCKER_COMMANDS.md     # Docker reference
│   ├── IMPLEMENTATION_GUIDE.md
│   ├── project_plan.md
│   ├── step1_foundation.md
│   ├── step1b_docker_setup.md
│   ├── step2_database.md
│   └── step3_logging.md
│
├── config/                    # Configuration files
│   └── settings.js            # Application settings
│
├── prisma/                    # Database schema & migrations
│   └── schema.prisma          # Prisma schema (to be created)
│
├── src/                       # Application source code
│   ├── index.js               # Application entry point
│   │
│   ├── config/                # App configuration
│   │   └── (config modules)
│   │
│   ├── database/              # Database layer
│   │   ├── prisma.js          # Prisma client (to be created)
│   │   └── models/            # Database models/repositories
│   │
│   ├── services/              # Business logic services
│   │   ├── sentiment/         # Sentiment analysis (Part 1)
│   │   ├── technical/         # Technical analysis (Part 2)
│   │   ├── ai/                # AI decision making (Part 3)
│   │   ├── portfolio/         # Portfolio management (Part 4)
│   │   └── execution/         # Trade execution (Part 5)
│   │
│   ├── api/                   # REST API layer
│   │   ├── routes/            # API route handlers
│   │   └── middleware/        # Express middleware
│   │
│   ├── web/                   # Web UI (formerly ui/)
│   │   ├── public/            # Static assets
│   │   │   ├── css/
│   │   │   └── js/
│   │   └── views/             # View templates
│   │
│   └── utils/                 # Utility modules
│       ├── cache/             # Caching utilities
│       ├── logging/           # Logging utilities
│       └── (other helpers)
│
├── tests/                     # Test files
│   └── (test files)
│
├── logs/                      # Application logs (gitignored)
│   └── (log files)
│
└── data/                      # Data files (gitignored)
    └── (data files)
```

## Directory Descriptions

### Root Level
- **docker-compose.yml**: Orchestrates PostgreSQL, Redis, and App containers
- **Dockerfile**: Defines the Node.js application container
- **package.json**: Dependencies and npm scripts

### `/doc`
Documentation for setup, implementation guides, and reference materials.

### `/config`
Configuration files that are committed to git (no secrets).

### `/prisma`
Database schema definitions and migration files managed by Prisma ORM.

### `/src`
Main application source code, organized by layer:

#### `/src/config`
Application configuration modules (loaded from environment).

#### `/src/database`
- **prisma.js**: Prisma client instance and connection management
- **models/**: Repository pattern implementations for database access

#### `/src/services`
Business logic organized by trading system component:
- **sentiment/**: News and social media sentiment analysis
- **technical/**: Technical indicators and chart analysis
- **ai/**: AI-powered decision making with OpenAI
- **portfolio/**: Position sizing and risk management
- **execution/**: Trade execution via Interactive Brokers

#### `/src/api`
REST API endpoints for external access:
- **routes/**: Express route handlers
- **middleware/**: Authentication, validation, error handling

#### `/src/web`
Web-based user interface:
- **public/**: CSS, JavaScript, images
- **views/**: HTML templates or React components

#### `/src/utils`
Shared utilities:
- **cache/**: Redis caching helpers
- **logging/**: Winston logger configuration
- **validators/**: Input validation
- **formatters/**: Data formatting helpers

### `/tests`
Unit tests, integration tests, and test utilities.

### `/logs`
Application logs (created at runtime, not committed to git).

### `/data`
Temporary data files, exports, backups (not committed to git).

---

## Old Structure Mapping

If migrating from old structure:

```
OLD                          →  NEW
───────────────────────────────────────────────────
src/part1-sentiment/        →  src/services/sentiment/
src/part2-technical/        →  src/services/technical/
src/ai/                     →  src/services/ai/
src/portfolio/              →  src/services/portfolio/
src/execution/              →  src/services/execution/
src/ui/                     →  src/web/
src/database/               →  src/database/
src/utils/                  →  src/utils/
config/                     →  config/ (unchanged)
```

---

## Key Principles

1. **Separation of Concerns**: Each directory has a single responsibility
2. **Layer Architecture**: Database → Services → API → Web UI
3. **Docker-First**: All services containerized for consistency
4. **Environment-Based Config**: No hardcoded secrets
5. **Testability**: Clear structure makes testing easier

---

**Last Updated:** December 30, 2025
