import { ArrowRight, BarChart3, Check, ChevronRight, Compass, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const features = [
  { icon: Compass, title: 'Prepare with direction', copy: 'Turn a job description into a focused plan for the exact role you want.' },
  { icon: MessageSquareText, title: 'Practice with purpose', copy: 'Work through relevant interview questions and get actionable feedback.' },
  { icon: BarChart3, title: 'See real progress', copy: 'Track readiness from completed assessments, with coverage shown clearly.' },
];

export default function Landing() {
  const { user } = useAuth();
  return <div className="min-h-screen overflow-hidden bg-ink text-white">
    <div className="absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(ellipse_at_70%_15%,rgba(111,168,121,.16),transparent_45%)] pointer-events-none" />
    <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
      <Brand />
      <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex"><a href="#how-it-works" className="hover:text-white">How it works</a><a href="#features" className="hover:text-white">Features</a></nav>
      <Link to={user ? '/app' : '/login'} className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium transition hover:border-white/30 hover:bg-white/5">{user ? 'Open dashboard' : 'Sign in'}</Link>
    </header>

    <main className="relative">
      <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-20 lg:grid-cols-[1.04fr_.96fr] lg:items-center lg:px-10 lg:pb-32 lg:pt-24">
        <div className="max-w-2xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3.5 py-1.5 text-xs font-medium text-accent"><Sparkles size={13} /> A more intentional way to get interview ready <ChevronRight size={13} /></div>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-.055em] sm:text-6xl lg:text-[72px]">Your next role deserves <span className="text-accent">better preparation.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">A focused space to understand the role, practice the right questions, and see where your preparation stands.</p>
          <div className="mt-9 flex flex-wrap items-center gap-4"><Link to={user ? '/app' : '/register'} className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-semibold text-ink transition hover:bg-[#b8ef81]">{user ? 'Go to dashboard' : 'Get started free'} <ArrowRight size={18} /></Link><a href="#how-it-works" className="px-4 py-3.5 text-sm font-medium text-slate-300 hover:text-white">See how it works</a></div>
          <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-400"><span className="flex items-center gap-2"><Check size={16} className="text-accent" /> Role focused</span><span className="flex items-center gap-2"><Check size={16} className="text-accent" /> Evidence based</span><span className="flex items-center gap-2"><Check size={16} className="text-accent" /> Built for progress</span></div>
        </div>
        <div className="relative mx-auto w-full max-w-[560px] lg:ml-auto">
          <div className="absolute -inset-8 rounded-[40px] bg-accent/5 blur-3xl" />
          <div className="relative rounded-[22px] border border-white/10 bg-[#121a29] p-4 shadow-[0_32px_100px_rgba(0,0,0,.35)] sm:p-5">
            <div className="flex items-center justify-between border-b border-white/10 px-2 pb-4"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent" /><span className="text-xs font-medium text-slate-300">YOUR PREPARATION SPACE</span></div><span className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-slate-400">PREVIEW</span></div>
            <div className="grid gap-4 pt-5 sm:grid-cols-[1.15fr_.85fr]">
              <div className="rounded-2xl border border-white/10 bg-[#182235] p-6"><p className="text-xs text-slate-400">Job readiness</p><div className="mt-8 flex items-end gap-2"><span className="text-6xl font-semibold tracking-tight">72<span className="text-3xl text-accent">%</span></span><span className="mb-2 rounded-full bg-accent/10 px-2 py-1 text-[11px] text-accent">Developing</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[72%] rounded-full bg-accent" /></div><p className="mt-3 text-[11px] text-slate-400">Based on completed practice · Sample data</p></div>
              <div className="rounded-2xl border border-white/10 bg-[#182235] p-6"><p className="text-xs text-slate-400">Assessment coverage</p><p className="mt-8 text-4xl font-semibold">4<span className="text-lg text-slate-400"> / 6</span></p><p className="mt-2 text-xs text-slate-400">areas evaluated</p><div className="mt-5 flex gap-1.5">{[1,2,3,4,5,6].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= 4 ? 'bg-accent' : 'bg-white/10'}`} />)}</div></div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#182235] p-6"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-400">Your focus areas</p><p className="mt-1 text-sm font-semibold">Keep building momentum</p></div><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent"><BarChart3 size={17} /></span></div><div className="mt-6 space-y-4">{[['Technical skills','82%','w-[82%]'],['Problem solving','58%','w-[58%]'],['Communication','74%','w-[74%]']].map(([name,value,width]) => <div key={name}><div className="mb-2 flex justify-between text-xs"><span className="text-slate-300">{name}</span><span className="text-slate-400">{value}</span></div><div className="h-1.5 rounded-full bg-white/10"><div className={`h-full rounded-full bg-accent ${width}`} /></div></div>)}</div></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-white/10 bg-white/[.025] px-6 py-16 lg:px-10"><div className="mx-auto max-w-7xl"><p className="text-xs font-semibold uppercase tracking-[.2em] text-accent">How it works</p><h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">From job description to a clear next step.</h2><div id="features" className="mt-10 grid gap-4 md:grid-cols-3">{features.map(({ icon: Icon, title, copy }, index) => <div key={title} className="rounded-2xl border border-white/10 bg-panel p-7"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent"><Icon size={21} /></span><span className="text-xs text-slate-500">0{index + 1}</span></div><h3 className="mt-7 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p></div>)}</div></div></section>
      <section className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-20 md:flex-row md:items-center lg:px-10"><div><h2 className="text-3xl font-semibold tracking-tight">Start preparing for what’s next.</h2><p className="mt-2 text-slate-400">Create your account and make your next move count.</p></div><Link to={user ? '/app' : '/register'} className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-semibold text-ink hover:bg-[#b8ef81]">Get started <ArrowRight size={18} /></Link></section>
    </main>
    <footer className="border-t border-white/10 px-6 py-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-xs text-slate-500 sm:flex-row"><span>© {new Date().getFullYear()} InterviewReady AI</span><span className="flex items-center gap-2"><ShieldCheck size={14} /> Readiness estimates reflect completed assessments, not hiring outcomes.</span></div></footer>
  </div>;
}
