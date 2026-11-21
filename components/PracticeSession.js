"use client";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import LatexRenderer from "./LatexRenderer";
import ExamUploader from "./ExamUploader";
import SiteHeader from "./SiteHeader";
import MathInput from "./MathInput";

export default function PracticeSession({ session = null, questions = [], savedAnswers = {}, initialReview = null }) {
  const router = useRouter();
  const [answers, setAnswers] = useState(savedAnswers);
  const [index, setIndex] = useState(0);
  const [review, setReview] = useState(initialReview);
  const [showSolutions, setShowSolutions] = useState(false);
  const [saving, setSaving] = useState("Saved");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const autoSubmitted = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (!session || review) return;
    const update = () => setTimeLeft(Math.max(0, 300 - Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [session, review]);

  const submit = useCallback(async () => {
    if (!session || submitting || review) return;
    setSubmitting(true); setError("");
    try {
      const response = await fetch(`/api/practice/${session.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your answers could not be submitted.");
      setReview(result.review); setSaving("Saved"); dirty.current = false;
      router.refresh();
    } catch (err) { setError(err.message); setSaving("Not saved — retry submission"); }
    finally { setSubmitting(false); }
  }, [session, submitting, review, answers, router]);

  useEffect(() => {
    if (session && !review && timeLeft === 0 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      submit();
    }
  }, [timeLeft, session, review, submit]);

  useEffect(() => {
    if (!session || review || submitting || !dirty.current) return;
    let active = true;
    const controller = new AbortController();
    setSaving("Saving…");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/practice/${session.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }), signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) { setSaving("Saved"); dirty.current = false; }
      } catch (err) {
        if (active && err.name !== "AbortError") setSaving("Not saved — keep this page open and submit to retry");
      }
    }, 900);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [answers, session, review, submitting]);

  useEffect(() => {
    const warn = (event) => { if (dirty.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  if (!session) return <div className="learning-site"><SiteHeader /><main className="practice-start page-width"><div className="eyebrow">YOUR OWN LEARNING PATH</div><h1>Let’s start with what<br />you’re <em>learning.</em></h1><p>Bring your course material. Your practice is saved to your account.</p><ExamUploader onGenerated={(id) => { router.push(`/exam?session=${id}`); router.refresh(); }} /><p className="practice-notice">AI-generated questions and answers can contain errors. Use your course resources to check your work.</p></main></div>;

  if (review) return <div className="learning-site"><SiteHeader /><main className="results-page page-width"><div className="eyebrow">ANOTHER STEP FORWARD</div><h1>Practice <em>adds up.</em></h1><p>Your session is saved. You matched {review.matched_count} of {review.questions.length} suggested answers.</p><p className="setup-note">These are exact-text matches, not verified math grades. Equivalent expressions may need review, and AI answers can contain errors.</p><div className="results-actions"><Link href="/dashboard" className="button">See my progress ↗</Link><Link href="/exam" className="text-button">Start another session →</Link><button type="button" className="math-tool" onClick={() => setShowSolutions(!showSolutions)} aria-expanded={showSolutions}>{showSolutions ? "Hide answer review" : "Review my answers"}</button></div>{showSolutions && <div className="review-list">{review.questions.map((q,i) => <article className="review-item" key={q.id}><div className="review-item-heading"><h2>Question {i+1}</h2><span className="topic-pill">{q.grading_status === "exact_match" ? "Text match" : q.grading_status === "unanswered" ? "Not answered" : "Needs review"}</span></div><LatexRenderer text={q.question} /><h3>Your answer</h3>{q.answer ? <LatexRenderer text={`$${q.answer}$`} /> : <p>No answer entered.</p>}<h3>Suggested answer · unverified</h3><LatexRenderer text={q.solution} /><p className="form-hint">{q.topic} · {q.difficulty}</p></article>)}</div>}</main></div>;

  const question = questions[index];
  return <div className="learning-site"><SiteHeader /><main className="practice-session page-width"><div className="eyebrow">ONE PROBLEM AT A TIME</div><h1>Your next little <em>breakthrough.</em></h1><div className="session-status"><span>{session.course} · {question.topic} · {question.difficulty}</span><span>{Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,"0")} remaining</span></div><progress className="session-progress" value={index+1} max={questions.length} aria-label="Session progress" /><div className="session-question"><span className="eyebrow">QUESTION {index+1} OF {questions.length}</span><LatexRenderer text={question.question} /></div><div className="session-editor"><MathInput key={question.id} value={answers[question.id] || ""} onChange={(value) => { dirty.current = true; setAnswers((current) => ({...current,[question.id]:value})); }} disabled={submitting} /></div><p role="status" className="form-hint">{submitting ? "Submitting your answers…" : saving}</p>{error && <p role="alert" className="form-error">{error}</p>}<div className="results-actions"><button type="button" className="math-tool" onClick={() => setIndex(index-1)} disabled={index===0 || submitting}>Previous</button>{index < questions.length-1 && <button type="button" className="button" onClick={() => setIndex(index+1)} disabled={submitting}>Next question →</button>}<button type="button" className={index===questions.length-1 ? "button" : "math-tool"} onClick={submit} disabled={submitting}>{submitting ? "Saving…" : "Submit session"}</button></div><p className="practice-notice">Your answers save as you type. Wait for “Saved” before leaving this page.</p></main></div>;
}
