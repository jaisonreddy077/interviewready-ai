import { randomUUID } from 'node:crypto';

const modes = {
  technical: ['Technical fundamentals', 'Database and SQL', 'Framework-specific', 'Real-world scenarios', 'System design', 'Data structures and algorithms', 'Project-based'],
  coding: ['Programming and coding', 'Data structures and algorithms', 'Database and SQL'],
  hr: ['Behavioral', 'HR interview', 'Project-based'],
  full: null,
};

const difficultyRank = { Beginner: 0, Intermediate: 1, Advanced: 2 };

export function questionsForMode(questions, mode) {
  const allowed = modes[mode];
  if (allowed === undefined) return [];
  return questions.filter((question) => !allowed || allowed.includes(question.category)).map((question) => ({
    id: String(question._id), sourceQuestionId: question._id,
    prompt: question.prompt, category: question.category, difficulty: question.difficulty,
    requirement: question.requirement, requirementArea: question.requirementArea,
    jdExcerpt: question.jdExcerpt || '', isFollowUp: false,
  }));
}

export function chooseNextQuestion(remaining, evaluation, turns) {
  if (!remaining.length) return null;
  const target = !evaluation.assessed ? 1 : evaluation.score >= 80 ? 2 : evaluation.score < 50 ? 0 : 1;
  const usedRequirements = new Set(turns.map((turn) => turn.question.requirement));
  const usedCategories = new Set(turns.map((turn) => turn.question.category));
  return [...remaining].sort((a, b) => {
    const rank = (question) => Math.abs(difficultyRank[question.difficulty] - target) * 4 + (usedRequirements.has(question.requirement) ? 2 : 0) + (usedCategories.has(question.category) ? 1 : 0);
    return rank(a) - rank(b);
  })[0];
}

export function followUpFor(question, evaluation) {
  if (question.isFollowUp || !evaluation.followUpQuestion || evaluation.followUpQuestion.length < 20) return null;
  if (evaluation.assessed && evaluation.score >= 65) return null;
  if (!evaluation.assessed && !evaluation.improvements.some((item) => item.startsWith('Expand your explanation'))) return null;
  return {
    id: randomUUID(), sourceQuestionId: null, prompt: evaluation.followUpQuestion,
    category: question.category, difficulty: question.difficulty,
    requirement: question.requirement, requirementArea: question.requirementArea,
    jdExcerpt: question.jdExcerpt || '', isFollowUp: true,
  };
}
