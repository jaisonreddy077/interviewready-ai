import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Brand({ compact = false }) {
  return <Link to="/" className="inline-flex items-center gap-3 text-white" aria-label="InterviewReady AI home">
    <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-ink shadow-[0_0_24px_rgba(168,226,110,.22)]"><Sparkles size={21} strokeWidth={2.4} /></span>
    {!compact && <span className="text-[17px] font-semibold tracking-tight">InterviewReady <span className="text-accent">AI</span></span>}
  </Link>;
}
