import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { authRouter } from './routes/auth.js';
import { jobsRouter } from './routes/jobs.js';
import { questionsRouter } from './routes/questions.js';
import { interviewsRouter } from './routes/interviews.js';
import { readinessRouter, assessmentRouter } from './routes/readiness.js';
import { jobRoadmapRouter, roadmapRouter } from './routes/roadmap.js';
import { dashboardRouter } from './routes/dashboard.js';
import { handleError, notFound } from './middleware/error.js';

const clientDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../client/dist');

export function createApp(config) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: '100kb' }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRouter(config));
  app.use('/api/jobs', jobsRouter(config));
  app.use('/api/jobs', questionsRouter(config));
  app.use('/api/jobs', readinessRouter(config));
  app.use('/api/jobs', jobRoadmapRouter(config));
  app.use('/api/interviews', interviewsRouter(config));
  app.use('/api/assessment', assessmentRouter(config));
  app.use('/api/roadmap', roadmapRouter(config));
  app.use('/api/dashboard', dashboardRouter(config));
  app.use('/api', notFound);
  if (config.serveClient) {
    app.use(express.static(clientDist, { index: false, immutable: true, maxAge: '1y' }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/assets/') || !req.accepts('html')) return next();
      res.set('Cache-Control', 'no-store');
      res.sendFile(join(clientDist, 'index.html'));
    });
  }
  app.use(notFound);
  app.use(handleError);
  return app;
}
