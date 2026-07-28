import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('password123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@moneylogix.com' },
    update: {},
    create: {
      email: 'demo@moneylogix.com',
      password: hashedPassword,
      name: 'Demo User',
    },
  });

  console.log('Created demo user:', user.email);

  // Create default watchlist
  const watchlist = await prisma.watchlist.create({
    data: {
      userId: user.id,
      name: 'My Watchlist',
    },
  });

  // Add symbols to watchlist
  const symbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'];
  for (const symbol of symbols) {
    await prisma.watchlistSymbol.create({
      data: { watchlistId: watchlist.id, symbol },
    });
  }

  console.log('Created watchlist with symbols');

  // Create default portfolio
  const portfolio = await prisma.portfolio.create({
    data: {
      userId: user.id,
      name: 'My Portfolio',
    },
  });

  // Add sample holdings
  const holdings = [
    { symbol: 'RELIANCE', quantity: 10, avgPrice: 2400, currentPrice: 2450, sector: 'Energy', assetClass: 'Equity' },
    { symbol: 'TCS', quantity: 5, avgPrice: 3800, currentPrice: 3890, sector: 'IT', assetClass: 'Equity' },
    { symbol: 'HDFCBANK', quantity: 15, avgPrice: 1650, currentPrice: 1675, sector: 'Banking', assetClass: 'Equity' },
  ];

  for (const holding of holdings) {
    await prisma.holding.create({
      data: {
        portfolioId: portfolio.id,
        ...holding,
        buyDate: new Date('2024-01-15'),
      },
    });
  }

  console.log('Created portfolio with holdings');

  // Create sample trades
  const trades = [
    { symbol: 'RELIANCE', type: 'BUY', quantity: 10, price: 2400 },
    { symbol: 'TCS', type: 'BUY', quantity: 5, price: 3800 },
    { symbol: 'HDFCBANK', type: 'BUY', quantity: 15, price: 1650 },
  ];

  for (const trade of trades) {
    await prisma.trade.create({
      data: {
        userId: user.id,
        symbol: trade.symbol,
        type: trade.type as 'BUY' | 'SELL',
        quantity: trade.quantity,
        price: trade.price,
        total: trade.quantity * trade.price,
        status: 'EXECUTED',
      },
    });
  }

  console.log('Created sample trades');

  // Create sample strategy
  await prisma.strategy.create({
    data: {
      userId: user.id,
      name: 'Balanced Growth',
      description: 'A moderate risk strategy focusing on blue-chip stocks',
      rules: {
        type: 'CUSTOM',
        allocations: [
          { type: 'BLUE_CHIP', allocation: 40 },
          { type: 'MID_CAP', allocation: 30 },
          { type: 'DEBT_FUND', allocation: 30 },
        ],
      },
      riskAppetite: 'MODERATE',
      status: 'ACTIVE',
    },
  });

  console.log('Created sample strategy');

  // Create risk profile
  await prisma.riskProfile.create({
    data: {
      userId: user.id,
      riskAppetite: 'MODERATE',
      investmentHorizon: 5,
      monthlyIncome: 100000,
      riskToleranceScore: 60,
      goals: { retirement: true, house: false, education: true },
    },
  });

  console.log('Created risk profile');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
