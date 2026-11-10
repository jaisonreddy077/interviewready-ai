import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoadmapTasks, roadmapSummary } from '../src/services/roadmap.js';

test('roadmap prioritizes scored gaps, then unassessed topics, then review', () => {
  const analysis = { dataStructuresAndAlgorithms: ['DSA'], frameworksAndTechnologies: ['React', 'Node.js'], databases: ['MongoDB'] };
  const assessments = [
    { dimension: 'jdKnowledge', requirement: 'DSA', questionKey: 'dsa-1', score: 35, assessedAt: new Date('2026-01-01') },
    { dimension: 'jdKnowledge', requirement: 'Node.js', questionKey: 'node-1', score: 45, assessedAt: new Date('2026-01-01') },
    { dimension: 'jdKnowledge', requirement: 'React', questionKey: 'react-1', score: 85, assessedAt: new Date('2026-01-01') },
  ];
  const tasks = buildRoadmapTasks(analysis, assessments);
  assert.deepEqual(tasks.filter((task) => task.key.endsWith(':learn')).map((task) => task.topic), ['DSA', 'Node.js', 'MongoDB', 'React']);
  assert.equal(tasks[0].priority, 'Focus');
  assert.equal(tasks[4].priority, 'Unassessed');
  assert.equal(tasks[6].priority, 'Review');
  assert.deepEqual(tasks.map((task) => [task.week, task.day]).at(-1), [2, 1]);
});

test('regeneration keeps completion for matching tasks', () => {
  const analysis = { frameworksAndTechnologies: ['React'] };
  const initial = buildRoadmapTasks(analysis, []);
  const refreshed = buildRoadmapTasks(analysis, [], [{ ...initial[0], completed: true, completedAt: new Date('2026-01-01') }]);
  assert.equal(refreshed[0].completed, true);
  assert.equal(refreshed[1].completed, false);
  assert.deepEqual(roadmapSummary({ tasks: refreshed }), { completed: 1, total: 2, percent: 50 });
});
