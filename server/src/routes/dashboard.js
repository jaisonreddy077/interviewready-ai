import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import JobBoard from '../models/JobBoard.js';
import JobAnalysis from '../models/JobAnalysis.js';
import InterviewQuestion from '../models/InterviewQuestion.js';
import InterviewSession from '../models/InterviewSession.js';
import AnswerEvaluation from '../models/AnswerEvaluation.js';
import ReadinessSnapshot from '../models/ReadinessSnapshot.js';
import PreparationRoadmap from '../models/PreparationRoadmap.js';
import SkillAssessment from '../models/SkillAssessment.js';
import { refreshReadiness } from '../services/readiness.js';

export function dashboardRouter(config) {
  const router = Router();
  router.use(requireAuth(config.jwtSecret));
  router.get('/overview', async (req, res, next) => {
    try {
      const jobs = await JobBoard.find({ user: req.user.id }).sort({ updatedAt: -1 }).lean();
      if (req.query.jobId && (!mongoose.isValidObjectId(req.query.jobId) || !jobs.some((job) => String(job._id) === req.query.jobId))) return res.status(404).json({ error: 'Job board not found.' });
      const selected = jobs.find((job) => String(job._id) === req.query.jobId) || jobs[0];
      const [analyses, snapshots] = await Promise.all([
        JobAnalysis.find({ jobBoard: { $in: jobs.map((job) => job._id) } }).select('jobBoard').lean(),
        ReadinessSnapshot.find({ user: req.user.id, jobBoard: { $in: jobs.map((job) => job._id) } }).sort({ createdAt: -1 }).select('jobBoard boardVersion readinessPercent coveragePercent').lean(),
      ]);
      const analyzed = new Set(analyses.map((analysis) => String(analysis.jobBoard)));
      const latest = new Map();
      for (const snapshot of snapshots) {
        const board = jobs.find((job) => String(job._id) === String(snapshot.jobBoard));
        if (board && snapshot.boardVersion === (board.assessmentVersion || 1) && !latest.has(String(board._id))) latest.set(String(board._id), snapshot);
      }
      const boards = jobs.map((job) => ({
        id: String(job._id), company: job.company, role: job.role, experienceLevel: job.experienceLevel,
        analyzed: analyzed.has(String(job._id)),
        readinessPercent: latest.get(String(job._id))?.readinessPercent ?? null,
        coveragePercent: latest.get(String(job._id))?.coveragePercent ?? 0,
      }));
      if (!selected) return res.json({ boards, selected: null });
      const filter = { user: req.user.id, jobBoard: selected._id, boardVersion: selected.assessmentVersion || 1 };
      const [{ readiness, history }, questions, evaluations, sessions, roadmap, skillAssessments] = await Promise.all([
        refreshReadiness(selected, req.user.id),
        selected.questionGenerationId ? InterviewQuestion.find({ jobBoard: selected._id, generationId: selected.questionGenerationId }).select('_id').lean() : [],
        AnswerEvaluation.find(filter).select('questionId source assessed score createdAt').lean(),
        InterviewSession.find(filter).sort({ createdAt: -1 }).limit(5).select('mode status turns createdAt completedAt').lean(),
        PreparationRoadmap.findOne(filter).select('tasks generatedAt').lean(),
        SkillAssessment.find({ ...filter, dimension: 'jdKnowledge' }).sort({ assessedAt: -1 }).select('requirement questionKey score assessedAt').lean(),
      ]);
      const answeredIds = new Set(evaluations.map((item) => item.questionId));
      const pendingQuestionCount = questions.filter((item) => !answeredIds.has(String(item._id))).length;
      const uniqueSkillQuestions = new Set();
      const skillGroups = new Map();
      for (const item of skillAssessments) {
        const name = item.requirement.trim();
        const key = name.toLowerCase();
        if (uniqueSkillQuestions.has(`${key}:${item.questionKey}`)) continue;
        uniqueSkillQuestions.add(`${key}:${item.questionKey}`);
        if (!skillGroups.has(key)) skillGroups.set(key, { name, scores: [] });
        skillGroups.get(key).scores.push(item.score);
      }
      const rankedSkills = [...skillGroups.values()].map(({ name, scores }) => ({ name, score: Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length), evidenceCount: scores.length })).sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
      const selectedBoard = { ...boards.find((board) => board.id === String(selected._id)), readinessPercent: readiness.readinessPercent, coveragePercent: readiness.coveragePercent };
      res.json({
        boards: boards.map((board) => board.id === selectedBoard.id ? selectedBoard : board),
        selected: {
          job: selectedBoard, readiness, history,
          strongestSkills: [...rankedSkills].reverse().slice(0, 3),
          weakestSkills: rankedSkills.slice(0, 3),
          completedQuestions: evaluations.length,
          scoredQuestions: evaluations.filter((item) => item.assessed && item.source === 'ai').length,
          pendingQuestionCount,
          pendingCategories: readiness.categories.filter((category) => category.status !== 'evaluated').map(({ key, label, evidenceCount, requiredEvidence }) => ({ key, label, evidenceCount, requiredEvidence })),
          recentInterviews: sessions.map((session) => ({ id: String(session._id), mode: session.mode, status: session.status, answeredCount: session.turns.length, createdAt: session.createdAt, completedAt: session.completedAt })),
          roadmap: roadmap ? { total: roadmap.tasks.length, completed: roadmap.tasks.filter((task) => task.completed).length, generatedAt: roadmap.generatedAt } : null,
        },
      });
    } catch (error) { next(error); }
  });
  return router;
}
