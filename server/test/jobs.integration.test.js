import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { getConfig } from '../src/config/env.js';
import User from '../src/models/User.js';
import JobBoard from '../src/models/JobBoard.js';
import JobAnalysis from '../src/models/JobAnalysis.js';
import InterviewQuestion from '../src/models/InterviewQuestion.js';
import InterviewSession from '../src/models/InterviewSession.js';
import AnswerEvaluation from '../src/models/AnswerEvaluation.js';
import SkillAssessment from '../src/models/SkillAssessment.js';
import ReadinessSnapshot from '../src/models/ReadinessSnapshot.js';
import PreparationRoadmap from '../src/models/PreparationRoadmap.js';

test('job boards, questions, and interviews stay scoped and respond to JD edits', { skip: process.env.RUN_DB_TESTS !== '1' }, async () => {
  const config = { ...getConfig(), openaiApiKey: '' };
  await mongoose.connect(config.mongoUri);
  const server = createApp(config).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const marker = `phase2-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const emails = [`${marker}-a@example.test`, `${marker}-b@example.test`];
  let boardId;
  let secondBoardId;

  async function request(path, { token, method = 'GET', body } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }

  try {
    const first = await request('/api/auth/register', { method: 'POST', body: { name: 'Phase Two A', email: emails[0], password: 'SafeTestPassword123!' } });
    const second = await request('/api/auth/register', { method: 'POST', body: { name: 'Phase Two B', email: emails[1], password: 'SafeTestPassword123!' } });
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    const tokenA = first.data.token;
    const tokenB = second.data.token;

    const created = await request('/api/jobs', { token: tokenA, method: 'POST', body: { company: 'Example Co', role: 'Software Engineer', experienceLevel: 'Entry level', jdText: 'Build React and Node.js services with MongoDB. Strong communication and data structures knowledge preferred.' } });
    assert.equal(created.status, 201);
    boardId = created.data.job._id;

    const analyzed = await request(`/api/jobs/${boardId}/analyze`, { token: tokenA, method: 'POST', body: {} });
    assert.equal(analyzed.status, 200);
    assert.equal(analyzed.data.analysis.source, 'keyword');
    assert.ok(analyzed.data.analysis.frameworksAndTechnologies.includes('React'));
    const generated = await request(`/api/jobs/${boardId}/questions/generate`, { token: tokenA, method: 'POST', body: {} });
    assert.equal(generated.status, 201);
    assert.equal(generated.data.generation.source, 'template');
    assert.ok(generated.data.questions.some((question) => question.requirement === 'React'));
    assert.ok(generated.data.questions.every((question) => question.jobBoard === boardId));
    assert.equal((await request(`/api/dashboard/overview?jobId=${boardId}`, { token: tokenB })).status, 404);
    assert.equal((await request(`/api/jobs/${boardId}/questions`, { token: tokenB })).status, 404);

    assert.equal((await request('/api/interviews/start', { token: tokenB, method: 'POST', body: { jobId: boardId, mode: 'full', questionCount: 5 } })).status, 404);
    const started = await request('/api/interviews/start', { token: tokenA, method: 'POST', body: { jobId: boardId, mode: 'full', questionCount: 5 } });
    assert.equal(started.status, 201);
    const sessionId = started.data.session.id;
    const firstQuestionId = started.data.session.currentQuestion.id;
    assert.equal((await request(`/api/interviews/${sessionId}`, { token: tokenB })).status, 404);
    const firstAnswer = await request(`/api/interviews/${sessionId}/answer`, { token: tokenA, method: 'POST', body: { questionId: firstQuestionId, answer: 'I would build a clear component and explain its purpose.' } });
    assert.equal(firstAnswer.status, 200);
    assert.equal(firstAnswer.data.evaluation.assessed, false);
    assert.equal(firstAnswer.data.evaluation.score, null);
    assert.equal(firstAnswer.data.session.currentQuestion.isFollowUp, true);
    assert.equal((await request(`/api/interviews/${sessionId}/answer`, { token: tokenA, method: 'POST', body: { questionId: firstQuestionId, answer: 'I would build a clear component and explain its purpose.' } })).status, 409);
    const resumed = await request(`/api/interviews/${sessionId}`, { token: tokenA });
    assert.equal(resumed.data.session.answeredCount, 1);
    assert.equal(resumed.data.evaluations.length, 1);
    const followUpAnswer = await request(`/api/interviews/${sessionId}/answer`, { token: tokenA, method: 'POST', body: { questionId: resumed.data.session.currentQuestion.id, answer: 'I would give a concrete example from a project and describe the steps, trade-offs, testing, and result.' } });
    assert.equal(followUpAnswer.status, 200);
    assert.equal(followUpAnswer.data.session.answeredCount, 2);
    const finished = await request(`/api/interviews/${sessionId}/complete`, { token: tokenA, method: 'POST', body: {} });
    assert.equal(finished.status, 200);
    assert.equal(finished.data.session.status, 'completed');
    assert.ok((await request('/api/interviews/history', { token: tokenA })).data.sessions.some((item) => item.id === sessionId));
    assert.ok(!(await request('/api/interviews/history', { token: tokenB })).data.sessions.some((item) => item.id === sessionId));

    const emptyReadiness = await request(`/api/jobs/${boardId}/readiness`, { token: tokenA });
    assert.equal(emptyReadiness.status, 200);
    assert.equal(emptyReadiness.data.readiness.readinessPercent, null);
    assert.equal(emptyReadiness.data.readiness.coveragePercent, 0);
    assert.equal(emptyReadiness.data.readiness.unscoredAnswerCount, 2);
    assert.equal((await request(`/api/jobs/${boardId}/readiness`, { token: tokenB })).status, 404);

    const boardVersion = emptyReadiness.data.job.assessmentVersion;
    const fixtureGroups = [
      ['Technical fundamentals', 'React', 80], ['Technical fundamentals', 'Node.js', 80],
      ['Data structures and algorithms', 'Data structures', 60], ['Data structures and algorithms', 'Algorithms', 60],
      ['Project-based', 'Production project', 90], ['Project-based', 'Team project', 90],
      ['Behavioral', 'Communication', 50], ['HR interview', 'Preferred qualification', 50],
    ];
    await AnswerEvaluation.insertMany(fixtureGroups.map(([category, requirement, score], index) => ({
      user: first.data.user.id, jobBoard: boardId, boardVersion, session: sessionId, mode: 'full',
      questionId: `scored-fixture-${index}`, question: `Explain ${requirement} for this job.`,
      category, difficulty: 'Intermediate', requirement, requirementArea: 'importantKeywords',
      answer: 'A detailed test answer with a specific example and explanation of trade-offs.',
      source: 'ai', assessed: true, score, scores: { clarity: 75 },
    })));
    const scoredReadiness = await request(`/api/jobs/${boardId}/readiness`, { token: tokenA });
    assert.equal(scoredReadiness.status, 200);
    assert.equal(scoredReadiness.data.readiness.coveragePercent, 100);
    assert.equal(scoredReadiness.data.readiness.readinessPercent, 72);
    assert.equal(scoredReadiness.data.history.length, 1);
    assert.equal((await request(`/api/jobs/${boardId}/readiness`, { token: tokenA })).data.history.length, 1);
    assert.equal((await request('/api/assessment/submit', { token: tokenB, method: 'POST', body: { sessionId } })).status, 404);
    assert.equal((await request('/api/assessment/submit', { token: tokenA, method: 'POST', body: { sessionId } })).data.readiness.readinessPercent, 72);
    const overview = await request(`/api/dashboard/overview?jobId=${boardId}`, { token: tokenA });
    assert.equal(overview.status, 200);
    assert.equal(overview.data.selected.job.readinessPercent, 72);
    assert.equal(overview.data.selected.completedQuestions, 10);
    assert.equal(overview.data.selected.readiness.categories.length, 6);
    assert.equal(overview.data.selected.pendingCategories.length, 0);
    assert.equal(overview.data.selected.weakestSkills[0].name, 'Communication');
    assert.equal(overview.data.selected.weakestSkills[0].score, 50);

    const generatedRoadmap = await request(`/api/jobs/${boardId}/roadmap`, { token: tokenA, method: 'POST', body: {} });
    assert.equal(generatedRoadmap.status, 201);
    assert.ok(generatedRoadmap.data.roadmap.tasks.length > 0);
    assert.equal(generatedRoadmap.data.roadmap.tasks[0].topic, 'Communication');
    assert.equal(generatedRoadmap.data.roadmap.tasks[0].priority, 'Focus');
    assert.equal(generatedRoadmap.data.roadmap.tasks.find((task) => task.topic === 'Data structures').score, 60);
    assert.equal((await request(`/api/jobs/${boardId}/roadmap`, { token: tokenB })).status, 404);
    const roadmapId = generatedRoadmap.data.roadmap._id;
    const taskId = generatedRoadmap.data.roadmap.tasks[0]._id;
    assert.equal((await request(`/api/roadmap/${roadmapId}`, { token: tokenB, method: 'PUT', body: { taskId, completed: true } })).status, 404);
    const checkedTask = await request(`/api/roadmap/${roadmapId}`, { token: tokenA, method: 'PUT', body: { taskId, completed: true } });
    assert.equal(checkedTask.status, 200);
    assert.equal(checkedTask.data.progress.completed, 1);
    assert.equal((await request(`/api/dashboard/overview?jobId=${boardId}`, { token: tokenA })).data.selected.roadmap.completed, 1);
    const refreshedRoadmap = await request(`/api/jobs/${boardId}/roadmap`, { token: tokenA, method: 'POST', body: {} });
    assert.equal(refreshedRoadmap.status, 200);
    assert.equal(refreshedRoadmap.data.progress.completed, 1);

    const challenge = await request('/api/interviews/start', { token: tokenA, method: 'POST', body: { jobId: boardId, mode: 'challenge', dimension: 'dsa', questionCount: 2 } });
    assert.equal(challenge.status, 201);
    assert.equal(challenge.data.session.challengeBeforeScore, 60);
    assert.equal(challenge.data.session.currentQuestion.category, 'Data structures and algorithms');
    const challengeAnswer = await request(`/api/interviews/${challenge.data.session.id}/answer`, { token: tokenA, method: 'POST', body: { questionId: challenge.data.session.currentQuestion.id, answer: 'I would explain the data structure with an example.' } });
    assert.equal(challengeAnswer.status, 200);
    assert.equal(challengeAnswer.data.evaluation.assessed, false);
    assert.equal((await request(`/api/jobs/${boardId}/readiness`, { token: tokenA })).data.readiness.readinessPercent, 72);

    const staleStart = await request('/api/interviews/start', { token: tokenA, method: 'POST', body: { jobId: boardId, mode: 'technical', questionCount: 5 } });
    assert.equal(staleStart.status, 201);

    const secondBoard = await request('/api/jobs', { token: tokenA, method: 'POST', body: { company: 'Another Co', role: 'Data Engineer', experienceLevel: 'Mid level', jdText: 'Build Python data pipelines with PostgreSQL and strong system design skills.' } });
    assert.equal(secondBoard.status, 201);
    secondBoardId = secondBoard.data.job._id;
    const secondAnalysis = await request(`/api/jobs/${secondBoardId}/analyze`, { token: tokenA, method: 'POST', body: {} });
    assert.equal(secondAnalysis.status, 200);
    assert.ok(secondAnalysis.data.analysis.programmingLanguages.includes('Python'));
    assert.ok(!secondAnalysis.data.analysis.frameworksAndTechnologies.includes('React'));
    const secondQuestions = await request(`/api/jobs/${secondBoardId}/questions/generate`, { token: tokenA, method: 'POST', body: {} });
    assert.equal(secondQuestions.status, 201);
    assert.ok(secondQuestions.data.questions.some((question) => question.requirement === 'Python'));
    assert.ok(!secondQuestions.data.questions.some((question) => question.requirement === 'React'));
    assert.equal((await request(`/api/jobs/${secondBoardId}/roadmap`, { token: tokenA })).data.roadmap, null);
    const multiOverview = await request(`/api/dashboard/overview?jobId=${secondBoardId}`, { token: tokenA });
    assert.equal(multiOverview.status, 200);
    assert.equal(multiOverview.data.boards.length, 2);
    assert.equal(multiOverview.data.selected.readiness.readinessPercent, null);
    assert.equal(multiOverview.data.selected.completedQuestions, 0);
    assert.deepEqual(multiOverview.data.selected.strongestSkills, []);
    assert.equal(multiOverview.data.boards.find((board) => board.id === boardId).readinessPercent, 72);
    assert.ok((await request(`/api/jobs/${boardId}`, { token: tokenA })).data.analysis.frameworksAndTechnologies.includes('React'));

    const ownList = await request('/api/jobs', { token: tokenA });
    const otherList = await request('/api/jobs', { token: tokenB });
    assert.ok(ownList.data.jobs.some((job) => job._id === boardId));
    assert.ok(!otherList.data.jobs.some((job) => job._id === boardId));
    for (const [method, path] of [['GET', `/api/jobs/${boardId}`], ['PUT', `/api/jobs/${boardId}`], ['DELETE', `/api/jobs/${boardId}`], ['POST', `/api/jobs/${boardId}/analyze`]]) {
      const result = await request(path, { token: tokenB, method, body: method === 'PUT' ? { role: 'Changed' } : method === 'POST' ? {} : undefined });
      assert.equal(result.status, 404, `${method} ${path} should be private`);
    }

    const edited = await request(`/api/jobs/${boardId}`, { token: tokenA, method: 'PUT', body: { jdText: 'Build Python services and collaborate with the team on reliable APIs.' } });
    assert.equal(edited.status, 200);
    assert.equal(edited.data.analysisInvalidated, true);
    const resetReadiness = await request(`/api/jobs/${boardId}/readiness`, { token: tokenA });
    assert.equal(resetReadiness.data.readiness.coveragePercent, 0);
    assert.equal(resetReadiness.data.readiness.readinessPercent, null);
    assert.equal(resetReadiness.data.history.length, 0);
    assert.equal((await request(`/api/dashboard/overview?jobId=${boardId}`, { token: tokenA })).data.selected.job.readinessPercent, null);
    assert.equal((await request(`/api/jobs/${boardId}/roadmap`, { token: tokenA })).data.roadmap, null);
    assert.equal((await request(`/api/roadmap/${roadmapId}`, { token: tokenA, method: 'PUT', body: { taskId, completed: false } })).status, 409);
    assert.equal((await request(`/api/interviews/${staleStart.data.session.id}/answer`, { token: tokenA, method: 'POST', body: { questionId: staleStart.data.session.currentQuestion.id, answer: 'This is an answer that should be rejected after a JD change.' } })).status, 409);
    const detail = await request(`/api/jobs/${boardId}`, { token: tokenA });
    assert.equal(detail.data.analysis, null);
    assert.deepEqual((await request(`/api/jobs/${boardId}/questions`, { token: tokenA })).data.questions, []);
    assert.equal(detail.data.job.jdText, 'Build Python services and collaborate with the team on reliable APIs.');

    await request(`/api/jobs/${boardId}/analyze`, { token: tokenA, method: 'POST', body: {} });
    const renamed = await request(`/api/jobs/${boardId}`, { token: tokenA, method: 'PUT', body: { role: 'Platform Engineer' } });
    assert.equal(renamed.data.analysisInvalidated, true);
    assert.equal((await request(`/api/jobs/${boardId}`, { token: tokenA })).data.analysis, null);

    const deleted = await request(`/api/jobs/${boardId}`, { token: tokenA, method: 'DELETE' });
    assert.equal(deleted.status, 204);
    boardId = null;
    assert.equal((await request(`/api/jobs/${secondBoardId}`, { token: tokenA })).status, 200);
    assert.ok((await request(`/api/jobs/${secondBoardId}/questions`, { token: tokenA })).data.questions.length > 0);
  } finally {
    for (const id of [boardId, secondBoardId].filter(Boolean)) {
      await AnswerEvaluation.deleteMany({ jobBoard: id });
      await InterviewSession.deleteMany({ jobBoard: id });
      await SkillAssessment.deleteMany({ jobBoard: id });
      await ReadinessSnapshot.deleteMany({ jobBoard: id });
      await PreparationRoadmap.deleteMany({ jobBoard: id });
      await InterviewQuestion.deleteMany({ jobBoard: id });
      await JobAnalysis.deleteOne({ jobBoard: id });
      await JobBoard.deleteOne({ _id: id });
    }
    await User.deleteMany({ email: { $in: emails } });
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
});
