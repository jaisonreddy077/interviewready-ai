import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenText, CalendarDays, CheckCircle2, FileText, LoaderCircle, RefreshCw, Save, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, apiError } from '../lib/api.js';

const sections = [
  ['Required technical skills', 'requiredTechnicalSkills'], ['Programming languages', 'programmingLanguages'],
  ['Frameworks & technologies', 'frameworksAndTechnologies'], ['Data structures & algorithms', 'dataStructuresAndAlgorithms'],
  ['Database knowledge', 'databases'], ['System design', 'systemDesign'],
  ['Projects & practical experience', 'projectsAndExperience'], ['Soft skills', 'softSkills'],
  ['Preferred qualifications', 'preferredQualifications'], ['Important keywords', 'importantKeywords'],
];

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [job, setJob] = useState(null);
  const [details, setDetails] = useState({ company: '', role: '', experienceLevel: 'Entry level' });
  const [analysis, setAnalysis] = useState(null);
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.notice || '');

  useEffect(() => { let active = true; api.get(`/jobs/${id}`).then(({ data }) => { if (active) { setJob(data.job); setAnalysis(data.analysis); setJdText(data.job.jdText); setDetails({ company: data.job.company, role: data.job.role, experienceLevel: data.job.experienceLevel }); } }).catch((err) => { if (active) setError(apiError(err)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id]);

  async function saveDetails(event) {
    event.preventDefault(); setBusy('details'); setError(''); setNotice('');
    try { const { data } = await api.put(`/jobs/${id}`, details); setJob(data.job); if (data.analysisInvalidated) setAnalysis(null); setNotice(data.analysisInvalidated ? 'Board details saved. Run analysis and regenerate questions for the updated role.' : 'Board details saved.'); }
    catch (err) { setError(apiError(err)); } finally { setBusy(''); }
  }

  async function save() {
    setBusy('save'); setError(''); setNotice('');
    try { const { data } = await api.put(`/jobs/${id}`, { jdText }); setJob(data.job); if (data.analysisInvalidated) setAnalysis(null); setNotice('Job description saved. Run analysis and regenerate questions for the new JD.'); }
    catch (err) { setError(apiError(err)); } finally { setBusy(''); }
  }

  async function analyze() {
    setBusy('analyze'); setError(''); setNotice('');
    try { const { data } = await api.post(`/jobs/${id}/analyze`, { jdText }); setAnalysis(data.analysis); setJob((current) => ({ ...current, jdText })); setNotice('Analysis updated. Regenerate questions to match the latest requirements.'); }
    catch (err) { setError(apiError(err)); } finally { setBusy(''); }
  }

  async function remove() {
    if (!window.confirm(`Delete the board for ${job.company} – ${job.role}?`)) return;
    setBusy('delete'); setError('');
    try { await api.delete(`/jobs/${id}`); navigate('/app/jobs'); }
    catch (err) { setError(apiError(err)); setBusy(''); }
  }

  if (loading) return <p className="text-sm text-[#819083]">Loading job board…</p>;
  if (!job) return <><Link to="/app/jobs" className="text-sm text-[#5a9150]">← Job boards</Link><p role="alert" className="mt-5 text-red-700">{error || 'Job board not found.'}</p></>;
  return <><Link to="/app/jobs" className="inline-flex items-center gap-2 text-sm text-[#647866] hover:text-[#2f6330]"><ArrowLeft size={16} /> Job boards</Link><div className="mt-7 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#5a9150]">{job.company}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{job.role}</h1><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-[#eaf3e6] px-3 py-1 text-xs text-[#4e774a]">{job.experienceLevel}</span>{job.jdFilename && <span className="rounded-full bg-[#f0f2ef] px-3 py-1 text-xs text-[#6a766b]">PDF: {job.jdFilename}</span>}</div></div><button onClick={remove} disabled={!!busy} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 size={14} /> Delete board</button></div>
    {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="mt-6 rounded-xl border border-[#d8e8d2] bg-[#f1f8ee] p-4 text-sm text-[#416e3d]">{notice}</p>}
    {analysis && <Link to={`/app/jobs/${id}/questions`} className="mt-7 flex flex-wrap items-center gap-4 rounded-2xl border border-[#d8e8d2] bg-[#f1f8ee] p-5 transition hover:border-[#a8cda0]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#4f8648]"><BookOpenText size={21} /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-[#284c2c]">Interview question bank</span><span className="mt-1 block text-xs text-[#718a6e]">Generate questions linked to this job description’s requirements.</span></span><ArrowRight size={18} className="text-[#4f8648]" /></Link>}
    <Link to={`/app/jobs/${id}/readiness`} className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-[#e0e8dc] bg-white p-5 transition hover:border-[#a8cda0]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf3e6] text-[#4f8648]"><ShieldCheck size={21} /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-[#284c2c]">Job readiness</span><span className="mt-1 block text-xs text-[#718a6e]">See assessment coverage, score evidence, and focused challenges.</span></span><ArrowRight size={18} className="text-[#4f8648]" /></Link>
    <Link to={`/app/jobs/${id}/roadmap`} className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-[#e0e8dc] bg-white p-5 transition hover:border-[#a8cda0]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf3e6] text-[#4f8648]"><CalendarDays size={21} /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-[#284c2c]">Preparation roadmap</span><span className="mt-1 block text-xs text-[#718a6e]">Follow daily tasks prioritized by your results and this job’s requirements.</span></span><ArrowRight size={18} className="text-[#4f8648]" /></Link>
    <form onSubmit={saveDetails} className="mt-8 grid gap-4 rounded-2xl border border-[#e4e9e1] bg-white p-6 md:grid-cols-[1fr_1fr_160px_auto] md:items-end"><label className="block"><span className="mb-2 block text-xs font-medium text-[#667668]">Company</span><input className="light-field" value={details.company} minLength={2} maxLength={120} required onChange={(e) => setDetails({ ...details, company: e.target.value })} /></label><label className="block"><span className="mb-2 block text-xs font-medium text-[#667668]">Role</span><input className="light-field" value={details.role} minLength={2} maxLength={120} required onChange={(e) => setDetails({ ...details, role: e.target.value })} /></label><label className="block"><span className="mb-2 block text-xs font-medium text-[#667668]">Level</span><select className="light-field" value={details.experienceLevel} onChange={(e) => setDetails({ ...details, experienceLevel: e.target.value })}>{['Internship', 'Entry level', 'Mid level', 'Senior'].map((level) => <option key={level}>{level}</option>)}</select></label><button disabled={!!busy || (details.company === job.company && details.role === job.role && details.experienceLevel === job.experienceLevel)} className="rounded-xl border border-[#d6e1d2] px-4 py-3 text-sm font-medium text-[#496e43] disabled:opacity-50">Save details</button></form>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]"><section className="rounded-2xl border border-[#e4e9e1] bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf3e6] text-[#508045]"><FileText size={19} /></span><div><h2 className="font-semibold">Job description</h2><p className="text-xs text-[#8a978b]">Edit the source text anytime</p></div></div><textarea className="light-field mt-6 min-h-[380px] resize-y text-sm leading-6" value={jdText} maxLength={20000} onChange={(e) => setJdText(e.target.value)} /><div className="mt-4 flex flex-wrap gap-2"><button onClick={save} disabled={!!busy || jdText === job.jdText} className="inline-flex items-center gap-2 rounded-lg border border-[#d6e1d2] px-4 py-2.5 text-sm font-medium text-[#496e43] disabled:opacity-50"><Save size={15} /> Save changes</button><button onClick={analyze} disabled={!!busy || jdText.trim().length < 30} className="inline-flex items-center gap-2 rounded-lg bg-[#193322] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">{busy === 'analyze' ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />} {busy === 'analyze' ? 'Analyzing…' : 'Analyze JD'}</button></div></section>
      <section className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#5a9150]">Role intelligence</p><h2 className="mt-2 text-2xl font-semibold">JD analysis</h2></div>{analysis && <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${analysis.source === 'ai' ? 'bg-[#eaf3e6] text-[#4e774a]' : 'bg-amber-50 text-amber-700'}`}>{analysis.source === 'ai' ? <Sparkles size={13} /> : <CheckCircle2 size={13} />}{analysis.source === 'ai' ? 'AI analysis' : 'Keyword extraction'}</span>}</div>
        {analysis ? <><div className="mt-5 rounded-2xl border border-[#dce9d7] bg-[#f1f8ee] p-6"><p className="text-sm font-medium text-[#416e3d]">Overview</p><p className="mt-2 text-sm leading-6 text-[#526c52]">{analysis.summary}</p><p className="mt-4 text-xs leading-5 text-[#7a9079]">{analysis.note}</p></div><div className="mt-4 grid gap-4 md:grid-cols-2">{sections.map(([title, key]) => <div key={key} className="min-w-0 rounded-2xl border border-[#e4e9e1] bg-white p-5"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-semibold">{title}</h3><span className="rounded-full bg-[#f1f4ef] px-2 py-0.5 text-xs text-[#7b8c79]">{analysis[key]?.length || 0}</span></div>{analysis[key]?.length ? <ul className="mt-4 flex flex-wrap gap-1.5">{analysis[key].map((item, index) => <li key={`${item}-${index}`} className="max-w-full break-words rounded-md bg-[#f2f6f0] px-2.5 py-1.5 text-xs leading-5 text-[#4d6950]">{item}</li>)}</ul> : <p className="mt-4 text-xs text-[#9ba79b]">Not mentioned in the description</p>}</div>)}</div></> : <div className="mt-5 rounded-2xl border border-dashed border-[#cbd8c8] bg-white px-6 py-16 text-center"><Sparkles className="mx-auto text-[#90ad88]" size={26} /><h3 className="mt-4 font-semibold">No analysis yet</h3><p className="mt-2 text-sm text-[#7f8c80]">Add a job description and select Analyze JD.</p></div>}</section></div>
  </>;
}
