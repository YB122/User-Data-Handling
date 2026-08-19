import type { Request, Response } from 'express';
import { User } from '../models/user.model.js';
import type { ListQuery } from '../schemas/common.schema.js';
import type { CreateUserInput, UpdateUserInput } from '../schemas/user.schema.js';
import { ApiError } from '../utils/apiError.js';
import { HttpStatus } from '../utils/httpStatus.js';
import { sendSuccess } from '../utils/response.js';
import { toUserView } from '../utils/userView.js';

/** POST /users */
export async function createUser(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateUserInput;

  const existing = await User.exists({ email: input.email });
  if (existing) {
    throw ApiError.conflict('Email already exists');
  }

  const user = await User.create(input);
  sendSuccess(res, HttpStatus.CREATED, toUserView(user));
}

/** GET /users?limit=&offset=&age= */
export async function listUsers(req: Request, res: Response): Promise<void> {
  const { limit, offset, age } = req.validatedQuery as ListQuery;

  const filter: Record<string, unknown> = {};
  if (age !== undefined) filter.age = age;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
    User.countDocuments(filter),
  ]);

  sendSuccess(res, HttpStatus.OK, users.map(toUserView), {
    total,
    limit,
    offset,
  });
}

/** GET /users/:id */
export async function getUserById(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  sendSuccess(res, HttpStatus.OK, toUserView(user));
}

/** PUT /users/:id */
export async function updateUser(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateUserInput;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (input.email !== undefined && input.email !== user.email) {
    // No operator-based queries: compare ids in JS (sanitizeFilter-safe).
    const existing = await User.exists({ email: input.email });
    if (existing && existing._id.toString() !== user.id) {
      throw ApiError.conflict('Email already exists');
    }
  }

  Object.assign(user, input);
  await user.save();

  sendSuccess(res, HttpStatus.OK, toUserView(user));
}

/** DELETE /users/:id */
export async function deleteUser(req: Request, res: Response): Promise<void> {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  res.status(HttpStatus.NO_CONTENT).send();
}