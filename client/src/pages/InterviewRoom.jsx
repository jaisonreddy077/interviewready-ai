import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Flag, LoaderCircle, MessageCircle, Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { api, apiError } from '../lib/api.js';

const modeNames = { technical: 'Technical interview', coding: 'Coding interview', hr: 'HR interview', full: 'Full mock interview', challenge: 'Focused challenge' };
const scoreLabels = [
  ['technicalCorrectness', 'Correctness / relevance'], ['depth', 'Depth'], ['practicalApplicability', 'Practical application'],
  ['completeness', 'Completeness'], ['clarity', 'Clarity'], ['algorithmSelection', 'Algorithm choice'],
  ['timeComplexity', 'Time complexity'], ['spaceComplexity', 'Space complexity'], ['edgeCases', 'Edge cases'], ['codeCorrectness', 'Code correctness'],
];

function Feedback({ evaluation }) {
  const coding = ['Programming and coding', 'Data structures and algorithms'].includes(evaluation.category);
  const visibleScores = coding ? scoreLabels : scoreLabels.slice(0, 5);
  return <div className="space-y-5">
    <div className={`rounded-2xl border p-6 ${evaluation.assessed ? 'border-[#d8e8d2] bg-[#f1f8ee]' : 'border-amber-200 bg-amber-50'}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#658760]">Answer feedback</p><h2 className="mt-2 text-2xl font-semibold">{evaluation.assessed ? `${evaluation.score}/100` : 'Unscored practice'}</h2></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#668064]">{evaluation.assessed ? 'AI evaluated' : 'Practice guidance'}</span></div><p className="mt-3 text-sm leading-6 text-[#667b64]">{evaluation.note}</p></div>
    {evaluation.assessed && evaluation.scores && <div className="rounded-2xl border border-[#e4e9e1] bg-white p-6"><h3 className="font-semibold">Score breakdown</h3><div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">{visibleScores.map(([key, label]) => <div key={key}><div className="mb-1.5 flex justify-between text-xs"><span className="text-[#6e7e70]">{label}</span><span className="font-semibold">{evaluation.scores[key]}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#edf1eb]"><div className="h-full rounded-full bg-[#8dc67e]" style={{ width: `${evaluation.scores[key]}%` }} /></div></div>)}</div></div>}
    <div className="grid gap-4 md:grid-cols-2">{[
      ['What you got right', evaluation.correctPoints, 'text-[#457a3e]'],
      [evaluation.assessed ? 'Missing concepts' : 'Topics to revisit', evaluation.missingConcepts, 'text-amber-700'],
      ['Incorrect information', evaluation.incorrectClaims, 'text-red-700'],
      ['How to improve', evaluation.improvements, 'text-[#446e5e]'],
    ].map(([title, items, color]) => <div key={title} className="rounded-2xl border border-[#e4e9e1] bg-white p-5"><h3 className={`text-sm font-semibold ${color}`}>{title}</h3>{items?.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#667468]">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p className="mt-3 text-xs text-[#9aa69a]">{evaluation.assessed ? 'None noted.' : 'Not assessed without AI evaluation.'}</p>}</div>)}</div>
    {evaluation.idealAnswer && <div className="rounded-2xl border border-[#e4e9e1] bg-white p-6"><h3 className="font-semibold">Strong answer example</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#627364]">{evaluation.idealAnswer}</p></div>}
    {evaluation.followUpQuestion && <div className="rounded-2xl border border-[#e4e9e1] bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#859985]">Suggested follow-up</p><p className="mt-2 text-sm font-medium text-[#435c46]">{evaluation.followUpQuestion}</p></div>}
  </div>;
}

export default function InterviewRoom() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [answer, setAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [challengeResult, setChallengeResult] = useState(null);

  useEffect(() => { let active = true; api.get(`/interviews/${sessionId}`).then(({ data }) => { if (active) { setSession(data.session); setEvaluations(data.evaluations); setShowFeedback(data.session.status === 'completed' && data.evaluations.length > 0); } }).catch((err) => { if (active) setError(apiError(err)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [sessionId]);
  useEffect(() => {
    if (session?.mode !== 'challenge' || session.status !== 'completed') return;
    let active = true;
    api.get(`/jobs/${session.jobBoard}/readiness`).then(({ data }) => { if (active) setChallengeResult(data); }).catch(() => {});
    return () => { active = false; };
  }, [session?.mode, session?.status, session?.jobBoard]);

  async function submit(event) {
    event.preventDefault();
    if (answer.trim().length < 20) { setError('Please write at least 20 characters before submitting.'); return; }
    setBusy(true); setError('');
    try {
      const { data } = await api.post(`/interviews/${sessionId}/answer`, { questionId: session.currentQuestion.id, answer });
      setSession(data.session); setEvaluations((items) => [...items, data.evaluation]); setAnswer(''); setShowFeedback(true);
    } catch (err) {
      setError(apiError(err));
      if (err.response?.status === 409) api.get(`/interviews/${sessionId}`).then(({ data }) => { setSession(data.session); setEvaluations(data.evaluations); }).catch(() => {});
    } finally { setBusy(false); }
  }

  async function finish() {
    if (!window.confirm('Finish this interview now? Your submitted answers will be saved.')) return;
    setBusy(true); setError('');
    try { const { data } = await api.post(`/interviews/${sessionId}/complete`, {}); setSession(data.session); setShowFeedback(evaluations.length > 0); }
    catch (err) { setError(apiError(err)); } finally { setBusy(false); }
  }

  if (loading) return <p className="text-sm text-[#819083]">Loading interview…</p>;
  if (!session) return <><Link to="/app/interviews" className="text-sm text-[#5a9150]">← Interview history</Link><p role="alert" className="mt-5 text-red-700">{error || 'Interview not found.'}</p></>;
  const latest = evaluations.at(-1);
  const progress = Math.min(100, (session.answeredCount / session.questionCount) * 100);
  return <><Link to={`/app/jobs/${session.jobBoard}`} className="inline-flex items-center gap-2 text-sm text-[#647866] hover:text-[#2f6330]"><ArrowLeft size={16} /> {session.jobSnapshot?.company} · {session.jobSnapshot?.role}</Link>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#5a9150]">{modeNames[session.mode]}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{session.status === 'completed' ? 'Interview complete' : 'Your interview'}</h1><p className="mt-2 text-sm text-[#738075]">{session.answeredCount} of {session.questionCount} questions answered</p></div>{session.status === 'active' && <button onClick={finish} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-[#d6e1d2] bg-white px-4 py-2.5 text-sm text-[#657669] hover:border-[#a8cda0] disabled:opacity-50"><Flag size={15} /> Finish early</button>}</div>
    <div className="mt-7 h-2 overflow-hidden rounded-full bg-[#e7ece4]"><div className="h-full rounded-full bg-[#8dc67e] transition-all" style={{ width: `${progress}%` }} /></div>
    {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {session.mode === 'challenge' && session.status === 'completed' && challengeResult && <div className="mt-7 max-w-4xl rounded-2xl border border-[#d8e8d2] bg-[#f1f8ee] p-6"><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#5a9150]">Challenge result</p>{challengeResult.job.assessmentVersion === session.boardVersion ? <><h2 className="mt-2 text-xl font-semibold">{challengeResult.readiness.categories.find((item) => item.key === session.challengeDimension)?.label}</h2><p className="mt-3 text-sm text-[#5c735d]">Before: {session.challengeBeforeScore === null ? 'Not Evaluated' : `${session.challengeBeforeScore}%`} · After: {challengeResult.readiness.categories.find((item) => item.key === session.challengeDimension)?.score === null ? 'Not Evaluated' : `${challengeResult.readiness.categories.find((item) => item.key === session.challengeDimension)?.score}%`}</p><p className="mt-1 text-xs text-[#829482]">{challengeResult.readiness.categories.find((item) => item.key === session.challengeDimension)?.evidenceCount} distinct scored questions now support this area.</p></> : <p className="mt-2 text-sm text-[#5c735d]">The job description has changed since this challenge. Its answers remain in history but do not count toward the current board.</p>}<Link to={`/app/jobs/${session.jobBoard}/readiness`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4e8046]">View readiness <ArrowRight size={16} /></Link></div>}
    {showFeedback && latest ? <div className="mt-8 max-w-4xl"><Feedback evaluation={latest} /><div className="mt-6 flex justify-end">{session.status === 'active' ? <button onClick={() => setShowFeedback(false)} className="inline-flex items-center gap-2 rounded-xl bg-[#193322] px-6 py-3 text-sm font-semibold text-white">Next question <ArrowRight size={17} /></button> : <Link to="/app/interviews" className="inline-flex items-center gap-2 rounded-xl bg-[#193322] px-6 py-3 text-sm font-semibold text-white">View interview history <ArrowRight size={17} /></Link>}</div></div> : session.status === 'active' && session.currentQuestion ? <div className="mt-8 max-w-4xl"><div className="rounded-2xl border border-[#e4e9e1] bg-white p-7 sm:p-9"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#eaf5e8] px-3 py-1 text-xs font-medium text-[#4a8044]">Question {session.answeredCount + 1}</span><span className="rounded-full bg-[#f1f4ef] px-3 py-1 text-xs text-[#708071]">{session.currentQuestion.category}</span><span className="rounded-full bg-[#f1f4ef] px-3 py-1 text-xs text-[#708071]">{session.currentQuestion.difficulty}</span>{session.currentQuestion.isFollowUp && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">Follow-up</span>}</div><h2 className="mt-7 text-xl font-semibold leading-8 sm:text-2xl">{session.currentQuestion.prompt}</h2><div className="mt-6 rounded-xl bg-[#f6f9f4] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#7b9b74]">JD requirement</p><p className="mt-1 text-sm font-medium text-[#4d694c]">{session.currentQuestion.requirement}</p>{session.currentQuestion.jdExcerpt && <p className="mt-2 text-xs leading-5 text-[#819181]">{session.currentQuestion.jdExcerpt}</p>}</div></div><form onSubmit={submit} className="mt-5 rounded-2xl border border-[#e4e9e1] bg-white p-6 sm:p-8"><label htmlFor="interview-answer" className="text-sm font-semibold">Your answer</label><p className="mt-1 text-xs text-[#8e9a8f]">Explain your reasoning and use examples when possible.</p><textarea id="interview-answer" className="light-field mt-4 min-h-56 resize-y leading-7" value={answer} maxLength={10000} onChange={(event) => setAnswer(event.target.value)} placeholder="Type your answer here…" required /><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-[#9ba69b]">{answer.length} / 10,000 characters</span><button disabled={busy || answer.trim().length < 20} className="inline-flex items-center gap-2 rounded-xl bg-[#193322] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}{busy ? 'Evaluating…' : 'Submit answer'}</button></div></form></div> : <div className="mt-9 max-w-3xl rounded-2xl border border-[#d8e8d2] bg-[#f1f8ee] p-8"><CheckCircle2 size={30} className="text-[#629558]" /><h2 className="mt-5 text-xl font-semibold">Session saved</h2><p className="mt-2 text-sm leading-6 text-[#6f806d]">Your {session.answeredCount} submitted {session.answeredCount === 1 ? 'answer is' : 'answers are'} in your interview history. Unscored guidance does not affect job readiness.</p><Link to="/app/interviews" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#4e8046]">View interview history <ArrowRight size={16} /></Link></div>}
    {evaluations.length > 0 && <div className="mt-12 max-w-4xl"><div className="flex items-center gap-2"><MessageCircle size={18} className="text-[#699061]" /><h2 className="text-lg font-semibold">Answered questions</h2></div><div className="mt-4 space-y-3">{evaluations.map((item, index) => <details key={item._id} className="rounded-xl border border-[#e4e9e1] bg-white p-5"><summary className="cursor-pointer text-sm font-medium">{index + 1}. {item.question}<span className="ml-2 text-xs text-[#8a998b]">{item.assessed ? `${item.score}/100` : 'Unscored'}</span></summary><p className="mt-4 whitespace-pre-wrap border-t border-[#edf0ea] pt-4 text-sm leading-6 text-[#68786a]">{item.answer}</p></details>)}</div></div>}
  </>;
}
