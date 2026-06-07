import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLog {
  userId?: Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: string;
  severity: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
  reasons: string[];
  fraudScore?: number;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: Date;
  updatedAt: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;

const auditLogSchema = new Schema<AuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    entityId: {
      type: String,
      trim: true,
      index: true
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      required: true,
      index: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    reasons: {
      type: [String],
      default: []
    },
    fraudScore: {
      type: Number,
      min: 0,
      max: 100
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

export const AuditLogModel = model<AuditLog>('AuditLog', auditLogSchema);
