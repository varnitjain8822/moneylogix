import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { generateToken } from '../middleware/auth';

export const register = async (email: string, password: string, name: string) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
  });

  // Create default portfolio
  await prisma.portfolio.create({
    data: { userId: user.id, name: 'Default Portfolio' },
  });

  // Create default paper wallet
  await prisma.paperWallet.create({
    data: { userId: user.id, balance: 1000000 },
  });

  const token = generateToken(user.id);
  return { user: { id: user.id, email: user.email, name: user.name }, token };
};

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken(user.id);
  return { user: { id: user.id, email: user.email, name: user.name }, token };
};
