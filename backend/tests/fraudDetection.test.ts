import { Types } from 'mongoose';
import { AuditLogModel } from '../src/models/AuditLog.js';
import { assessTransferFraud } from '../src/utils/fraudDetection.js';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase
} from './helpers/testDb.js';

beforeAll(connectTestDatabase);
afterEach(clearTestDatabase);
afterAll(disconnectTestDatabase);

describe('Fraud detection', () => {
  it('flags transfers above the amount threshold', async () => {
    const userId = new Types.ObjectId().toString();

    const assessment = await assessTransferFraud({
      userId,
      amountPaise: 60000 * 100
    });

    expect(assessment.isFlagged).toBe(true);
    expect(assessment.score).toBeGreaterThanOrEqual(30);
    expect(assessment.reasons).toContain('Single transfer above ₹50,000');

    const auditLog = await AuditLogModel.findOne({ userId }).exec();
    expect(auditLog?.fraudScore).toBe(assessment.score);
  });

  it('blocks velocity after more than 5 transfers in 10 minutes', async () => {
    const userId = new Types.ObjectId().toString();

    for (let index = 0; index < 5; index += 1) {
      const assessment = await assessTransferFraud({
        userId,
        amountPaise: 100 * 100
      });
      expect(assessment.isBlocked).toBe(false);
    }

    await expect(
      assessTransferFraud({
        userId,
        amountPaise: 100 * 100
      })
    ).rejects.toMatchObject({
      code: 'FRAUD_TRANSFER_BLOCKED',
      statusCode: 403
    });

    const auditLog = await AuditLogModel.findOne({ userId, severity: 'critical' }).exec();
    expect(auditLog?.reasons).toContain('More than 5 transfers in 10 minutes');
  });
});
