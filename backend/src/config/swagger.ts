import swaggerJSDoc, { type OAS3Options } from 'swagger-jsdoc';

type SchemaObject = Record<string, unknown>;
type OperationObject = Record<string, unknown>;

const successEnvelope = (dataSchema?: SchemaObject): SchemaObject => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    ...(dataSchema ? { data: dataSchema } : {})
  }
});

const jsonBody = (schema: SchemaObject): SchemaObject => ({
  required: true,
  content: {
    'application/json': {
      schema
    }
  }
});

const jsonResponse = (description: string, schema?: SchemaObject): SchemaObject => ({
  description,
  content: {
    'application/json': {
      schema: schema ?? successEnvelope()
    }
  }
});

const errorResponse = (description: string): SchemaObject => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' }
    }
  }
});

const bearerSecurity = [{ bearerAuth: [] }];

const paginationParams: SchemaObject[] = [
  {
    in: 'query',
    name: 'page',
    schema: { type: 'integer', minimum: 1, default: 1 }
  },
  {
    in: 'query',
    name: 'limit',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
  }
];

const idempotencyHeader: SchemaObject = {
  in: 'header',
  name: 'X-Idempotency-Key',
  required: true,
  schema: { type: 'string', maxLength: 120 }
};

const bearerOperation = (
  tags: string[],
  summary: string,
  operation: OperationObject = {}
): OperationObject => ({
  tags,
  summary,
  security: bearerSecurity,
  ...operation
});

const publicOperation = (
  tags: string[],
  summary: string,
  operation: OperationObject = {}
): OperationObject => ({
  tags,
  summary,
  ...operation
});

const swaggerOptions: OAS3Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PayFlow API',
      version: '1.0.0',
      description:
        'Production-grade fintech wallet API with JWT auth, MongoDB transactions, Redis, Socket.io, Razorpay, KYC, QR, splits, schedules, admin analytics, and fraud controls.'
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local development server'
      }
    ],
    tags: [
      { name: 'Health' },
      { name: 'Auth' },
      { name: 'Wallet' },
      { name: 'Transactions' },
      { name: 'KYC' },
      { name: 'Split Bills' },
      { name: 'Scheduled Payments' },
      { name: 'Notifications' },
      { name: 'Admin' },
      { name: 'Webhooks' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          required: ['success', 'message', 'code', 'statusCode'],
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Request validation failed' },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            statusCode: { type: 'integer', example: 400 },
            details: { type: 'object' }
          }
        },
        TokenPair: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' }
          }
        },
        Wallet: {
          type: 'object',
          properties: {
            balance: { type: 'number', example: 1250.5 },
            balancePaise: { type: 'integer', example: 125050 },
            currency: { type: 'string', example: 'INR' },
            virtualAccountNumber: { type: 'string', example: 'PF1234567890' },
            isFrozen: { type: 'boolean' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNextPage: { type: 'boolean' },
            hasPreviousPage: { type: 'boolean' }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['credit', 'debit', 'refund'] },
            status: { type: 'string', enum: ['pending', 'completed', 'failed', 'flagged'] },
            channel: { type: 'string' },
            category: { type: 'string' },
            amount: { type: 'number' },
            amountPaise: { type: 'integer' },
            referenceId: { type: 'string' },
            isFlagged: { type: 'boolean' },
            fraudScore: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['payment', 'kyc', 'fraud', 'system'] },
            title: { type: 'string' },
            message: { type: 'string' },
            isRead: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    paths: {
      '/health': {
        get: publicOperation(['Health'], 'Health check', {
          responses: {
            200: jsonResponse('Backend health status')
          }
        })
      },
      '/api/v1/auth/register': {
        post: publicOperation(['Auth'], 'Register a new user and create wallet', {
          requestBody: jsonBody({
            type: 'object',
            required: ['name', 'email', 'phone', 'password'],
            properties: {
              name: { type: 'string', example: 'Aarav Sharma' },
              email: { type: 'string', format: 'email', example: 'aarav@example.com' },
              phone: { type: 'string', example: '9876543210' },
              password: { type: 'string', format: 'password', minLength: 8 }
            }
          }),
          responses: {
            201: jsonResponse('Registration successful'),
            400: errorResponse('Validation error'),
            409: errorResponse('User already exists')
          }
        })
      },
      '/api/v1/auth/verify-otp': {
        post: publicOperation(['Auth'], 'Verify email OTP', {
          requestBody: jsonBody({
            type: 'object',
            required: ['email', 'otp'],
            properties: {
              email: { type: 'string', format: 'email' },
              otp: { type: 'string', example: '123456' }
            }
          }),
          responses: {
            200: jsonResponse('Email verified'),
            400: errorResponse('Invalid OTP')
          }
        })
      },
      '/api/v1/auth/login': {
        post: publicOperation(['Auth'], 'Login with email or phone', {
          requestBody: jsonBody({
            type: 'object',
            required: ['emailOrPhone', 'password'],
            properties: {
              emailOrPhone: { type: 'string', example: 'aarav@example.com' },
              password: { type: 'string', format: 'password' }
            }
          }),
          responses: {
            200: jsonResponse('Login successful', successEnvelope({ $ref: '#/components/schemas/TokenPair' })),
            401: errorResponse('Invalid credentials')
          }
        })
      },
      '/api/v1/auth/refresh': {
        post: publicOperation(['Auth'], 'Rotate refresh token', {
          requestBody: jsonBody({
            type: 'object',
            required: ['refreshToken'],
            properties: { refreshToken: { type: 'string' } }
          }),
          responses: {
            200: jsonResponse('Token refreshed'),
            401: errorResponse('Invalid refresh token')
          }
        })
      },
      '/api/v1/auth/logout': {
        post: bearerOperation(['Auth'], 'Logout and revoke tokens', {
          requestBody: jsonBody({
            type: 'object',
            required: ['refreshToken'],
            properties: { refreshToken: { type: 'string' } }
          }),
          responses: {
            200: jsonResponse('Logout successful'),
            401: errorResponse('Unauthorized')
          }
        })
      },
      '/api/v1/auth/forgot-password': {
        post: publicOperation(['Auth'], 'Request password reset OTP', {
          requestBody: jsonBody({
            type: 'object',
            required: ['email'],
            properties: { email: { type: 'string', format: 'email' } }
          }),
          responses: {
            200: jsonResponse('Password reset OTP sent'),
            404: errorResponse('User not found')
          }
        })
      },
      '/api/v1/auth/reset-password': {
        post: publicOperation(['Auth'], 'Reset password with OTP', {
          requestBody: jsonBody({
            type: 'object',
            required: ['email', 'otp', 'newPassword'],
            properties: {
              email: { type: 'string', format: 'email' },
              otp: { type: 'string' },
              newPassword: { type: 'string', format: 'password', minLength: 8 }
            }
          }),
          responses: {
            200: jsonResponse('Password reset successful'),
            400: errorResponse('Invalid OTP')
          }
        })
      },
      '/api/v1/wallet/balance': {
        get: bearerOperation(['Wallet'], 'Get wallet balance', {
          responses: {
            200: jsonResponse('Wallet balance', successEnvelope({ $ref: '#/components/schemas/Wallet' })),
            401: errorResponse('Unauthorized')
          }
        })
      },
      '/api/v1/wallet/add-money': {
        post: bearerOperation(['Wallet'], 'Create Razorpay order for wallet top-up', {
          requestBody: jsonBody({
            type: 'object',
            required: ['amount'],
            properties: { amount: { type: 'number', minimum: 1, maximum: 100000 } }
          }),
          responses: {
            201: jsonResponse('Razorpay order created'),
            401: errorResponse('Unauthorized')
          }
        })
      },
      '/api/v1/wallet/qr': {
        get: bearerOperation(['Wallet'], 'Generate wallet QR code', {
          responses: {
            200: jsonResponse('QR generated'),
            401: errorResponse('Unauthorized')
          }
        })
      },
      '/api/v1/wallet/pay-qr': {
        post: bearerOperation(['Wallet'], 'Pay using PayFlow QR payload', {
          parameters: [idempotencyHeader],
          requestBody: jsonBody({
            type: 'object',
            required: ['payload', 'amount'],
            properties: {
              payload: { type: 'string', example: 'payflow://pay?vpa=userId&name=Aarav' },
              amount: { type: 'number', minimum: 1 },
              note: { type: 'string', maxLength: 180 }
            }
          }),
          responses: {
            201: jsonResponse('QR payment successful'),
            409: errorResponse('Duplicate idempotency key')
          }
        })
      },
      '/api/v1/wallet/transfer': {
        post: bearerOperation(['Wallet'], 'Transfer money to another user atomically', {
          parameters: [
            idempotencyHeader,
            {
              in: 'header',
              name: 'X-Device-Fingerprint',
              required: false,
              schema: { type: 'string' }
            }
          ],
          requestBody: jsonBody({
            type: 'object',
            required: ['recipient', 'amount'],
            properties: {
              recipient: { type: 'string', description: 'Recipient user id, email, or phone' },
              amount: { type: 'number', minimum: 1 },
              note: { type: 'string', maxLength: 180 }
            }
          }),
          responses: {
            201: jsonResponse('Transfer completed'),
            400: errorResponse('Insufficient balance'),
            403: errorResponse('Fraud block'),
            409: errorResponse('Duplicate idempotency key')
          }
        })
      },
      '/api/v1/wallet/transactions': {
        get: bearerOperation(['Wallet', 'Transactions'], 'Get wallet transaction history', {
          parameters: [
            ...paginationParams,
            { in: 'query', name: 'type', schema: { type: 'string', enum: ['credit', 'debit', 'refund'] } },
            {
              in: 'query',
              name: 'status',
              schema: { type: 'string', enum: ['pending', 'completed', 'failed', 'flagged'] }
            },
            { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date-time' } },
            { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date-time' } },
            { in: 'query', name: 'minAmount', schema: { type: 'number' } },
            { in: 'query', name: 'maxAmount', schema: { type: 'number' } }
          ],
          responses: {
            200: jsonResponse('Transactions fetched'),
            401: errorResponse('Unauthorized')
          }
        })
      },
      '/api/v1/transactions': {
        get: bearerOperation(['Transactions'], 'Get transaction history', {
          parameters: paginationParams,
          responses: {
            200: jsonResponse('Transactions fetched')
          }
        })
      },
      '/api/v1/transactions/analytics': {
        get: bearerOperation(['Transactions'], 'Get transaction analytics', {
          responses: {
            200: jsonResponse('Analytics fetched')
          }
        })
      },
      '/api/v1/kyc/submit': {
        post: bearerOperation(['KYC'], 'Submit Aadhaar and PAN documents', {
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['aadhaar', 'pan'],
                  properties: {
                    aadhaar: { type: 'string', format: 'binary' },
                    pan: { type: 'string', format: 'binary' }
                  }
                }
              }
            }
          },
          responses: {
            201: jsonResponse('KYC submitted'),
            400: errorResponse('Invalid files')
          }
        })
      },
      '/api/v1/kyc/status': {
        get: bearerOperation(['KYC'], 'Get KYC status', {
          responses: {
            200: jsonResponse('KYC status fetched')
          }
        })
      },
      '/api/v1/split/create': {
        post: bearerOperation(['Split Bills'], 'Create split bill', {
          requestBody: jsonBody({
            type: 'object',
            required: ['title', 'totalAmount', 'splitType', 'participants'],
            properties: {
              title: { type: 'string' },
              totalAmount: { type: 'number' },
              splitType: { type: 'string', enum: ['equal', 'custom'] },
              participants: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['userId'],
                  properties: {
                    userId: { type: 'string' },
                    amount: { type: 'number' }
                  }
                }
              }
            }
          }),
          responses: {
            201: jsonResponse('Split bill created')
          }
        })
      },
      '/api/v1/split': {
        get: bearerOperation(['Split Bills'], 'List active split bills', {
          responses: {
            200: jsonResponse('Active splits fetched')
          }
        })
      },
      '/api/v1/split/{id}/settle': {
        post: bearerOperation(['Split Bills'], 'Settle split share', {
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            200: jsonResponse('Split settled'),
            409: errorResponse('Already settled')
          }
        })
      },
      '/api/v1/schedule': {
        post: bearerOperation(['Scheduled Payments'], 'Create scheduled payment', {
          requestBody: jsonBody({
            type: 'object',
            required: ['recipient', 'amount', 'frequency', 'startDate'],
            properties: {
              recipient: { type: 'string' },
              amount: { type: 'number' },
              frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
              startDate: { type: 'string', format: 'date-time' },
              note: { type: 'string' }
            }
          }),
          responses: {
            201: jsonResponse('Schedule created')
          }
        }),
        get: bearerOperation(['Scheduled Payments'], 'List scheduled payments', {
          responses: {
            200: jsonResponse('Schedules fetched')
          }
        })
      },
      '/api/v1/schedule/{id}': {
        delete: bearerOperation(['Scheduled Payments'], 'Cancel scheduled payment', {
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: {
            200: jsonResponse('Schedule cancelled'),
            404: errorResponse('Schedule not found')
          }
        })
      },
      '/api/v1/notifications': {
        get: bearerOperation(['Notifications'], 'List notifications', {
          parameters: paginationParams,
          responses: {
            200: jsonResponse('Notifications fetched')
          }
        })
      },
      '/api/v1/notifications/read-all': {
        put: bearerOperation(['Notifications'], 'Mark all notifications as read', {
          responses: {
            200: jsonResponse('Notifications marked as read')
          }
        })
      },
      '/api/v1/admin/users': {
        get: bearerOperation(['Admin'], 'Admin list users', {
          parameters: [
            ...paginationParams,
            { in: 'query', name: 'search', schema: { type: 'string' } },
            {
              in: 'query',
              name: 'kycStatus',
              schema: { type: 'string', enum: ['not_submitted', 'pending', 'verified', 'rejected'] }
            }
          ],
          responses: {
            200: jsonResponse('Users fetched'),
            403: errorResponse('Admin access required')
          }
        })
      },
      '/api/v1/admin/transactions': {
        get: bearerOperation(['Admin'], 'Admin list transactions', {
          parameters: [
            ...paginationParams,
            {
              in: 'query',
              name: 'status',
              schema: { type: 'string', enum: ['pending', 'completed', 'failed', 'flagged'] }
            },
            { in: 'query', name: 'flagged', schema: { type: 'boolean' } }
          ],
          responses: {
            200: jsonResponse('Transactions fetched')
          }
        })
      },
      '/api/v1/admin/stats': {
        get: bearerOperation(['Admin'], 'Admin platform stats', {
          responses: {
            200: jsonResponse('Stats fetched')
          }
        })
      },
      '/api/v1/admin/users/{id}/block': {
        put: bearerOperation(['Admin'], 'Block or unblock user', {
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: jsonBody({
            type: 'object',
            required: ['isBlocked'],
            properties: { isBlocked: { type: 'boolean' } }
          }),
          responses: {
            200: jsonResponse('User block status updated')
          }
        })
      },
      '/api/v1/admin/fraud-logs': {
        get: bearerOperation(['Admin'], 'List fraud logs', {
          parameters: paginationParams,
          responses: {
            200: jsonResponse('Fraud logs fetched')
          }
        })
      },
      '/api/v1/admin/kyc/{userId}/approve': {
        put: bearerOperation(['Admin'], 'Approve user KYC', {
          parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }],
          responses: {
            200: jsonResponse('KYC approved')
          }
        })
      },
      '/api/v1/admin/kyc/{userId}/reject': {
        put: bearerOperation(['Admin'], 'Reject user KYC', {
          parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'string' } }],
          requestBody: jsonBody({
            type: 'object',
            properties: { reason: { type: 'string', maxLength: 240 } }
          }),
          responses: {
            200: jsonResponse('KYC rejected')
          }
        })
      },
      '/api/v1/webhooks/razorpay': {
        post: publicOperation(['Webhooks'], 'Razorpay payment webhook', {
          parameters: [
            {
              in: 'header',
              name: 'x-razorpay-signature',
              required: true,
              schema: { type: 'string' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    event: { type: 'string', example: 'payment.captured' },
                    payload: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            200: jsonResponse('Webhook processed'),
            400: errorResponse('Invalid signature')
          }
        })
      }
    }
  },
  apis: []
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
