import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import JobBoard from '../models/JobBoard.js';
import InterviewQuestion from '../models/InterviewQuestion.js';
import InterviewSession, { INTERVIEW_MODES } from '../models/InterviewSession.js';
import AnswerEvaluation from '../models/AnswerEvaluation.js';
import { evaluateAnswer } from '../services/answerEvaluation.js';
import { chooseNextQuestion, followUpFor, questionsForMode } from '../services/interviewFlow.js';
import { READINESS_DIMENSIONS, questionKey, questionMatchesDimension } from '../services/readinessDimensions.js';
import SkillAssessment from '../models/SkillAssessment.js';
import { refreshReadiness } from '../services/readiness.js';

const startSchema = z.object({
  jobId: z.string().refine(mongoose.isValidObjectId, 'Invalid job board.'),
  mode: z.enum(INTERVIEW_MODES),
  questionCount: z.union([z.literal(2), z.literal(5), z.literal(10)]).default(5),
  dimension: z.enum(READINESS_DIMENSIONS.map((item) => item.key)).optional(),
}).strict().superRefine((data, ctx) => {
  if (data.mode === 'challenge' && (!data.dimension || data.questionCount !== 2)) ctx.addIssue({ code: 'custom', path: ['dimension'], message: 'A challenge requires a dimension and two questions.' });
  if (data.mode !== 'challenge' && (data.dimension || data.questionCount === 2)) ctx.addIssue({ code: 'custom', path: ['mode'], message: 'Two-question challenges require challenge mode.' });
});
const answerSchema = z.object({ questionId: z.string().min(1).max(64), answer: z.string().trim().min(20).max(10000) }).strict();

function parse(schema, body, res) {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  res.status(400).json({ error: 'Please check the submitted fields.', details: result.error.flatten().fieldErrors });
  return null;
}

function publicSession(session) {
  return {
    id: session.id, jobBoard: session.jobBoard, jobSnapshot: session.jobSnapshot,
    boardVersion: session.boardVersion, mode: session.mode, status: session.status,
    challengeDimension: session.challengeDimension, challengeBeforeScore: session.challengeBeforeScore,
    challengeBeforeEvidenceCount: session.challengeBeforeEvidenceCount,
    questionCount: session.questionCount, answeredCount: session.turns.length,
    currentQuestion: session.currentQuestion, createdAt: session.createdAt,
    completedAt: session.completedAt,
  };
}

export function interviewsRouter(config) {
  const router = Router();
  const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many interview requests. Please try again later.' } });
  router.use(requireAuth(config.jwtSecret));

  router.post('/start', aiLimiter, async (req, res, next) => {
    try {
      const data = parse(startSchema, req.body, res);
      if (!data) return;
      const board = await JobBoard.findOne({ _id: data.jobId, user: req.user.id });
      if (!board) return res.status(404).json({ error: 'Job board not found.' });
      if (!board.questionGenerationId) return res.status(409).json({ error: 'Generate a question bank for this job before starting an interview.' });
      const bank = await InterviewQuestion.find({ jobBoard: board.id, generationId: board.questionGenerationId }).sort({ order: 1 });
      let pool = data.mode === 'challenge'
        ? questionsForMode(bank.filter((question) => questionMatchesDimension(question, data.dimension)), 'full')
        : questionsForMode(bank, data.mode);
      if (!pool.length) return res.status(409).json({ error: 'No questions match this interview mode. Add relevant JD requirements and regenerate questions.' });
      if (data.mode === 'challenge') {
        pool = [...new Map(pool.map((question) => [questionKey(question.prompt, question.requirement), question])).values()];
        if (pool.length < 2) return res.status(409).json({ error: 'This category needs two distinct bank questions for a challenge. Add relevant JD requirements and regenerate questions.' });
      }
      let challengeBeforeScore = null;
      let challengeBeforeEvidenceCount = null;
      if (data.mode === 'challenge') {
        const { readiness } = await refreshReadiness(board, req.user.id);
        const current = readiness.categories.find((item) => item.key === data.dimension);
        challengeBeforeScore = current.score;
        challengeBeforeEvidenceCount = current.evidenceCount;
        const previous = await SkillAssessment.find({ user: req.user.id, jobBoard: board.id, boardVersion: board.assessmentVersion || 1, dimension: data.dimension }).sort({ assessedAt: -1 });
        const byQuestion = new Map();
        for (const item of previous) if (!byQuestion.has(item.questionKey)) byQuestion.set(item.questionKey, item.score);
        pool = pool.map((question, index) => ({ question, index, priorScore: byQuestion.get(questionKey(question.prompt, question.requirement)) }))
          .sort((a, b) => {
            if (a.priorScore === undefined && b.priorScore !== undefined) return -1;
            if (b.priorScore === undefined && a.priorScore !== undefined) return 1;
            return (a.priorScore ?? 0) - (b.priorScore ?? 0) || a.index - b.index;
          })
          .map((item) => item.question);
      }
      const first = data.mode === 'challenge' ? pool[0] : (pool.find((question) => question.difficulty === 'Beginner') || pool[0]);
      const session = await InterviewSession.create({
        user: req.user.id, jobBoard: board.id, boardVersion: board.assessmentVersion || 1,
        jobSnapshot: { company: board.company, role: board.role },
        mode: data.mode, challengeDimension: data.dimension || null,
        challengeBeforeScore, challengeBeforeEvidenceCount,
        questionCount: Math.min(data.questionCount, pool.length),
        currentQuestion: first, remainingQuestions: pool.filter((question) => question.id !== first.id),
      });
      return res.status(201).json({ session: publicSession(session) });
    } catch (error) { next(error); }
  });

  router.get('/history', async (req, res, next) => {
    try {
      const filter = { user: req.user.id };
      if (req.query.jobId) {
        if (!mongoose.isValidObjectId(req.query.jobId)) return res.status(400).json({ error: 'Invalid job board ID.' });
        filter.jobBoard = req.query.jobId;
      }
      const sessions = await InterviewSession.find(filter).sort({ createdAt: -1 }).limit(50);
      res.json({ sessions: sessions.map(publicSession) });
    } catch (error) { next(error); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Interview not found.' });
      const session = await InterviewSession.findOne({ _id: req.params.id, user: req.user.id });
      if (!session) return res.status(404).json({ error: 'Interview not found.' });
      const evaluations = await AnswerEvaluation.find({ session: session.id, user: req.user.id }).sort({ createdAt: 1 });
      res.json({ session: publicSession(session), evaluations });
    } catch (error) { next(error); }
  });

  router.post('/:id/answer', aiLimiter, async (req, res, next) => {
    let evaluationDocument;
    let lockedSession;
    try {
      const data = parse(answerSchema, req.body, res);
      if (!data) return;
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Interview not found.' });
      lockedSession = await InterviewSession.findOneAndUpdate({
        _id: req.params.id, user: req.user.id, status: 'active', 'currentQuestion.id': data.questionId,
        $or: [{ processing: false }, { processingStartedAt: { $lt: new Date(Date.now() - 2 * 60 * 1000) } }],
      }, { $set: { processing: true, processingStartedAt: new Date() } }, { new: true });
      if (!lockedSession) {
        const exists = await InterviewSession.exists({ _id: req.params.id, user: req.user.id });
        return res.status(exists ? 409 : 404).json({ error: exists ? 'This question changed or is already being evaluated. Refresh the interview.' : 'Interview not found.' });
      }
      const board = await JobBoard.findOne({ _id: lockedSession.jobBoard, user: req.user.id });
      if (!board || (board.assessmentVersion || 1) !== lockedSession.boardVersion) {
        lockedSession.status = 'completed';
        lockedSession.currentQuestion = null;
        lockedSession.completedAt = new Date();
        lockedSession.processing = false;
        lockedSession.processingStartedAt = null;
        await lockedSession.save();
        lockedSession = null;
        return res.status(409).json({ error: 'The job description changed. Start a new interview for the updated board.' });
      }
      const question = lockedSession.currentQuestion.toObject();
      const evaluation = await evaluateAnswer({ question, answer: data.answer, job: board, apiKey: config.openaiApiKey, model: config.openaiModel });
      evaluationDocument = await AnswerEvaluation.create({
        ...evaluation, user: req.user.id, jobBoard: board.id, boardVersion: lockedSession.boardVersion,
        session: lockedSession.id, mode: lockedSession.mode, questionId: question.id,
        question: question.prompt, category: question.category, difficulty: question.difficulty,
        requirement: question.requirement, requirementArea: question.requirementArea, answer: data.answer,
      });
      lockedSession.turns.push({ question, evaluation: evaluationDocument.id, answeredAt: new Date() });
      let nextQuestion = null;
      if (lockedSession.turns.length < lockedSession.questionCount) {
        nextQuestion = lockedSession.mode === 'challenge'
          ? lockedSession.remainingQuestions[0]
          : followUpFor(question, evaluation) || chooseNextQuestion(lockedSession.remainingQuestions, evaluation, lockedSession.turns);
      }
      if (nextQuestion) {
        lockedSession.currentQuestion = nextQuestion;
        lockedSession.remainingQuestions = lockedSession.remainingQuestions.filter((item) => item.id !== nextQuestion.id);
      } else {
        lockedSession.status = 'completed';
        lockedSession.currentQuestion = null;
        lockedSession.completedAt = new Date();
      }
      lockedSession.processing = false;
      lockedSession.processingStartedAt = null;
      await lockedSession.save();
      if (evaluationDocument.assessed) {
        try { await refreshReadiness(board, req.user.id); }
        catch (readinessError) { console.error('Could not refresh readiness:', readinessError); }
      }
      res.json({ session: publicSession(lockedSession), evaluation: evaluationDocument });
      lockedSession = null;
      evaluationDocument = null;
    } catch (error) {
      if (evaluationDocument) await AnswerEvaluation.deleteOne({ _id: evaluationDocument.id });
      if (lockedSession) await InterviewSession.updateOne({ _id: lockedSession.id }, { $set: { processing: false, processingStartedAt: null } });
      next(error);
    }
  });

  router.post('/:id/complete', async (req, res, next) => {
    try {
      if (Object.keys(req.body || {}).length) return res.status(400).json({ error: 'This endpoint does not accept request fields.' });
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Interview not found.' });
      const session = await InterviewSession.findOneAndUpdate({ _id: req.params.id, user: req.user.id, status: 'active', processing: false }, { $set: { status: 'completed', currentQuestion: null, completedAt: new Date() } }, { new: true });
      if (!session) {
        const exists = await InterviewSession.exists({ _id: req.params.id, user: req.user.id });
        return res.status(exists ? 409 : 404).json({ error: exists ? 'Interview is already completed or being evaluated.' : 'Interview not found.' });
      }
      res.json({ session: publicSession(session) });
    } catch (error) { next(error); }
  });

  return router;
}
