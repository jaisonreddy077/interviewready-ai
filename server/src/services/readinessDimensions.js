import { createHash } from 'node:crypto';

export const READINESS_DIMENSIONS = [
  { key: 'technical', label: 'Technical Skills', weight: 0.25, categories: ['Technical fundamentals', 'Programming and coding', 'Database and SQL', 'Framework-specific', 'System design', 'Real-world scenarios'], rubric: { technicalCorrectness: 0.4, depth: 0.25, practicalApplicability: 0.2, completeness: 0.15 }, calculation: '40% correctness, 25% depth, 20% practical use, 15% completeness; averaged across distinct technical questions.' },
  { key: 'dsa', label: 'DSA and Problem Solving', weight: 0.20, categories: ['Data structures and algorithms'], rubric: { technicalCorrectness: 0.2, algorithmSelection: 0.2, timeComplexity: 0.15, spaceComplexity: 0.1, edgeCases: 0.1, codeCorrectness: 0.15, depth: 0.1 }, calculation: 'Problem-solving rubric: correctness, algorithm choice, complexity, edge cases, code, and depth; averaged across distinct DSA questions.' },
  { key: 'jdKnowledge', label: 'JD-Specific Knowledge', weight: 0.20, categories: null, rubric: { technicalCorrectness: 0.4, completeness: 0.3, practicalApplicability: 0.2, depth: 0.1 }, calculation: '40% correctness, 30% completeness, 20% practical use, 10% depth; averaged across distinct JD-linked questions.' },
  { key: 'projects', label: 'Project Knowledge', weight: 0.15, categories: ['Project-based', 'Real-world scenarios'], rubric: { practicalApplicability: 0.4, depth: 0.25, completeness: 0.2, clarity: 0.15 }, calculation: '40% practical use, 25% depth, 20% completeness, 15% clarity; averaged across distinct project questions.' },
  { key: 'communication', label: 'Communication Skills', weight: 0.10, categories: null, rubric: { clarity: 1 }, calculation: 'Average clarity score from distinct scored answers.' },
  { key: 'hr', label: 'HR and Behavioral Skills', weight: 0.10, categories: ['Behavioral', 'HR interview'], rubric: { depth: 0.25, practicalApplicability: 0.25, completeness: 0.25, clarity: 0.25 }, calculation: 'Equal weight to depth, practical detail, completeness, and clarity; averaged across distinct HR and behavioral questions.' },
];

export const REQUIRED_EVIDENCE_PER_DIMENSION = 2;

export function questionMatchesDimension(question, dimensionKey) {
  const dimension = READINESS_DIMENSIONS.find((item) => item.key === dimensionKey);
  if (!dimension) return false;
  if (dimension.key === 'jdKnowledge') return Boolean(question.requirement);
  if (dimension.key === 'communication') return true;
  return dimension.categories.includes(question.category);
}

export function questionKey(question, requirement) {
  const normalized = `${question} | ${requirement}`.toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(normalized).digest('hex');
}

export function evidenceFromEvaluation(evaluation) {
  if (!evaluation.assessed || evaluation.source !== 'ai' || !Number.isFinite(evaluation.score)) return [];
  return READINESS_DIMENSIONS.filter((dimension) => questionMatchesDimension(evaluation, dimension.key)).map((dimension) => ({
    dimension: dimension.key,
    score: scoreForDimension(evaluation, dimension),
    questionKey: questionKey(evaluation.question, evaluation.requirement),
    questionId: evaluation.questionId,
    question: evaluation.question,
    category: evaluation.category,
    requirement: evaluation.requirement,
    evaluation: evaluation._id,
    session: evaluation.session,
    assessedAt: evaluation.createdAt,
  })).filter((item) => Number.isFinite(item.score));
}

function scoreForDimension(evaluation, dimension) {
  const entries = Object.entries(dimension.rubric);
  if (entries.every(([field]) => Number.isFinite(evaluation.scores?.[field]))) {
    return Math.round(entries.reduce((sum, [field, weight]) => sum + evaluation.scores[field] * weight, 0));
  }
  return dimension.key === 'communication' ? null : evaluation.score;
}
