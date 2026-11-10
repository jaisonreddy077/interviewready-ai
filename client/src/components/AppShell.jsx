import { useState } from 'react';
import { BriefcaseBusiness, LayoutDashboard, LogOut, Menu, MessageCircle, Sparkles, UserRound, X } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Brand from './Brand.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/jobs', label: 'Job boards', icon: BriefcaseBusiness },
  { to: '/app/interviews', label: 'Interview history', icon: MessageCircle },
];

export default function AppShell() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  function leave() { signOut(); navigate('/'); }
  return <div className="min-h-screen bg-[#f7f8f6] text-[#17211a] lg:flex">
    {open && <button aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-20 bg-black/45 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-ink px-4 py-6 text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between px-2"><Brand /><button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
      <p className="mt-12 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Workspace</p>
      <nav className="mt-3 space-y-1">{links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-accent/10 font-medium text-accent' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Icon size={17} />{label}</NavLink>)}</nav>
      <div className="mt-7 rounded-xl border border-white/10 bg-white/[.035] p-4"><Sparkles size={16} className="text-accent" /><p className="mt-3 text-sm font-medium">Practice with purpose</p><p className="mt-1 text-xs leading-5 text-slate-500">Open a question bank to start a role-focused interview.</p></div>
      <div className="mt-auto space-y-2"><div className="flex items-center gap-3 rounded-xl border border-white/10 p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent"><UserRound size={17} /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div></div><button onClick={leave} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white"><LogOut size={17} /> Sign out</button></div>
    </aside>
    <div className="min-w-0 flex-1"><header className="flex h-20 items-center justify-between border-b border-[#e6e9e3] bg-white px-6 lg:px-10"><div className="flex items-center gap-3"><button className="text-[#344237] lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button><div><p className="text-xs text-[#899388]">InterviewReady AI / Workspace</p><p className="text-lg font-semibold">Your preparation</p></div></div><div className="flex items-center gap-3"><span className="hidden text-sm text-[#647066] sm:inline">Hi, {user.name.split(' ')[0]}</span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e7f3df] text-sm font-semibold text-[#35682f]">{user.name[0]?.toUpperCase()}</span></div></header><main className="mx-auto max-w-6xl px-6 py-10 lg:px-10"><Outlet /></main></div>
  </div>;
}
