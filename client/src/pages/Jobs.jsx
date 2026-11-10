import { useEffect, useState } from 'react';
import { BriefcaseBusiness, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import JobCard from '../components/JobCard.jsx';
import { api, apiError } from '../lib/api.js';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/jobs').then(({ data }) => setJobs(data.jobs)).catch((err) => setError(apiError(err))).finally(() => setLoading(false)); }, []);
  return <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#5a9150]">Your roles</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Job boards</h1><p className="mt-2 text-sm text-[#738075]">One preparation space for each opportunity.</p></div><Link to="/app/jobs/new" className="inline-flex items-center gap-2 rounded-xl bg-[#193322] px-5 py-3 text-sm font-semibold text-white hover:bg-[#285137]"><Plus size={17} /> New job board</Link></div>
    {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p className="mt-10 text-sm text-[#819083]">Loading job boards…</p> : jobs.length ? <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{jobs.map((job) => <JobCard key={job._id} job={job} />)}</div> : <div className="mt-10 rounded-2xl border border-dashed border-[#cbd8c8] bg-white px-6 py-16 text-center"><BriefcaseBusiness className="mx-auto text-[#90ad88]" size={30} /><h2 className="mt-5 text-lg font-semibold">Your first role starts here</h2><p className="mt-2 text-sm text-[#7f8c80]">Add a company, role, and job description to begin.</p><Link to="/app/jobs/new" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-ink"><Plus size={16} /> Create a board</Link></div>}</>;
}
