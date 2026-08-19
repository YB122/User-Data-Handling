import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';

async function main(): Promise<void> {
  await connectDB();
  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});