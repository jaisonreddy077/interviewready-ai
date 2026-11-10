import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpenText, Check, Copy, LoaderCircle, MessageCircle, RefreshCw, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api, apiError } from '../lib/api.js';

const difficultyStyles = {
  Beginner: 'bg-[#eaf5e8] text-[#3e793a]',
  Intermediate: 'bg-[#fff4df] text-[#94651d]',
  Advanced: 'bg-[#fceceb] text-[#a7564d]',
};

export default function QuestionBank() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [generation, setGeneration] = useState(null);
  const [category, setCategory] = useState('All categories');
  const [difficulty, setDifficulty] = useState('All levels');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.get(`/jobs/${id}`), api.get(`/jobs/${id}/questions`)]).then(([boardResponse, questionsResponse]) => {
      if (!active) return;
      setJob(boardResponse.data.job);
      setAnalysis(boardResponse.data.analysis);
      setQuestions(questionsResponse.data.questions);
      setGeneration(questionsResponse.data.generation);
    }).catch((err) => { if (active) setError(apiError(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function generate() {
    if (questions.length && !window.confirm('Replace the current question bank with a new set?')) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.post(`/jobs/${id}/questions/generate`, {});
      setQuestions(data.questions);
      setGeneration(data.generation);
      setCategory('All categories');
      setDifficulty('All levels');
    } catch (err) { setError(apiError(err)); }
    finally { setBusy(false); }
  }

  async function copyQuestion(question) {
    try { await navigator.clipboard.writeText(question.prompt); setCopiedId(question._id); setTimeout(() => setCopiedId(''), 2000); }
    catch { setError('Could not copy the question.'); }
  }

  const categories = [...new Set(questions.map((question) => question.category))];
  const filtered = useMemo(() => questions.filter((question) => (category === 'All categories' || question.category === category) && (difficulty === 'All levels' || question.difficulty === difficulty)), [questions, category, difficulty]);
  const counts = Object.fromEntries(['Beginner', 'Intermediate', 'Advanced'].map((level) => [level, questions.filter((question) => question.difficulty === level).length]));

  if (loading) return <p className="text-sm text-[#819083]">Loading question bank…</p>;
  if (!job) return <><Link to="/app/jobs" className="text-sm text-[#5a9150]">← Job boards</Link><p role="alert" className="mt-5 text-red-700">{error || 'Job board not found.'}</p></>;
  return <>
    <Link to={`/app/jobs/${id}`} className="inline-flex items-center gap-2 text-sm text-[#647866] hover:text-[#2f6330]"><ArrowLeft size={16} /> {job.company} · {job.role}</Link>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#5a9150]">Requirement-linked practice</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Question bank</h1><p className="mt-2 text-sm text-[#738075]">Questions for {job.role} at {job.company}, anchored to this board’s JD.</p></div><div className="flex flex-wrap gap-2">{questions.length > 0 && <Link to={`/app/jobs/${id}/interview`} className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-ink"><MessageCircle size={17} /> Start interview</Link>}<button onClick={generate} disabled={busy || !analysis} className="inline-flex items-center gap-2 rounded-xl bg-[#193322] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285137] disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle size={17} className="animate-spin" /> : questions.length ? <RefreshCw size={17} /> : <Sparkles size={17} />}{busy ? 'Generating…' : questions.length ? 'Regenerate questions' : 'Generate questions'}</button></div></div>
    {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {!analysis && <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">Analyze this board’s job description before generating questions. <Link to={`/app/jobs/${id}`} className="font-semibold underline">Go to JD analysis</Link></div>}
    {generation && <div className="mt-8 flex flex-wrap items-start gap-3 rounded-xl border border-[#d8e8d2] bg-[#f1f8ee] p-5"><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#477b42]">{generation.source === 'ai' ? 'AI generated' : 'Template generated'}</span><p className="flex-1 text-sm leading-6 text-[#5f765e]">{generation.note}</p></div>}
    {questions.length > 0 && <><div className="mt-7 grid gap-3 sm:grid-cols-4"><div className="rounded-xl border border-[#e3e9e0] bg-white p-5"><p className="text-xs text-[#879487]">Total questions</p><p className="mt-2 text-2xl font-semibold">{questions.length}</p></div>{['Beginner', 'Intermediate', 'Advanced'].map((level) => <div key={level} className="rounded-xl border border-[#e3e9e0] bg-white p-5"><p className="text-xs text-[#879487]">{level}</p><p className="mt-2 text-2xl font-semibold">{counts[level]}</p></div>)}</div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Questions</h2><p className="mt-1 text-xs text-[#879487]">Showing {filtered.length} of {questions.length}</p></div><div className="flex flex-wrap gap-2"><select aria-label="Filter by category" className="light-field w-auto min-w-44" value={category} onChange={(e) => setCategory(e.target.value)}><option>All categories</option>{categories.map((name) => <option key={name}>{name}</option>)}</select><select aria-label="Filter by difficulty" className="light-field w-auto min-w-32" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option>All levels</option>{['Beginner', 'Intermediate', 'Advanced'].map((level) => <option key={level}>{level}</option>)}</select></div></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">{filtered.map((question) => <article key={question._id} className="flex min-w-0 flex-col rounded-2xl border border-[#e3e9e0] bg-white p-6"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f0f3ed] px-2.5 py-1 text-xs font-medium text-[#607761]">{question.category}</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${difficultyStyles[question.difficulty]}`}>{question.difficulty}</span><span className="ml-auto text-xs text-[#9ca89c]">#{question.order + 1}</span></div><h3 className="mt-6 text-lg font-semibold leading-7">{question.prompt}</h3><div className="mt-auto pt-6"><div className="rounded-lg bg-[#f6f9f4] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#7b9b74]">Linked JD requirement</p><p className="mt-1 text-sm font-medium text-[#4d694c]">{question.requirement}</p>{question.jdExcerpt && <p className="mt-2 border-l-2 border-[#c4dcbc] pl-2 text-xs leading-5 text-[#7c8f7b]">{question.jdExcerpt}</p>}</div><div className="mt-4 flex items-center justify-between"><span className="text-xs text-[#9ca89c]">Use this in a mock interview</span><button type="button" onClick={() => copyQuestion(question)} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#477b42] hover:underline">{copiedId === question._id ? <Check size={14} /> : <Copy size={14} />}{copiedId === question._id ? 'Copied' : 'Copy question'}</button></div></div></article>)}</div>
      {!filtered.length && <p className="mt-6 rounded-xl border border-dashed border-[#cbd8c8] p-6 text-center text-sm text-[#7f8c80]">No questions match these filters.</p>}</>}
    {analysis && !questions.length && <div className="mt-10 rounded-2xl border border-dashed border-[#cbd8c8] bg-white px-6 py-16 text-center"><BookOpenText className="mx-auto text-[#90ad88]" size={30} /><h2 className="mt-5 text-lg font-semibold">No questions yet</h2><p className="mt-2 text-sm text-[#7f8c80]">Generate a set of role-specific questions tied to the analyzed JD.</p><button onClick={generate} disabled={busy} className="mt-6 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-ink disabled:opacity-50">Generate questions</button></div>}
  </>;
}
