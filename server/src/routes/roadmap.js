import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { ownedBoard } from '../middleware/ownedBoard.js';
import JobAnalysis from '../models/JobAnalysis.js';
import JobBoard from '../models/JobBoard.js';
import PreparationRoadmap from '../models/PreparationRoadmap.js';
import SkillAssessment from '../models/SkillAssessment.js';
import { refreshReadiness } from '../services/readiness.js';
import { buildRoadmapTasks, roadmapSummary } from '../services/roadmap.js';

function response(board, roadmap) {
  return { job: { id: board.id, company: board.company, role: board.role, assessmentVersion: board.assessmentVersion || 1 }, roadmap, progress: roadmap ? roadmapSummary(roadmap) : null };
}

export function jobRoadmapRouter(config) {
  const router = Router();
  router.use(requireAuth(config.jwtSecret));
  router.get('/:id/roadmap', async (req, res, next) => {
    try {
      const board = await ownedBoard(req, res);
      if (!board) return;
      const roadmap = await PreparationRoadmap.findOne({ user: req.user.id, jobBoard: board.id, boardVersion: board.assessmentVersion || 1 });
      res.json(response(board, roadmap));
    } catch (error) { next(error); }
  });
  router.post('/:id/roadmap', async (req, res, next) => {
    try {
      if (Object.keys(req.body || {}).length) return res.status(400).json({ error: 'Roadmap generation does not accept request fields.' });
      const board = await ownedBoard(req, res);
      if (!board) return;
      const analysis = await JobAnalysis.findOne({ jobBoard: board.id });
      if (!analysis) return res.status(409).json({ error: 'Analyze this job description before generating a roadmap.' });
      await refreshReadiness(board, req.user.id);
      const filter = { user: req.user.id, jobBoard: board.id, boardVersion: board.assessmentVersion || 1 };
      const existing = await PreparationRoadmap.findOne(filter);
      const assessments = await SkillAssessment.find(filter).lean();
      const tasks = buildRoadmapTasks(analysis, assessments, existing?.tasks || []);
      if (!tasks.length) return res.status(409).json({ error: 'The job analysis has no actionable requirements yet. Add more detail to the JD and analyze it again.' });
      const roadmap = await PreparationRoadmap.findOneAndUpdate(filter, { $set: { tasks, generatedAt: new Date() } }, { upsert: true, new: true, runValidators: true });
      res.status(existing ? 200 : 201).json(response(board, roadmap));
    } catch (error) { next(error); }
  });
  return router;
}

const updateSchema = z.object({ taskId: z.string().refine(mongoose.isValidObjectId), completed: z.boolean() }).strict();

export function roadmapRouter(config) {
  const router = Router();
  router.use(requireAuth(config.jwtSecret));
  router.put('/:id', async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Roadmap not found.' });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Choose a task and completion status.' });
      const roadmap = await PreparationRoadmap.findOne({ _id: req.params.id, user: req.user.id });
      if (!roadmap) return res.status(404).json({ error: 'Roadmap not found.' });
      const board = await JobBoard.findOne({ _id: roadmap.jobBoard, user: req.user.id });
      if (!board || (board.assessmentVersion || 1) !== roadmap.boardVersion) return res.status(409).json({ error: 'This roadmap belongs to an earlier job description. Generate a new roadmap for the current board.' });
      const task = roadmap.tasks.id(parsed.data.taskId);
      if (!task) return res.status(404).json({ error: 'Roadmap task not found.' });
      task.completed = parsed.data.completed;
      task.completedAt = parsed.data.completed ? new Date() : null;
      await roadmap.save();
      res.json(response(board, roadmap));
    } catch (error) { next(error); }
  });
  return router;
}
