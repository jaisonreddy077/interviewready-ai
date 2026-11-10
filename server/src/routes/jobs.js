import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import JobBoard from '../models/JobBoard.js';
import JobAnalysis from '../models/JobAnalysis.js';
import InterviewQuestion from '../models/InterviewQuestion.js';
import InterviewSession from '../models/InterviewSession.js';
import AnswerEvaluation from '../models/AnswerEvaluation.js';
import SkillAssessment from '../models/SkillAssessment.js';
import ReadinessSnapshot from '../models/ReadinessSnapshot.js';
import PreparationRoadmap from '../models/PreparationRoadmap.js';
import { requireAuth } from '../middleware/auth.js';
import { ownedBoard } from '../middleware/ownedBoard.js';
import { extractPdfText } from '../services/pdf.js';
import { analyzeJobDescription } from '../services/jdAnalysis.js';

const boardSchema = z.object({
  company: z.string().trim().min(2).max(120),
  role: z.string().trim().min(2).max(120),
  experienceLevel: z.enum(['Internship', 'Entry level', 'Mid level', 'Senior']),
  jdText: z.string().trim().max(20000).optional().default(''),
}).strict();
const updateSchema = boardSchema.partial().refine((data) => Object.keys(data).length > 0);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      const error = new Error('Only PDF files are supported.');
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  },
}).single('file');

function parse(schema, body, res) {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  res.status(400).json({ error: 'Please check the submitted fields.', details: result.error.flatten().fieldErrors });
  return null;
}

export function jobsRouter(config) {
  const router = Router();
  const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many analyses. Please try again later.' } });
  router.use(requireAuth(config.jwtSecret));

  router.post('/', upload, async (req, res, next) => {
    try {
      const data = parse(boardSchema, req.body, res);
      if (!data) return;
      const jdText = req.file ? await extractPdfText(req.file) : data.jdText;
      const job = await JobBoard.create({ ...data, jdText, jdFilename: req.file?.originalname || '', user: req.user.id });
      res.status(201).json({ job });
    } catch (error) { next(error); }
  });

  router.get('/', async (req, res, next) => {
    try {
      const jobs = await JobBoard.find({ user: req.user.id }).sort({ updatedAt: -1 }).lean();
      const analyses = await JobAnalysis.find({ jobBoard: { $in: jobs.map((job) => job._id) } }).select('jobBoard source updatedAt').lean();
      const byJob = new Map(analyses.map((analysis) => [String(analysis.jobBoard), analysis]));
      res.json({ jobs: jobs.map((job) => ({ ...job, analysis: byJob.get(String(job._id)) || null })) });
    } catch (error) { next(error); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const job = await ownedBoard(req, res);
      if (!job) return;
      const analysis = await JobAnalysis.findOne({ jobBoard: job.id });
      res.json({ job, analysis });
    } catch (error) { next(error); }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const data = parse(updateSchema, req.body, res);
      if (!data) return;
      const job = await ownedBoard(req, res);
      if (!job) return;
      const jdChanged = data.jdText !== undefined && data.jdText !== job.jdText;
      const analysisInvalidated = jdChanged || (data.role !== undefined && data.role !== job.role) || (data.company !== undefined && data.company !== job.company) || (data.experienceLevel !== undefined && data.experienceLevel !== job.experienceLevel);
      Object.assign(job, data);
      if (jdChanged) job.jdFilename = '';
      if (analysisInvalidated) {
        job.assessmentVersion = (job.assessmentVersion || 1) + 1;
        job.questionGenerationId = '';
        job.questionGenerationSource = '';
        job.questionGenerationNote = '';
        job.questionGeneratedAt = null;
      }
      await job.save();
      if (analysisInvalidated) {
        await JobAnalysis.deleteOne({ jobBoard: job.id });
        await InterviewQuestion.deleteMany({ jobBoard: job.id });
      }
      res.json({ job, analysisInvalidated });
    } catch (error) { next(error); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const job = await ownedBoard(req, res);
      if (!job) return;
      await JobAnalysis.deleteOne({ jobBoard: job.id });
      await InterviewQuestion.deleteMany({ jobBoard: job.id });
      await AnswerEvaluation.deleteMany({ jobBoard: job.id, user: req.user.id });
      await InterviewSession.deleteMany({ jobBoard: job.id, user: req.user.id });
      await SkillAssessment.deleteMany({ jobBoard: job.id, user: req.user.id });
      await ReadinessSnapshot.deleteMany({ jobBoard: job.id, user: req.user.id });
      await PreparationRoadmap.deleteMany({ jobBoard: job.id, user: req.user.id });
      await job.deleteOne();
      res.status(204).end();
    } catch (error) { next(error); }
  });

  router.post('/:id/analyze', aiLimiter, upload, async (req, res, next) => {
    try {
      const job = await ownedBoard(req, res);
      if (!job) return;
      const suppliedText = req.body.jdText;
      if (suppliedText !== undefined && typeof suppliedText !== 'string') return res.status(400).json({ error: 'Job description must be text.' });
      const jdText = req.file ? await extractPdfText(req.file) : (suppliedText?.trim() || job.jdText);
      if (jdText.length < 30 || jdText.length > 20000) return res.status(400).json({ error: 'Job description must be between 30 and 20,000 characters.' });
      const data = await analyzeJobDescription({ jdText, role: job.role, company: job.company, apiKey: config.openaiApiKey, model: config.openaiModel });
      const analysis = await JobAnalysis.findOneAndUpdate({ jobBoard: job.id }, { $set: data }, { upsert: true, new: true, runValidators: true });
      job.assessmentVersion = (job.assessmentVersion || 1) + 1;
      job.questionGenerationId = '';
      job.questionGenerationSource = '';
      job.questionGenerationNote = '';
      job.questionGeneratedAt = null;
      await InterviewQuestion.deleteMany({ jobBoard: job.id });
      if (jdText !== job.jdText) {
        job.jdText = jdText;
        job.jdFilename = req.file?.originalname || '';
      }
      await job.save();
      res.json({ analysis });
    } catch (error) { next(error); }
  });

  return router;
}
