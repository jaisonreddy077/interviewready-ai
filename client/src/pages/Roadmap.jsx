import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, Circle, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api, apiError } from '../lib/api.js';

export default function Roadmap() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { let active = true; api.get(`/jobs/${id}/roadmap`).then(({ data: result }) => { if (active) setData(result); }).catch((err) => { if (active) setError(apiError(err)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id]);

  async function generate() {
    setBusy('generate'); setError('');
    try { const { data: result } = await api.post(`/jobs/${id}/roadmap`, {}); setData(result); }
    catch (err) { setError(apiError(err)); } finally { setBusy(''); }
  }

  async function toggle(task) {
    setBusy(task._id); setError('');
    try { const { data: result } = await api.put(`/roadmap/${data.roadmap._id}`, { taskId: task._id, completed: !task.completed }); setData(result); }
    catch (err) { setError(apiError(err)); } finally { setBusy(''); }
  }

  if (loading) return <p className="text-sm text-[#819083]">Loading preparation plan…</p>;
  if (!data) return <><Link to="/app/jobs" className="text-sm text-[#5a9150]">← Job boards</Link><p role="alert" className="mt-5 text-red-700">{error || 'Roadmap unavailable.'}</p></>;
  const { roadmap, job, progress } = data;
  const weeks = roadmap ? [...new Set(roadmap.tasks.map((task) => task.week))] : [];
  return <><Link to={`/app/jobs/${id}`} className="inline-flex items-center gap-2 text-sm text-[#647866]"><ArrowLeft size={16} /> {job.company} · {job.role}</Link>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#5a9150]">Personalized preparation</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Your roadmap</h1><p className="mt-2 max-w-2xl text-sm text-[#738075]">A daily plan ordered by your scored gaps and this job’s requirements. Unassessed topics are clearly marked.</p></div><button onClick={generate} disabled={!!busy} className="inline-flex items-center gap-2 rounded-xl bg-[#193322] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy === 'generate' ? <LoaderCircle size={16} className="animate-spin" /> : roadmap ? <RefreshCw size={16} /> : <Sparkles size={16} />}{roadmap ? 'Refresh priorities' : 'Generate roadmap'}</button></div>
    {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {!roadmap ? <div className="mt-9 rounded-2xl border border-dashed border-[#cbd8c8] bg-white px-6 py-16 text-center"><BookOpen className="mx-auto text-[#90ad88]" size={30} /><h2 className="mt-4 text-lg font-semibold">No roadmap yet</h2><p className="mx-auto mt-2 max-w-lg text-sm text-[#7f8c80]">Analyze the job description, then generate a plan. You can start before taking any scored interviews; unassessed topics will be shown honestly.</p><Link to={`/app/jobs/${id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#4f784b]">Open job board <ArrowRight size={15} /></Link></div> : <>
      <section className="mt-8 rounded-2xl bg-[#193322] p-7 text-white sm:p-9"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-[#b7d7b3]">Preparation progress</p><p className="mt-3 text-4xl font-semibold">{progress.percent}%</p><p className="mt-2 text-sm text-[#c1d0c2]">{progress.completed} of {progress.total} activities completed across {weeks.length} weeks</p></div><CalendarDays className="text-[#a6c9a1]" size={35} /></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-accent" style={{ width: `${progress.percent}%` }} /></div><p className="mt-4 text-xs text-[#b7cfb5]">Refresh priorities after new scored interviews. Completed activities stay checked when the same topic remains in the plan.</p></section>
      <div className="mt-8 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-rose-50 px-3 py-1.5 font-medium text-rose-700">Focus: scored below 75</span><span className="rounded-full bg-amber-50 px-3 py-1.5 font-medium text-amber-800">Unassessed: no scored evidence</span><span className="rounded-full bg-[#eaf3e6] px-3 py-1.5 font-medium text-[#4f784b]">Review: scored 75 or above</span></div>
      <div className="mt-8 space-y-8">{weeks.map((week) => <section key={week}><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#eaf3e6] text-sm font-semibold text-[#4f784b]">{week}</span><h2 className="text-xl font-semibold">Week {week}</h2></div><div className="mt-4 grid gap-3">{roadmap.tasks.filter((task) => task.week === week).map((task) => <article key={task._id} className={`rounded-2xl border p-5 sm:p-6 ${task.completed ? 'border-[#d7e8d2] bg-[#f5faf2]' : 'border-[#e4e9e1] bg-white'}`}><div className="flex items-start gap-4"><button type="button" aria-label={`${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`} onClick={() => toggle(task)} disabled={!!busy} className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border disabled:opacity-50 ${task.completed ? 'border-[#5a9150] bg-[#5a9150] text-white' : 'border-[#b9cbb5] text-[#8aa087]'}`}>{busy === task._id ? <LoaderCircle size={16} className="animate-spin" /> : task.completed ? <Check size={17} /> : <Circle size={17} />}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-[#7a9079]">Day {task.day}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${task.priority === 'Focus' ? 'bg-rose-50 text-rose-700' : task.priority === 'Unassessed' ? 'bg-amber-50 text-amber-800' : 'bg-[#eaf3e6] text-[#4f784b]'}`}>{task.priority}</span></div><h3 className={`mt-2 font-semibold ${task.completed ? 'text-[#719072] line-through' : ''}`}>{task.title}</h3><p className="mt-2 text-sm leading-6 text-[#647565]">{task.action}</p><p className="mt-3 text-xs text-[#8a988a]">{task.reason}</p></div></div></article>)}</div></section>)}</div>
      <p className="mt-8 text-xs leading-5 text-[#8c998d]">These activities are study suggestions based on JD terms and answer evidence. Completing a task tracks preparation; it does not raise readiness until you submit scored interview answers.</p>
    </>}
  </>;
}
