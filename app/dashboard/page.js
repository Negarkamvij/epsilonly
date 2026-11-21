import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import AccountSettings from "../../components/AccountSettings";
import { getIdentity } from "../../lib/supabase/server";
import { formatDate, matchRate } from "../../lib/progress";

export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const { supabase,user } = await getIdentity();
  if (!user) redirect("/login?next=/dashboard");
  const [progress,history] = await Promise.all([
    supabase.rpc("get_practice_progress"),
    supabase.from("practice_sessions").select("id,course,status,started_at,completed_at,matched_count,practice_questions(count)").eq("user_id",user.id).order("started_at",{ascending:false}).limit(20),
  ]);
  const failed = progress.error || history.error;
  const summary = progress.data || {answered:0,matched:0,completed:0,topics:[],daily:[]};
  const rate = matchRate(summary.answered,summary.matched);
  const maxDaily = Math.max(1,...summary.daily.map((d) => d.answered));
  return <div className="learning-site"><SiteHeader /><main className="dashboard-page page-width"><div className="dashboard-heading"><div><div className="eyebrow">YOUR PRACTICE, TAKING SHAPE</div><h1>Every small step <em>counts.</em></h1><p>A little reflection. A clear place to start again.</p></div><Link className="button" href="/exam">Start practicing ↗</Link></div>
    {failed ? <section className="setup-note" role="alert"><h2>Your progress couldn’t be loaded.</h2><p>The database may still need its migration, or it may be temporarily unavailable. Your saved data has not been replaced.</p><Link href="/dashboard" className="text-button">Try loading again →</Link></section> : <>
      <div className="stats-grid"><article><span>Questions answered</span><strong>{summary.answered}</strong><p>Across your completed sessions</p></article><article><span>Sessions completed</span><strong>{summary.completed}</strong><p>Small steps worth keeping</p></article><article><span>Answer matches</span><strong>{rate === null ? "—" : `${rate}%`}</strong><p>{summary.matched} suggested answers matched</p></article></div>
      <p className="progress-caveat">Answer matches compare text with unverified suggested answers. They are not mathematical grades or mastery estimates. Equivalent expressions may need review.</p>
      {summary.answered === 0 && <section className="dashboard-empty"><h2>A fresh page, just for you.</h2><p>Once you complete a session, you’ll see your activity and topic practice here. In-progress answers are saved too.</p><Link href="/exam" className="text-button">Begin your first session →</Link></section>}
      <section className="dashboard-section"><h2>Your practice rhythm</h2><p className="form-hint">Questions answered by day · last 30 days · dates in UTC</p>{summary.daily.length ? <div className="activity-chart" role="img" aria-label={`Practice activity: ${summary.daily.map((d) => `${d.day}: ${d.answered} answers`).join('; ')}`}><div className="activity-bars">{summary.daily.map((d) => <div className="activity-column" key={d.day}><span>{d.answered}</span><div style={{height:`${Math.max(3,d.answered/maxDaily*100)}px`}} /><time dateTime={d.day}>{d.day.slice(5)}</time></div>)}</div></div> : <p>No completed practice activity yet.</p>}</section>
      <section className="dashboard-section"><h2>A closer look at your topics</h2>{summary.topics.length ? <div className="table-scroll"><table className="progress-table"><thead><tr><th scope="col">Course & topic</th><th scope="col">Answered</th><th scope="col">Text matches</th></tr></thead><tbody>{summary.topics.map((t) => <tr key={`${t.course}-${t.topic}`}><th scope="row">{t.course}<span>{t.topic}</span></th><td>{t.answered}</td><td>{t.matched}</td></tr>)}</tbody></table></div> : <p>Topics appear after you submit a practice session.</p>}</section>
      <section className="dashboard-section"><h2>Pick up a thread</h2><p className="form-hint">Your 20 most recent sessions. Totals above include all your saved sessions.</p>{history.data.length ? <div className="history-list">{history.data.map((s) => <Link key={s.id} href={`/exam?session=${s.id}`}><div><strong>{s.course}</strong><span>{formatDate(s.started_at)} · {s.practice_questions?.[0]?.count || 0} questions</span></div><span>{s.status === "completed" ? "Review answers ↗" : "Resume practice ↗"}</span></Link>)}</div> : <p>Your sessions will appear here.</p>}</section>
    </>}
    <AccountSettings canDeleteAccount={Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)} />
  </main></div>;
}
