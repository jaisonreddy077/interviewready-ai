import { useEffect, useState } from 'react';
import { ArrowRight, Clock3, MessageCircle, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../lib/api.js';

const names = { technical: 'Technical', coding: 'Coding', hr: 'HR & behavioral', full: 'Full mock', challenge: 'Focused challenge' };

export default function InterviewHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/interviews/history').then(({ data }) => setSessions(data.sessions)).catch((err) => setError(apiError(err))).finally(() => setLoading(false)); }, []);
  return <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#5a9150]">Your practice</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Interview history</h1><p className="mt-2 text-sm text-[#738075]">Review past sessions and resume an interview in progress.</p></div><Link to="/app/jobs" className="inline-flex items-center gap-2 rounded-xl bg-[#193322] px-5 py-3 text-sm font-semibold text-white"><Plus size={16} /> Choose a job board</Link></div>
    {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p className="mt-10 text-sm text-[#819083]">Loading interviews…</p> : sessions.length ? <div className="mt-9 space-y-3">{sessions.map((session) => <Link key={session.id} to={`/app/interviews/${session.id}`} className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#e4e9e1] bg-white p-5 transition hover:border-[#bcd3b7] hover:shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf3e6] text-[#54864d]"><MessageCircle size={20} /></span><span className="min-w-0 flex-1"><span className="block font-semibold">{session.jobSnapshot?.company} · {session.jobSnapshot?.role}</span><span className="mt-1 block text-xs text-[#879488]">{names[session.mode]} · {session.answeredCount}/{session.questionCount} answered · {new Date(session.createdAt).toLocaleDateString()}</span></span><span className={`rounded-full px-3 py-1 text-xs font-medium ${session.status === 'active' ? 'bg-amber-50 text-amber-700' : 'bg-[#eaf5e8] text-[#4e8046]'}`}>{session.status === 'active' ? 'In progress' : 'Completed'}</span><ArrowRight size={17} className="text-[#91a291]" /></Link>)}</div> : <div className="mt-10 rounded-2xl border border-dashed border-[#cbd8c8] bg-white px-6 py-16 text-center"><Clock3 className="mx-auto text-[#90ad88]" size={30} /><h2 className="mt-5 text-lg font-semibold">No interviews yet</h2><p className="mt-2 text-sm text-[#7f8c80]">Open a job board and choose Start interview.</p></div>}
  </>;
}
