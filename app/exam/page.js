import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getIdentity } from "../../lib/supabase/server";
import { sessionIdSchema } from "../../lib/validation";
import SiteHeader from "../../components/SiteHeader";
import PracticeSession from "../../components/PracticeSession";

export const dynamic = "force-dynamic";
export default async function Exam({ searchParams }) {
  const params = await searchParams;
  const { supabase, user } = await getIdentity();
  if (!user) {
    const next = params.session && sessionIdSchema.safeParse(params.session).success ? `/exam?session=${params.session}` : params.course ? `/exam?course=${encodeURIComponent(String(params.course).slice(0,100))}` : "/exam";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (!params.session) return <PracticeSession key="new-session" />;
  if (!sessionIdSchema.safeParse(params.session).success) notFound();
  const { data: session, error } = await supabase.from("practice_sessions").select("id,course,status,started_at,completed_at,matched_count").eq("id",params.session).eq("user_id",user.id).maybeSingle();
  if (error) return <div className="learning-site"><SiteHeader /><main className="account-page page-width"><div><h1>Your session couldn’t be loaded.</h1><p>Keep your work safe and try again shortly.</p><Link href="/dashboard" className="button">Back to progress</Link></div></main></div>;
  if (!session) notFound();
  if (session.status === "completed") {
    const { data: review, error: reviewError } = await supabase.rpc("get_practice_review",{p_session_id:session.id});
    if (reviewError) throw new Error("Could not load saved review.");
    return <PracticeSession key={session.id} session={session} initialReview={review} />;
  }
  const [q,a] = await Promise.all([
    supabase.from("practice_questions").select("id,question,topic,difficulty,position").eq("session_id",session.id).eq("user_id",user.id).order("position"),
    supabase.from("practice_answers").select("question_id,answer").eq("session_id",session.id).eq("user_id",user.id),
  ]);
  if (q.error || a.error || !q.data.length) throw new Error("Could not load saved questions.");
  return <PracticeSession key={session.id} session={session} questions={q.data} savedAnswers={Object.fromEntries(a.data.map((answer) => [answer.question_id,answer.answer]))} />;
}
