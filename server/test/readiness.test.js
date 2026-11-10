import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReadiness } from '../src/services/readiness.js';
import { evidenceFromEvaluation, READINESS_DIMENSIONS } from '../src/services/readinessDimensions.js';

function evidence(dimension, score, questionKey, time = '2026-01-01T00:00:00Z') {
  return { dimension, score, questionKey, question: questionKey, requirement: 'JD requirement', category: 'Technical fundamentals', evaluation: questionKey, session: 'session', assessedAt: new Date(time) };
}

test('no scored evidence produces no readiness percentage and zero coverage', () => {
  const result = buildReadiness([], [], 1);
  assert.equal(result.readinessPercent, null);
  assert.equal(result.coveragePercent, 0);
  assert.equal(result.observedScore, null);
  assert.ok(result.categories.every((category) => category.status === 'not_evaluated'));
});

test('full readiness uses the exact category weights', () => {
  const scores = { technical: 80, dsa: 60, jdKnowledge: 70, projects: 90, communication: 75, hr: 50 };
  const assessments = READINESS_DIMENSIONS.flatMap(({ key }) => [evidence(key, scores[key], `${key}-1`), evidence(key, scores[key], `${key}-2`)]);
  const result = buildReadiness(assessments, [], 3);
  assert.equal(result.coveragePercent, 100);
  assert.equal(result.readinessPercent, 72);
  assert.equal(result.level, 'Developing');
});

test('missing category is not treated as zero and repeated questions do not add coverage', () => {
  const assessments = [
    evidence('technical', 20, 'same-question', '2026-01-01T00:00:00Z'),
    evidence('technical', 90, 'same-question', '2026-01-02T00:00:00Z'),
    evidence('technical', 70, 'different-question', '2026-01-03T00:00:00Z'),
  ];
  const result = buildReadiness(assessments, [], 1);
  assert.equal(result.readinessPercent, null);
  assert.equal(result.coveragePercent, 25);
  assert.equal(result.observedScore, 80);
  assert.equal(result.categories.find((category) => category.key === 'technical').evidenceCount, 2);
  assert.equal(result.categories.find((category) => category.key === 'technical').score, 80);
});

test('only AI-scored answers create category evidence', () => {
  const scores = { technicalCorrectness: 90, depth: 70, practicalApplicability: 60, completeness: 50, clarity: 80, algorithmSelection: 40, timeComplexity: 30, spaceComplexity: 20, edgeCases: 10, codeCorrectness: 100 };
  const base = { _id: 'evaluation', session: 'session', questionId: 'q1', question: 'Explain arrays', requirement: 'Arrays', category: 'Data structures and algorithms', createdAt: new Date(), score: 70, scores };
  assert.deepEqual(evidenceFromEvaluation({ ...base, assessed: false, source: 'unscored' }), []);
  const result = evidenceFromEvaluation({ ...base, assessed: true, source: 'ai' });
  assert.deepEqual(result.map((item) => item.dimension), ['dsa', 'jdKnowledge', 'communication']);
  assert.deepEqual(result.map((item) => item.score), [56, 70, 80]);
});
