import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenText, Code2, MessageCircle, MonitorPlay, Sparkles } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, apiError } from '../lib/api.js';

const modes = [
  { id: 'technical', label: 'Technical', icon: MonitorPlay, copy: 'Core concepts, frameworks, databases, design, and scenarios.' },
  { id: 'coding', label: 'Coding', icon: Code2, copy: 'Programming, algorithms, and problem-solving questions.' },
  { id: 'hr', label: 'HR & behavioral', icon: MessageCircle, copy: 'Experience, communication, motivation, and people skills.' },
  { id: 'full', label: 'Full mock', icon: Sparkles, copy: 'A mix of the requirements from this job description.' },
];

export default function InterviewStart() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [mode, setMode] = useState('full');
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { let active = true; Promise.all([api.get(`/jobs/${id}`), api.get(`/jobs/${id}/questions`)]).then(([board, bank]) => { if (active) { setJob(board.data.job); setQuestions(bank.data.questions); } }).catch((err) => { if (active) setError(apiError(err)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id]);

  async function start() {
    setBusy(true); setError('');
    try { const { data } = await api.post('/interviews/start', { jobId: id, mode, questionCount }); navigate(`/app/interviews/${data.session.id}`); }
    catch (err) { setError(apiError(err)); } finally { setBusy(false); }
  }

  if (loading) return <p className="text-sm text-[#819083]">Preparing interview options…</p>;
  if (!job) return <><Link to="/app/jobs" className="text-sm text-[#5a9150]">← Job boards</Link><p role="alert" className="mt-5 text-red-700">{error || 'Job board not found.'}</p></>;
  return <><Link to={`/app/jobs/${id}/questions`} className="inline-flex items-center gap-2 text-sm text-[#647866] hover:text-[#2f6330]"><ArrowLeft size={16} /> Question bank</Link><div className="mt-7 max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#5a9150]">{job.company} · {job.role}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Set up your interview</h1><p className="mt-2 text-sm leading-6 text-[#738075]">Choose a format. You’ll answer one question at a time and receive feedback before moving on.</p></div>
    {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {!questions.length ? <div className="mt-9 rounded-2xl border border-dashed border-[#cbd8c8] bg-white p-10 text-center"><BookOpenText size={28} className="mx-auto text-[#90ad88]" /><h2 className="mt-4 font-semibold">Generate questions first</h2><p className="mt-2 text-sm text-[#7f8c80]">This interview uses the question bank for this job board.</p><Link to={`/app/jobs/${id}/questions`} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#193322] px-5 py-2.5 text-sm font-semibold text-white">Go to question bank <ArrowRight size={16} /></Link></div> : <>
      <div className="mt-9 grid gap-4 sm:grid-cols-2">{modes.map(({ id: modeId, label, icon: Icon, copy }) => { const available = questions.filter((question) => modeId === 'full' || (modeId === 'technical' ? !['Programming and coding', 'Behavioral', 'HR interview'].includes(question.category) : modeId === 'coding' ? ['Programming and coding', 'Data structures and algorithms', 'Database and SQL'].includes(question.category) : ['Behavioral', 'HR interview', 'Project-based'].includes(question.category))).length; return <button type="button" key={modeId} disabled={!available} onClick={() => setMode(modeId)} className={`rounded-2xl border p-6 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${mode === modeId ? 'border-[#6ca463] bg-[#f1f8ee] shadow-[0_0_0_2px_rgba(108,164,99,.1)]' : 'border-[#e4e9e1] bg-white hover:border-[#bdd0b8]'}`}><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#568b4e]"><Icon size={21} /></span><span className="mt-5 block font-semibold">{label}</span><span className="mt-1 block text-sm leading-6 text-[#738075]">{copy}</span><span className="mt-4 block text-xs font-medium text-[#5e8b58]">{available} available questions</span></button>; })}</div>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-[#e4e9e1] bg-white p-6"><div><h2 className="font-semibold">Interview length</h2><p className="mt-1 text-sm text-[#839084]">The session may be shorter if this mode has fewer questions.</p></div><div className="flex gap-2">{[5, 10].map((count) => <button type="button" key={count} onClick={() => setQuestionCount(count)} className={`rounded-lg px-4 py-2 text-sm font-medium ${questionCount === count ? 'bg-[#193322] text-white' : 'border border-[#dce6d9] text-[#5d735f]'}`}>{count} questions</button>)}</div></div>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4"><p className="max-w-xl text-xs leading-5 text-[#8a978b]">Without an AI API key, answers receive unscored practice guidance. Only scored assessments will count toward future readiness results.</p><button disabled={busy} onClick={start} className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-ink hover:bg-[#b8ef81] disabled:opacity-60">{busy ? 'Starting…' : 'Start interview'} {!busy && <ArrowRight size={17} />}</button></div>
    </>}
  </>;
}
