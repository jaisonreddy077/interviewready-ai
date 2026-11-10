import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeJobDescription, extractKeywords } from '../src/services/jdAnalysis.js';

const jd = 'Build React and Node.js services with MongoDB, data structures knowledge, and clear communication.';

test('keyword extraction includes only mentioned catalog terms', () => {
  const result = extractKeywords(jd, 'Software Engineer');
  assert.ok(result.frameworksAndTechnologies.includes('React'));
  assert.ok(result.databases.includes('MongoDB'));
  assert.ok(!result.programmingLanguages.includes('Python'));
});

test('AI service requests strict structured output and validates the result', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(extractKeywords(jd, 'Software Engineer')) }] }] }), { status: 200 });
  };
  try {
    const result = await analyzeJobDescription({ jdText: jd, role: 'Software Engineer', company: 'Example', apiKey: 'test-key', model: 'gpt-4o-mini' });
    assert.equal(result.source, 'ai');
    assert.equal(request.url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(request.options.body);
    assert.equal(body.text.format.type, 'json_schema');
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.schema.additionalProperties, false);
  } finally { globalThis.fetch = originalFetch; }
});
