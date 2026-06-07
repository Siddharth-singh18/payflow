import request from 'supertest';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/models/User.js';
import { WalletModel } from '../src/models/Wallet.js';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase
} from './helpers/testDb.js';

const app = createApp();

interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
}

interface AuthTokenResponseBody {
  data: {
    tokens: TokenPairResponse;
  };
}

interface SuccessResponseBody {
  success: boolean;
}

beforeAll(connectTestDatabase);
afterEach(clearTestDatabase);
afterAll(disconnectTestDatabase);

describe('Auth API', () => {
  it('registers a user and creates a wallet', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'Aarav Sharma',
      email: 'aarav@example.com',
      phone: '9876543210',
      password: 'Password123'
    });

    expect(response.status).toBe(201);
    const body = response.body as unknown as SuccessResponseBody;
    expect(body.success).toBe(true);

    const user = await UserModel.findOne({ email: 'aarav@example.com' }).exec();
    expect(user).not.toBeNull();

    const wallet = await WalletModel.findOne({ userId: user?._id }).exec();
    expect(wallet).not.toBeNull();
    expect(wallet?.balance).toBe(0);
  });

  it('logs in, refreshes tokens, and logs out', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Diya Mehta',
      email: 'diya@example.com',
      phone: '9876543211',
      password: 'Password123'
    });

    const loginResponse = await request(app).post('/api/v1/auth/login').send({
      emailOrPhone: 'diya@example.com',
      password: 'Password123'
    });

    expect(loginResponse.status).toBe(200);
    const loginBody = loginResponse.body as unknown as AuthTokenResponseBody;
    const accessToken = loginBody.data.tokens.accessToken;
    const refreshToken = loginBody.data.tokens.refreshToken;
    expect(accessToken).toEqual(expect.any(String));
    expect(refreshToken).toEqual(expect.any(String));

    const refreshResponse = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(refreshResponse.status).toBe(200);
    const refreshBody = refreshResponse.body as unknown as AuthTokenResponseBody;
    expect(refreshBody.data.tokens.accessToken).toEqual(expect.any(String));

    const rotatedRefreshToken = refreshBody.data.tokens.refreshToken;
    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${refreshBody.data.tokens.accessToken}`)
      .send({ refreshToken: rotatedRefreshToken });

    expect(logoutResponse.status).toBe(200);

    const refreshAfterLogout = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotatedRefreshToken });
    expect(refreshAfterLogout.status).toBe(401);
  });
});
