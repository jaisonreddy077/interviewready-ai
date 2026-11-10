import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function JobCard({ job }) {
  return <Link to={`/app/jobs/${job._id}`} className="group block rounded-2xl border border-[#e4e9e1] bg-white p-6 transition hover:-translate-y-0.5 hover:border-[#bed4b5] hover:shadow-lg hover:shadow-[#173c17]/5">
    <div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf3e6] text-[#508045]"><BriefcaseBusiness size={20} /></span><ArrowUpRight size={18} className="text-[#a8b3a7] transition group-hover:text-[#3a7436]" /></div>
    <p className="mt-6 text-xs font-medium uppercase tracking-[.12em] text-[#829181]">{job.company}</p><h3 className="mt-1 line-clamp-2 text-lg font-semibold">{job.role}</h3>
    <div className="mt-5 flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f3f5f1] px-2.5 py-1 text-xs text-[#687769]">{job.experienceLevel}</span><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${job.analysis ? 'bg-[#eaf6e5] text-[#41773a]' : 'bg-amber-50 text-amber-700'}`}>{job.analysis ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}{job.analysis ? 'Analyzed' : 'Needs analysis'}</span></div>
  </Link>;
}
