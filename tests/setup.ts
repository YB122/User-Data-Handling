import { beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';

/**
 * Test environment bootstrap.
 * Env values are injected via vitest.config.ts `test.env`; this file only
 * manages the in-memory MongoDB lifecycle.
 */

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri());
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});