import { useState } from 'react';
import { ArrowLeft, ArrowRight, FileText, UploadCloud } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiError } from '../lib/api.js';

export default function NewJob() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ company: '', role: '', experienceLevel: 'Entry level', jdText: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!file && form.jdText.trim().length < 30) { setError('Paste at least 30 characters of the job description or select a PDF.'); return; }
    if (file && file.size > 5 * 1024 * 1024) { setError('PDF must be smaller than 5 MB.'); return; }
    setBusy(true); setError('');
    try {
      const payload = new FormData();
      payload.append('company', form.company);
      payload.append('role', form.role);
      payload.append('experienceLevel', form.experienceLevel);
      if (file) payload.append('file', file);
      else payload.append('jdText', form.jdText);
      const { data } = await api.post('/jobs', payload);
      try { await api.post(`/jobs/${data.job._id}/analyze`); navigate(`/app/jobs/${data.job._id}`); }
      catch (analysisError) { navigate(`/app/jobs/${data.job._id}`, { state: { notice: `Board saved, but analysis could not complete: ${apiError(analysisError)}` } }); }
    } catch (requestError) { setError(apiError(requestError)); }
    finally { setBusy(false); }
  }

  return <><Link to="/app/jobs" className="inline-flex items-center gap-2 text-sm text-[#647866] hover:text-[#2f6330]"><ArrowLeft size={16} /> Job boards</Link><div className="mt-7 max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#5a9150]">New opportunity</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Create a job board</h1><p className="mt-2 text-sm leading-6 text-[#738075]">Add the role and its job description. We’ll organize the requirements into a focused overview.</p></div>
    <form onSubmit={submit} className="mt-9 max-w-3xl space-y-7 rounded-2xl border border-[#e4e9e1] bg-white p-6 sm:p-9"><div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm font-medium">Company name</span><input className="light-field" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} minLength={2} maxLength={120} placeholder="e.g. Microsoft" required /></label><label className="block"><span className="mb-2 block text-sm font-medium">Job role</span><input className="light-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} minLength={2} maxLength={120} placeholder="e.g. Software Engineer" required /></label></div>
      <label className="block"><span className="mb-2 block text-sm font-medium">Experience level</span><select className="light-field" value={form.experienceLevel} onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}>{['Internship', 'Entry level', 'Mid level', 'Senior'].map((level) => <option key={level}>{level}</option>)}</select></label>
      <div className="border-t border-[#edf0ea] pt-7"><label className="block"><span className="mb-2 block text-sm font-medium">Job description</span><span className="mb-3 block text-xs text-[#8a978b]">Paste the description or upload a PDF. If both are supplied, the PDF is used.</span><textarea className="light-field min-h-56 resize-y" value={form.jdText} onChange={(e) => setForm({ ...form, jdText: e.target.value })} maxLength={20000} placeholder="Paste the responsibilities, requirements, and qualifications here…" /></label><div className="mt-4"><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#bdd0b8] bg-[#f8fbf7] px-5 py-4 hover:border-[#79a66e]"><UploadCloud size={20} className="text-[#57894f]" /><span className="min-w-0 flex-1 truncate text-sm text-[#58705c]">{file ? file.name : 'Choose a PDF job description (max 5 MB)'}</span><span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-[#426e3b]">Browse</span><input type="file" accept=".pdf,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>{file && <button type="button" onClick={() => setFile(null)} className="mt-2 text-xs text-[#6f8f69] hover:underline">Remove PDF</button>}</div></div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0ea] pt-6"><p className="flex items-center gap-2 text-xs text-[#98a399]"><FileText size={14} /> Your description stays with this board.</p><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#193322] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285137] disabled:opacity-60">{busy ? 'Creating and analyzing…' : 'Create & analyze'} {!busy && <ArrowRight size={17} />}</button></div>
    </form></>;
}
