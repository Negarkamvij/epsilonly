import Link from "next/link";
import Image from "next/image";
import SiteHeader from "../components/SiteHeader";
import PracticePreview from "../components/PracticePreview";

const courses = [
  { number: "01", name: "Calculus I", description: "Build your intuition for change.", topics: "Limits · Derivatives · Applications", symbol: "f′(x)", color: "sage" },
  { number: "02", name: "Calculus II", description: "See how the pieces add up.", topics: "Integrals · Series · Polar coordinates", symbol: "∫", color: "peach" },
  { number: "03", name: "Calculus III", description: "Give your thinking a new dimension.", topics: "Vectors · Partial derivatives · Multiple integrals", symbol: "∇f", color: "lilac" },
];

export default function Home() {
  return (
    <div className="learning-site">
      <SiteHeader />
      <main id="main-content">
        <section className="home-hero page-width">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT AHA MOMENT STARTS HERE</div>
            <h1>Math makes sense.<br />Sometimes it just<br />takes a <em>little practice.</em></h1>
            <p className="hero-description">A calmer space to get curious about calculus. Turn your course material into practice, explore ideas, and work through problems at your own pace.</p>
            <div className="hero-actions"><Link href="/exam" className="button">Find your starting point <span aria-hidden="true">↗</span></Link><Link href="/math-editor" className="text-button">Try the math playground <span aria-hidden="true">→</span></Link></div>
            <div className="hero-mascot">
              <Image src="/brain.png" width={104} height={104} alt="A cheerful cartoon brain wearing oversized glasses" className="brain-mascot" />
              <div className="mascot-speech"><strong>Big brain energy.<br />One small step at a time.</strong><span>Your calculus sidekick.</span></div>
            </div>
          </div>
          <PracticePreview />
        </section>
        <div className="learning-strip page-width"><span>Made for the way you learn.</span><span><i aria-hidden="true">✓</i> Your own course material</span><span><i aria-hidden="true">✓</i> Natural math input</span><span><i aria-hidden="true">✓</i> Room to figure it out</span></div>
        <section className="course-section page-width" id="explore" aria-labelledby="courses-heading">
          <div className="section-heading"><div><div className="eyebrow">A LITTLE DIRECTION</div><h2 id="courses-heading">Where will curiosity take you?</h2></div><p>From your first limit to a whole new dimension.<br />There’s a place for you to begin.</p></div>
          <div className="course-grid">{courses.map((course) => <Link href={`/exam?course=${encodeURIComponent(course.name)}`} className={`course-card ${course.color}`} key={course.number}><div className="course-top"><span className="course-number">{course.number} / EXPLORE</span><span className="course-symbol" aria-hidden="true">{course.symbol}</span></div><h3>{course.name}</h3><p>{course.description}</p><div className="course-bottom"><span>{course.topics}</span><span className="course-arrow" aria-hidden="true">↗</span></div></Link>)}</div>
        </section>
        <section className="how-section page-width" aria-labelledby="how-heading"><div className="how-intro"><div className="eyebrow">MAKE IT YOURS</div><h2 id="how-heading">Your material.<br />A fresh way to practice.</h2><Link href="/exam" className="text-button">Start with a document <span aria-hidden="true">→</span></Link></div><div className="how-steps"><article><span>01</span><div><h3>Bring what you’re learning</h3><p>Start with a worksheet, practice exam, or a few problems from your course.</p></div></article><article><span>02</span><div><h3>Give yourself a fresh challenge</h3><p>Generate new questions inspired by your material, then take them one at a time.</p></div></article><article><span>03</span><div><h3>Make room for the aha</h3><p>Write answers with a visual math editor and review the suggested answers afterward.</p></div></article></div></section>
        <section className="gentle-banner page-width"><Image src="/brain.png" width={72} height={72} alt="" className="banner-mascot" /><div><h2>You don’t have to get it all at once.</h2><p>Just bring your curiosity. We’ll start with one problem.</p></div><Link href="/exam" className="button">Let’s give it a try <span aria-hidden="true">↗</span></Link></section>
      </main>
      <footer className="site-footer page-width"><Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">∿</span>εpsilonly.</Link><p>A little practice. A little more confidence.</p><span>Stay curious. Keep practicing.</span></footer>
    </div>
  );
}
