import bcrypt from 'bcrypt';
import { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import { env } from '../config/env.js';
import type { KycStatus, KycTier, UserRole } from '../types/auth.js';

export interface User {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  isEmailVerified: boolean;
  isBlocked: boolean;
  kycStatus: KycStatus;
  kycTier: KycTier;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserDocument = HydratedDocument<User, UserMethods>;
type UserModel = Model<User, object, UserMethods>;

const userSchema = new Schema<User, UserModel, UserMethods>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    isBlocked: {
      type: Boolean,
      default: false,
      index: true
    },
    kycStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'verified', 'rejected'],
      default: 'not_submitted',
      index: true
    },
    kycTier: {
      type: String,
      enum: ['unverified', 'verified'],
      default: 'unverified'
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    next();
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function comparePassword(
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.pre('save', function assignAdminRole(next) {
  if (this.email === env.ADMIN_EMAIL.toLowerCase()) {
    this.role = 'admin';
  }

  next();
});

export const UserModel = model<User, UserModel>('User', userSchema);
