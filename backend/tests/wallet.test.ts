import request from 'supertest';
import { createApp } from '../src/app.js';
import { TransactionModel } from '../src/models/Transaction.js';
import { WalletModel } from '../src/models/Wallet.js';
import { createAuthToken, createTestUser } from './helpers/factories.js';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase
} from './helpers/testDb.js';

const app = createApp();

interface ErrorResponseBody {
  code: string;
}

interface TransferResponseBody {
  data: {
    transfer: {
      referenceId: string;
    };
  };
}

beforeAll(connectTestDatabase);
afterEach(clearTestDatabase);
afterAll(disconnectTestDatabase);

describe('Wallet transfers', () => {
  it('transfers money atomically between wallets', async () => {
    const sender = await createTestUser({ email: 'sender@example.com', phone: '9876543212', balancePaise: 50000 });
    const receiver = await createTestUser({ email: 'receiver@example.com', phone: '9876543213', balancePaise: 10000 });
    const token = await createAuthToken(sender);

    const response = await request(app)
      .post('/api/v1/wallet/transfer')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'transfer-success-1')
      .send({
        recipient: receiver.email,
        amount: 100
      });

    expect(response.status).toBe(201);
    const body = response.body as unknown as TransferResponseBody;
    expect(body.data.transfer.referenceId).toEqual(expect.any(String));

    const senderWallet = await WalletModel.findOne({ userId: sender._id }).exec();
    const receiverWallet = await WalletModel.findOne({ userId: receiver._id }).exec();
    expect(senderWallet?.balance).toBe(40000);
    expect(receiverWallet?.balance).toBe(20000);

    const transactionCount = await TransactionModel.countDocuments().exec();
    expect(transactionCount).toBe(2);
  });

  it('rejects transfers with insufficient balance', async () => {
    const sender = await createTestUser({ email: 'low@example.com', phone: '9876543214', balancePaise: 5000 });
    const receiver = await createTestUser({ email: 'target@example.com', phone: '9876543215', balancePaise: 0 });
    const token = await createAuthToken(sender);

    const response = await request(app)
      .post('/api/v1/wallet/transfer')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'insufficient-1')
      .send({
        recipient: receiver.email,
        amount: 100
      });

    expect(response.status).toBe(400);
    const body = response.body as unknown as ErrorResponseBody;
    expect(body.code).toBe('INSUFFICIENT_BALANCE');

    const senderWallet = await WalletModel.findOne({ userId: sender._id }).exec();
    expect(senderWallet?.balance).toBe(5000);
  });

  it('rejects invalid recipient users', async () => {
    const sender = await createTestUser({ email: 'invalid@example.com', phone: '9876543216', balancePaise: 50000 });
    const token = await createAuthToken(sender);

    const response = await request(app)
      .post('/api/v1/wallet/transfer')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'invalid-recipient-1')
      .send({
        recipient: 'missing@example.com',
        amount: 100
      });

    expect(response.status).toBe(404);
    const body = response.body as unknown as ErrorResponseBody;
    expect(body.code).toBe('RECIPIENT_NOT_FOUND');
  });

  it('rejects duplicate idempotency keys', async () => {
    const sender = await createTestUser({ email: 'dupe@example.com', phone: '9876543217', balancePaise: 50000 });
    const receiver = await createTestUser({ email: 'dupetarget@example.com', phone: '9876543218', balancePaise: 0 });
    const token = await createAuthToken(sender);

    const firstResponse = await request(app)
      .post('/api/v1/wallet/transfer')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'duplicate-key')
      .send({
        recipient: receiver.email,
        amount: 100
      });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app)
      .post('/api/v1/wallet/transfer')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'duplicate-key')
      .send({
        recipient: receiver.email,
        amount: 100
      });

    expect(secondResponse.status).toBe(409);
    const body = secondResponse.body as unknown as ErrorResponseBody;
    expect(body.code).toBe('IDEMPOTENCY_KEY_CONFLICT');
  });
});
