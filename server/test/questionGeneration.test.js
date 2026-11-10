import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestions, generateTemplateQuestions } from '../src/services/questionGeneration.js';
import { extractKeywords } from '../src/services/jdAnalysis.js';

const job = { company: 'Example Co', role: 'Software Engineer', experienceLevel: 'Entry level', jdText: 'Build React and Node.js services with MongoDB. Strong communication and data structures knowledge preferred.' };
const analysis = extractKeywords(job.jdText, job.role);

test('template questions are tied to actual requirements and span difficulty levels', () => {
  const questions = generateTemplateQuestions({ analysis, job });
  assert.ok(questions.length >= 9);
  assert.deepEqual([...new Set(questions.map((question) => question.difficulty))], ['Beginner', 'Intermediate', 'Advanced']);
  assert.ok(questions.every((question) => question.requirement && question.prompt.includes(question.requirement)));
  assert.ok(questions.some((question) => question.jdExcerpt.includes('React')));
  assert.ok(!questions.some((question) => question.requirement === 'Python'));
});

test('AI questions use a strict requirement enum and preserve their category', async () => {
  const originalFetch = globalThis.fetch;
  const sample = generateTemplateQuestions({ analysis, job }).slice(0, 3).map(({ category, difficulty, requirement, prompt }) => ({ category, difficulty, requirement, prompt }));
  let request;
  globalThis.fetch = async (url, options) => {
    request = JSON.parse(options.body);
    return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ questions: sample }) }] }] }), { status: 200 });
  };
  try {
    const result = await generateQuestions({ analysis, job, apiKey: 'test-key', model: 'gpt-4o-mini' });
    assert.equal(result.source, 'ai');
    assert.equal(result.questions.length, 3);
    assert.equal(request.text.format.type, 'json_schema');
    assert.equal(request.text.format.schema.properties.questions.items.additionalProperties, false);
    assert.ok(request.text.format.schema.properties.questions.items.properties.requirement.enum.includes('React'));
  } finally { globalThis.fetch = originalFetch; }
});
