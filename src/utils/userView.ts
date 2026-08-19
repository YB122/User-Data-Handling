import type { UserDocument } from '../models/user.model.js';

export interface UserView {
  id: string;
  name: string;
  email: string;
  age?: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Never leak password hash or internal fields to API consumers. */
export function toUserView(user: UserDocument): UserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    age: user.age,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}