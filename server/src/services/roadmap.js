const TOPIC_AREAS = [
  'dataStructuresAndAlgorithms', 'frameworksAndTechnologies', 'programmingLanguages',
  'databases', 'systemDesign', 'requiredTechnicalSkills', 'projectsAndExperience',
  'softSkills', 'preferredQualifications', 'importantKeywords',
];

function normalized(value) { return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').trim(); }

function topicScore(topic, assessments) {
  const key = normalized(topic);
  const matches = assessments.filter((item) => {
    if (item.dimension !== 'jdKnowledge') return false;
    const requirement = normalized(item.requirement);
    return requirement === key || requirement.includes(key) || key.includes(requirement);
  }).sort((a, b) => new Date(b.assessedAt) - new Date(a.assessedAt));
  const unique = new Map();
  for (const item of matches) if (!unique.has(item.questionKey)) unique.set(item.questionKey, item.score);
  return unique.size ? Math.round([...unique.values()].reduce((sum, score) => sum + score, 0) / unique.size) : null;
}

export function buildRoadmapTasks(analysis, assessments, previousTasks = []) {
  const topics = new Map();
  for (const area of TOPIC_AREAS) {
    for (const raw of analysis[area] || []) {
      const topic = String(raw).trim();
      if (topic && !topics.has(normalized(topic))) topics.set(normalized(topic), { topic, area });
    }
  }
  const ranked = [...topics.values()].map(({ topic, area }) => {
    const score = topicScore(topic, assessments);
    const priority = score === null ? 'Unassessed' : score < 75 ? 'Focus' : 'Review';
    return { topic, area, score, priority };
  }).sort((a, b) => {
    const rank = { Focus: 0, Unassessed: 1, Review: 2 };
    return rank[a.priority] - rank[b.priority] || (a.score ?? 0) - (b.score ?? 0) || a.topic.localeCompare(b.topic);
  }).slice(0, 12);
  const prior = new Map(previousTasks.map((task) => [task.key, task]));
  return ranked.flatMap(({ topic, area, score, priority }) => [
    {
      kind: 'learn', title: `Review ${topic}`,
      action: area === 'projectsAndExperience'
        ? `Write a concise project story for ${topic}: your role, decisions, outcome, and trade-offs.`
        : `Study ${topic}. Write down the core concepts, one practical example, and a common mistake.`,
    },
    {
      kind: 'practice', title: `Practice ${topic}`,
      action: `Answer two interview questions about ${topic}. Review feedback and retry one weak answer.`,
    },
  ].map(({ kind, title, action }) => {
    const key = `${normalized(topic)}:${kind}`;
    const existing = prior.get(key);
    return {
      key, topic, title, action, score, priority,
      reason: score === null ? 'Required by this job; no scored answer yet.' : score < 75 ? `Current answer evidence: ${score}/100. This needs focused practice.` : `Current answer evidence: ${score}/100. Keep it fresh with revision.`,
      completed: Boolean(existing?.completed), completedAt: existing?.completedAt || null,
    };
  })).map((task, index) => ({ ...task, week: Math.floor(index / 7) + 1, day: index % 7 + 1 }));
}

export function roadmapSummary(roadmap) {
  const completed = roadmap.tasks.filter((task) => task.completed).length;
  return { completed, total: roadmap.tasks.length, percent: roadmap.tasks.length ? Math.round(completed / roadmap.tasks.length * 100) : 0 };
}
