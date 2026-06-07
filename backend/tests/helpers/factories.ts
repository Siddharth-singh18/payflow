import { Types } from 'mongoose';
import { UserModel, type UserDocument } from '../../src/models/User.js';
import { WalletModel } from '../../src/models/Wallet.js';
import { createTokenPair } from '../../src/services/tokenService.js';

interface TestUserInput {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  balancePaise?: number;
}

export const createTestUser = async (input: TestUserInput = {}): Promise<UserDocument> => {
  const unique = new Types.ObjectId().toString().slice(-8);
  const user = await UserModel.create({
    name: input.name ?? `User ${unique}`,
    email: input.email ?? `user${unique}@example.com`,
    phone: input.phone ?? `9${unique.padStart(9, '0')}`,
    password: input.password ?? 'Password123'
  });

  await WalletModel.create({
    userId: user._id,
    balance: input.balancePaise ?? 0,
    currency: 'INR',
    virtualAccountNumber: `PF${unique.padStart(10, '0')}`
  });

  return user;
};

export const createAuthToken = async (user: UserDocument): Promise<string> => {
  const tokens = await createTokenPair(user._id.toString(), user.role);
  return tokens.accessToken;
};
