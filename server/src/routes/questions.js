import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { ownedBoard } from '../middleware/ownedBoard.js';
import JobAnalysis from '../models/JobAnalysis.js';
import InterviewQuestion from '../models/InterviewQuestion.js';
import { generateQuestions } from '../services/questionGeneration.js';

export function questionsRouter(config) {
  const router = Router();
  const generateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many generation requests. Please try again later.' } });
  router.use(requireAuth(config.jwtSecret));

  router.get('/:id/questions', async (req, res, next) => {
    try {
      const board = await ownedBoard(req, res);
      if (!board) return;
      const questions = board.questionGenerationId
        ? await InterviewQuestion.find({ jobBoard: board.id, generationId: board.questionGenerationId }).sort({ order: 1 })
        : [];
      res.json({ questions, generation: board.questionGenerationId ? { source: board.questionGenerationSource, note: board.questionGenerationNote, generatedAt: board.questionGeneratedAt } : null });
    } catch (error) { next(error); }
  });

  router.post('/:id/questions/generate', generateLimiter, async (req, res, next) => {
    try {
      if (Object.keys(req.body || {}).length) return res.status(400).json({ error: 'This endpoint does not accept request fields.' });
      const board = await ownedBoard(req, res);
      if (!board) return;
      const analysis = await JobAnalysis.findOne({ jobBoard: board.id });
      if (!analysis) return res.status(409).json({ error: 'Analyze this job description before generating questions.' });
      const generated = await generateQuestions({ analysis, job: board, apiKey: config.openaiApiKey, model: config.openaiModel });
      if (!generated.questions.length) return res.status(422).json({ error: generated.note });
      const generationId = randomUUID();
      const questions = await InterviewQuestion.insertMany(generated.questions.map((question, order) => ({ ...question, jobBoard: board.id, generationId, source: generated.source, order })));
      try {
        board.questionGenerationId = generationId;
        board.questionGenerationSource = generated.source;
        board.questionGenerationNote = generated.note;
        board.questionGeneratedAt = new Date();
        await board.save();
      } catch (error) {
        await InterviewQuestion.deleteMany({ jobBoard: board.id, generationId });
        throw error;
      }
      await InterviewQuestion.deleteMany({ jobBoard: board.id, generationId: { $ne: generationId } });
      res.status(201).json({ questions, generation: { source: generated.source, note: generated.note, generatedAt: board.questionGeneratedAt } });
    } catch (error) { next(error); }
  });

  return router;
}
