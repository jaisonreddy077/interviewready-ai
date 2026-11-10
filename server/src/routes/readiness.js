import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { ownedBoard } from '../middleware/ownedBoard.js';
import InterviewQuestion from '../models/InterviewQuestion.js';
import InterviewSession from '../models/InterviewSession.js';
import JobBoard from '../models/JobBoard.js';
import { refreshReadiness } from '../services/readiness.js';
import { questionKey, questionMatchesDimension } from '../services/readinessDimensions.js';

export function readinessRouter(config) {
  const router = Router();
  router.use(requireAuth(config.jwtSecret));
  router.get('/:id/readiness', async (req, res, next) => {
    try {
      const board = await ownedBoard(req, res);
      if (!board) return;
      const { readiness, history } = await refreshReadiness(board, req.user.id);
      const bank = board.questionGenerationId
        ? await InterviewQuestion.find({ jobBoard: board.id, generationId: board.questionGenerationId }).select('category requirement prompt').lean()
        : [];
      readiness.categories = readiness.categories.map((category) => ({
        ...category,
        availableQuestions: new Set(bank.filter((question) => questionMatchesDimension(question, category.key)).map((question) => questionKey(question.prompt, question.requirement))).size,
      }));
      res.json({ job: { id: board.id, company: board.company, role: board.role, assessmentVersion: board.assessmentVersion || 1 }, scoringAvailable: Boolean(config.openaiApiKey), readiness, history });
    } catch (error) { next(error); }
  });
  return router;
}

const submitSchema = z.object({ sessionId: z.string().refine(mongoose.isValidObjectId, 'Invalid interview.') }).strict();

export function assessmentRouter(config) {
  const router = Router();
  router.use(requireAuth(config.jwtSecret));
  router.post('/submit', async (req, res, next) => {
    try {
      const parsed = submitSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'A valid completed interview is required.' });
      const session = await InterviewSession.findOne({ _id: parsed.data.sessionId, user: req.user.id });
      if (!session) return res.status(404).json({ error: 'Interview not found.' });
      if (session.status !== 'completed') return res.status(409).json({ error: 'Finish the interview before submitting its assessment.' });
      const board = await JobBoard.findOne({ _id: session.jobBoard, user: req.user.id });
      if (!board) return res.status(404).json({ error: 'Job board not found.' });
      if ((board.assessmentVersion || 1) !== session.boardVersion) return res.status(409).json({ error: 'This interview belongs to an earlier version of the job description.' });
      const result = await refreshReadiness(board, req.user.id);
      res.json(result);
    } catch (error) { next(error); }
  });
  return router;
}
