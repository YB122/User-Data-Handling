import mongoose, { Schema, type Model } from 'mongoose';
import { hashPassword } from '../utils/password.js';

export interface IUser {
  name: string;
  email: string;
  age?: number;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = mongoose.HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
    },
    age: {
      type: Number,
      min: 0,
      max: 150,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      maxlength: [72, 'Password cannot exceed 72 characters (bcrypt limit)'],
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

/** Email uniqueness is enforced at the DB level (unique index) plus application-level checks. */
userSchema.index({ email: 1 }, { unique: true });
/** Index for the optional age filter on GET /users. */
userSchema.index({ age: 1 });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await hashPassword(this.password);
});

export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);