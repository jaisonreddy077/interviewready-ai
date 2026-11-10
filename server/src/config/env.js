import 'dotenv/config';

export function getConfig() {
  const { MONGODB_URI, JWT_SECRET, PORT = '5000', CLIENT_ORIGIN = 'http://localhost:5173', JWT_EXPIRES_IN = '7d', OPENAI_API_KEY = '', OPENAI_MODEL = 'gpt-4o-mini', NODE_ENV } = process.env;
  if (!MONGODB_URI) throw new Error('MONGODB_URI is required. Set it in server/.env.');
  if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters.');
  if (!/^[1-9]\d*(s|m|h|d)$/.test(JWT_EXPIRES_IN)) throw new Error('JWT_EXPIRES_IN must be a duration such as 7d, 24h, or 30m.');
  const port = Number(PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
  try {
    const origin = new URL(CLIENT_ORIGIN);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== CLIENT_ORIGIN) throw new Error();
  } catch { throw new Error('CLIENT_ORIGIN must be one http or https origin without a trailing slash.'); }
  return { mongoUri: MONGODB_URI, jwtSecret: JWT_SECRET, port, clientOrigin: CLIENT_ORIGIN, jwtExpiresIn: JWT_EXPIRES_IN, openaiApiKey: OPENAI_API_KEY, openaiModel: OPENAI_MODEL, serveClient: NODE_ENV === 'production' };
}
