import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
}).strict();
const loginSchema = registerSchema.pick({ email: true, password: true });

function issueToken(user, config) {
  return jwt.sign({ sub: user.id }, config.jwtSecret, { algorithm: 'HS256', expiresIn: config.jwtExpiresIn });
}

function parseBody(schema, body, res) {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: 'Please check the submitted fields.', details: result.error.flatten().fieldErrors });
    return null;
  }
  return result.data;
}

export function authRouter(config) {
  const router = Router();
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many attempts. Please try again later.' } });

  router.post('/register', authLimiter, async (req, res, next) => {
    try {
      const data = parseBody(registerSchema, req.body, res);
      if (!data) return;
      const existing = await User.exists({ email: data.email });
      if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });
      const passwordHash = await bcrypt.hash(data.password, 12);
      const user = await User.create({ name: data.name, email: data.email, passwordHash });
      return res.status(201).json({ token: issueToken(user, config), user: user.toPublicJSON() });
    } catch (error) { next(error); }
  });

  router.post('/login', authLimiter, async (req, res, next) => {
    try {
      const data = parseBody(loginSchema, req.body, res);
      if (!data) return;
      const user = await User.findOne({ email: data.email }).select('+passwordHash');
      const valid = user && await bcrypt.compare(data.password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });
      return res.json({ token: issueToken(user, config), user: user.toPublicJSON() });
    } catch (error) { next(error); }
  });

  router.get('/me', requireAuth(config.jwtSecret), (req, res) => res.json({ user: req.user.toPublicJSON() }));
  return router;
}
