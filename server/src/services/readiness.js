import { createHash } from 'node:crypto';
import AnswerEvaluation from '../models/AnswerEvaluation.js';
import SkillAssessment from '../models/SkillAssessment.js';
import ReadinessSnapshot from '../models/ReadinessSnapshot.js';
import { evidenceFromEvaluation, READINESS_DIMENSIONS, REQUIRED_EVIDENCE_PER_DIMENSION } from './readinessDimensions.js';

function levelFor(score) {
  if (score < 40) return 'Needs Preparation';
  if (score < 60) return 'Beginner';
  if (score < 75) return 'Developing';
  if (score < 90) return 'Interview Ready';
  return 'Highly Prepared';
}

export function buildReadiness(assessments, evaluations, boardVersion) {
  const categories = READINESS_DIMENSIONS.map((dimension) => {
    const recent = assessments.filter((item) => item.dimension === dimension.key).sort((a, b) => new Date(b.assessedAt) - new Date(a.assessedAt));
    const byQuestion = new Map();
    for (const item of recent) if (!byQuestion.has(item.questionKey)) byQuestion.set(item.questionKey, item);
    const unique = [...byQuestion.values()];
    const evidenceCount = unique.length;
    const evaluated = evidenceCount >= REQUIRED_EVIDENCE_PER_DIMENSION;
    const score = evaluated ? Math.round(unique.reduce((sum, item) => sum + item.score, 0) / evidenceCount) : null;
    return {
      key: dimension.key, label: dimension.label, weight: dimension.weight,
      status: evaluated ? 'evaluated' : 'not_evaluated', score, evidenceCount,
      requiredEvidence: REQUIRED_EVIDENCE_PER_DIMENSION,
      evidence: unique.slice(0, 8).map((item) => ({
        evaluationId: item.evaluation, sessionId: item.session, question: item.question,
        requirement: item.requirement, category: item.category, score: item.score,
        assessedAt: item.assessedAt,
      })),
      calculation: dimension.calculation,
    };
  });
  const evaluated = categories.filter((item) => item.status === 'evaluated');
  const coveragePercent = Math.round(evaluated.reduce((sum, item) => sum + item.weight, 0) * 100);
  const weightedTotal = evaluated.reduce((sum, item) => sum + item.score * item.weight, 0);
  const observedScore = coveragePercent ? Math.round(weightedTotal / (coveragePercent / 100)) : null;
  const readinessPercent = evaluated.length === READINESS_DIMENSIONS.length ? Math.round(weightedTotal) : null;
  const scored = evaluations.filter((item) => item.assessed && item.source === 'ai' && Number.isFinite(item.score));
  return {
    boardVersion, readinessPercent, level: readinessPercent === null ? null : levelFor(readinessPercent),
    observedScore, coveragePercent, evaluatedCategories: evaluated.length,
    totalCategories: READINESS_DIMENSIONS.length, scoredAnswerCount: scored.length,
    unscoredAnswerCount: evaluations.length - scored.length, categories,
    explanation: readinessPercent === null
      ? 'Overall readiness is withheld until every category has at least two distinct scored questions. Missing evidence is not counted as zero.'
      : 'Overall readiness is the weighted sum of the six evaluated category scores. It estimates preparation, not hiring probability.',
  };
}

function evidenceSignature(evaluations) {
  const scored = evaluations.filter((item) => item.assessed && item.source === 'ai' && Number.isFinite(item.score));
  if (!scored.length) return '';
  return createHash('sha256').update(scored.map((item) => `${item._id}:${item.score}`).sort().join('|')).digest('hex');
}

export async function refreshReadiness(board, userId) {
  const boardVersion = board.assessmentVersion || 1;
  const filter = { user: userId, jobBoard: board._id, boardVersion };
  const evaluations = await AnswerEvaluation.find(filter).sort({ createdAt: 1 }).lean();
  const evidence = evaluations.flatMap(evidenceFromEvaluation);
  if (evidence.length) {
    await SkillAssessment.bulkWrite(evidence.map((item) => ({ updateOne: {
      filter: { evaluation: item.evaluation, dimension: item.dimension },
      update: { $setOnInsert: { ...item, user: userId, jobBoard: board._id, boardVersion } },
      upsert: true,
    } })), { ordered: false });
  }
  const assessments = await SkillAssessment.find(filter).lean();
  const readiness = buildReadiness(assessments, evaluations, boardVersion);
  const signature = evidenceSignature(evaluations);
  if (signature) {
    try {
      await ReadinessSnapshot.updateOne({ jobBoard: board._id, boardVersion, signature }, {
        $setOnInsert: {
          user: userId, jobBoard: board._id, boardVersion, signature,
          readinessPercent: readiness.readinessPercent, observedScore: readiness.observedScore,
          coveragePercent: readiness.coveragePercent, scoredAnswerCount: readiness.scoredAnswerCount,
          categories: readiness.categories.map(({ key, status, score, evidenceCount }) => ({ key, status, score, evidenceCount })),
        },
      }, { upsert: true });
    } catch (error) { if (error.code !== 11000) throw error; }
  }
  const history = (await ReadinessSnapshot.find({ user: userId, jobBoard: board._id, boardVersion }).sort({ createdAt: -1 }).limit(50).select('readinessPercent observedScore coveragePercent scoredAnswerCount categories createdAt').lean()).reverse();
  return { readiness, history };
}
