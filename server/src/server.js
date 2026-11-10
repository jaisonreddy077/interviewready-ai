import { getConfig } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { createApp } from './app.js';

async function start() {
  const config = getConfig();
  await connectDatabase(config.mongoUri);
  const server = await new Promise((resolve, reject) => {
    const listener = createApp(config).listen(config.port);
    listener.once('listening', () => {
      listener.off('error', onError);
      resolve(listener);
    });
    function onError(error) { reject(error); }
    listener.once('error', onError);
  });
  console.info(`API listening on http://localhost:${config.port}`);
  process.on('SIGTERM', () => server.close());
  process.on('SIGINT', () => server.close());
}

start().catch((error) => {
  console.error('Failed to start API:', error.code === 'EADDRINUSE' ? 'Port is already in use. Stop the other server or set a different PORT in server/.env.' : error.message);
  process.exitCode = 1;
});
