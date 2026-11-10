import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Brand from '../components/Brand.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api, apiError } from '../lib/api.js';

export default function AuthPage({ mode }) {
  const register = mode === 'register';
  const { user, acceptSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/app" replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = register ? form : { email: form.email, password: form.password };
      const { data } = await api.post(register ? '/auth/register' : '/auth/login', payload);
      acceptSession(data);
      navigate(location.state?.from?.pathname || '/app', { replace: true });
    } catch (requestError) {
      setError(apiError(requestError));
    } finally { setBusy(false); }
  }

  return <div className="grid min-h-screen bg-ink text-white lg:grid-cols-2">
    <div className="flex min-h-screen flex-col px-6 py-7 sm:px-12 lg:px-16">
      <Brand />
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-14">
        <div className="mb-8"><span className="inline-flex rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs text-accent">YOUR SPACE TO GROW</span><h1 className="mt-5 text-4xl font-semibold tracking-tight">{register ? 'Create your account' : 'Welcome back'}</h1><p className="mt-3 text-sm leading-6 text-slate-400">{register ? 'Build a more focused path to your next opportunity.' : 'Sign in to continue your interview preparation.'}</p></div>
        <form onSubmit={submit} className="space-y-5">
          {register && <label className="block"><span className="mb-2 block text-sm font-medium text-slate-200">Full name</span><span className="relative block"><UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input className="field" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} minLength={2} maxLength={80} placeholder="Your name" required /></span></label>}
          <label className="block"><span className="mb-2 block text-sm font-medium text-slate-200">Email address</span><span className="relative block"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input className="field" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required /></span></label>
          <label className="block"><span className="mb-2 block text-sm font-medium text-slate-200">Password</span><span className="relative block"><LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input className="field pr-12" type={visible ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={register ? 8 : undefined} placeholder={register ? 'At least 8 characters' : 'Enter your password'} required /><button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white" type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          {error && <div role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 font-semibold text-ink transition hover:bg-[#b8ef81] disabled:cursor-wait disabled:opacity-70" type="submit">{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'} {!busy && <ArrowRight size={18} />}</button>
        </form>
        <p className="mt-7 text-center text-sm text-slate-400">{register ? 'Already have an account?' : 'New to InterviewReady AI?'} <Link className="font-medium text-accent hover:underline" to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p>
      </div>
      <p className="text-center text-xs text-slate-600">Readiness is an estimate based on completed assessments.</p>
    </div>
    <aside className="relative hidden min-h-screen overflow-hidden border-l border-white/10 bg-[#121c2c] px-16 py-16 lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-20 top-0 h-[500px] w-[500px] rounded-full bg-accent/10 blur-[100px]" /><span className="relative text-sm font-medium text-accent">INTERVIEWREADY AI</span><div className="relative max-w-lg"><div className="mb-10 flex gap-2">{[1,2,3,4,5].map((n) => <span key={n} className="h-2 w-2 rounded-full bg-accent" />)}</div><h2 className="text-5xl font-semibold leading-tight tracking-[-.05em]">Confidence comes from <span className="text-accent">knowing what to work on.</span></h2><p className="mt-6 max-w-md text-lg leading-8 text-slate-400">A calmer, clearer way to prepare for interviews that matter.</p></div><div className="relative rounded-2xl border border-white/10 bg-white/5 p-6"><p className="text-sm leading-6 text-slate-300">“Preparation makes the difference. Start with the role, practice deliberately, and see your progress.”</p><p className="mt-5 text-xs text-slate-500">YOUR INTERVIEW PREPARATION WORKSPACE</p></div></aside>
  </div>;
}
