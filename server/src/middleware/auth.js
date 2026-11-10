import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function requireAuth(secret) {
  return async (req, res, next) => {
    const match = /^Bearer (.+)$/i.exec(req.get('authorization') || '');
    if (!match) return res.status(401).json({ error: 'Authentication required.' });
    try {
      const payload = jwt.verify(match[1], secret, { algorithms: ['HS256'] });
      const user = await User.findById(payload.sub);
      if (!user) return res.status(401).json({ error: 'Session is no longer valid.' });
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ error: 'Session is invalid or expired.' });
    }
  };
}
