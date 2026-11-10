import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAnswerScore, evaluateAnswer } from '../src/services/answerEvaluation.js';
import { chooseNextQuestion, followUpFor } from '../src/services/interviewFlow.js';

const question = { id: 'question-one', prompt: 'Explain React rendering.', category: 'Technical fundamentals', difficulty: 'Beginner', requirement: 'React', requirementArea: 'frameworksAndTechnologies', jdExcerpt: 'Build React interfaces.' };
const job = { company: 'Example', role: 'Engineer', experienceLevel: 'Entry level' };
const scores = { technicalCorrectness: 80, depth: 70, practicalApplicability: 60, completeness: 70, clarity: 90, algorithmSelection: 50, timeComplexity: 40, spaceComplexity: 30, edgeCases: 60, codeCorrectness: 50 };

test('backend calculates answer scores from dimension scores', () => {
  assert.equal(calculateAnswerScore(scores, question), 73);
  assert.equal(calculateAnswerScore(scores, { ...question, category: 'Programming and coding' }), 62);
  assert.equal(calculateAnswerScore(scores, { ...question, category: 'Behavioral' }), 73);
});

test('without an API key feedback is unscored and suggests a targeted follow-up', async () => {
  const evaluation = await evaluateAnswer({ question, answer: 'I would use components and explain the UI flow.', job, apiKey: '', model: 'gpt-4o-mini' });
  assert.equal(evaluation.assessed, false);
  assert.equal(evaluation.score, null);
  assert.equal(evaluation.source, 'unscored');
  const followUp = followUpFor(question, evaluation);
  assert.ok(followUp.prompt.includes('React'));
  assert.equal(followUp.isFollowUp, true);
  assert.equal(followUpFor(followUp, evaluation), null);
});

test('next question adapts difficulty after a scored answer', () => {
  const remaining = [
    { id: 'b', category: 'Database and SQL', difficulty: 'Beginner', requirement: 'SQL' },
    { id: 'a', category: 'System design', difficulty: 'Advanced', requirement: 'Scalability' },
  ];
  assert.equal(chooseNextQuestion(remaining, { assessed: true, score: 85 }, []).id, 'a');
  assert.equal(chooseNextQuestion(remaining, { assessed: true, score: 35 }, []).id, 'b');
});

test('AI evaluation requests a strict schema and returns a computed score', async () => {
  const originalFetch = globalThis.fetch;
  let body;
  globalThis.fetch = async (url, options) => {
    body = JSON.parse(options.body);
    const result = { scores, correctPoints: ['Explained the core idea'], missingConcepts: ['Reconciliation'], incorrectClaims: [], idealAnswer: 'React updates the view by comparing render output and applying necessary changes to the DOM.', improvements: ['Explain when rerenders happen.'], followUpQuestion: 'How would you reduce unnecessary React rerenders?' };
    return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] }), { status: 200 });
  };
  try {
    const evaluation = await evaluateAnswer({ question, answer: 'React rerenders components as their state changes and updates the DOM.', job, apiKey: 'test-key', model: 'gpt-4o-mini' });
    assert.equal(evaluation.assessed, true);
    assert.equal(evaluation.score, 73);
    assert.equal(body.text.format.type, 'json_schema');
    assert.equal(body.text.format.schema.additionalProperties, false);
    assert.equal(body.store, false);
  } finally { globalThis.fetch = originalFetch; }
});

test('exhausted API credits produce an actionable unscored explanation', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'credit_balance_exhausted', type: 'insufficient_quota' } }), { status: 429 });
  try {
    const evaluation = await evaluateAnswer({ question, answer: 'I would explain rendering with a concrete React example.', job, apiKey: 'test-key', model: 'gpt-4o-mini' });
    assert.equal(evaluation.source, 'unscored');
    assert.equal(evaluation.score, null);
    assert.match(evaluation.note, /credit balance is exhausted/);
  } finally { globalThis.fetch = originalFetch; }
});

test('rejected API key produces an actionable unscored explanation', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'invalid_api_key', type: 'invalid_request_error' } }), { status: 401 });
  try {
    const evaluation = await evaluateAnswer({ question, answer: 'I would explain rendering with a concrete React example.', job, apiKey: 'test-key', model: 'gpt-4o-mini' });
    assert.equal(evaluation.source, 'unscored');
    assert.equal(evaluation.score, null);
    assert.match(evaluation.note, /API key in server\/\.env was rejected/);
  } finally { globalThis.fetch = originalFetch; }
});
