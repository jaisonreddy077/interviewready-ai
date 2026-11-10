import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

const config = { clientOrigin: 'http://localhost:5173', jwtSecret: 'test-secret-at-least-thirty-two-characters' };

async function withServer(run, overrides = {}) {
  const server = createApp({ ...config, ...overrides }).listen(0);
  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('health endpoint responds', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });
});

test('private profile requires a token', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/auth/me`);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, 'Authentication required.');
  });
});

test('registration rejects invalid input before touching the database', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'A', email: 'bad', password: 'short' }),
    });
    assert.equal(response.status, 400);
    assert.ok((await response.json()).details.email);
  });
});

test('production serves deep client links and keeps unknown API routes as JSON errors', async () => {
  await withServer(async (base) => {
    const page = await fetch(`${base}/app/jobs/example/readiness`, { headers: { accept: 'text/html' } });
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    assert.match(await page.text(), /<div id="root"><\/div>/);
    assert.equal(page.headers.get('cache-control'), 'no-store');
    const missingApi = await fetch(`${base}/api/does-not-exist`);
    assert.equal(missingApi.status, 404);
    assert.deepEqual(await missingApi.json(), { error: 'Route not found.' });
    const missingAsset = await fetch(`${base}/assets/missing.js`);
    assert.equal(missingAsset.status, 404);
  }, { serveClient: true });
});
