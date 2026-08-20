/**
 * Dev helper: issues a valid JWT for testing the protected /api/users
 * endpoints (there is no register/login endpoint anymore).
 *
 * Usage: npm run token -- <email>   (defaults to dev@example.com)
 * The user is created on first run so the token references a real document.
 * Requires MONGODB_URI + JWT_SECRET from .env.
 */
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/user.model.js';
import { signToken } from '../src/utils/jwt.js';

async function main(): Promise<void> {
  await connectDB();

  const email = (process.argv[2] ?? 'dev@example.com').toLowerCase();
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: 'Dev User',
      email,
      password: 'dev-password-123',
    });
  }

  // eslint-disable-next-line no-console
  console.log(signToken(user.id));

  await disconnectDB();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to generate token:', err);
  process.exit(1);
});