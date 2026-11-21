"use client";
import Link from "next/link";
import { useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import MathInput from "../../components/MathInput";

export default function MathEditorPreview() {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="learning-site"><SiteHeader /><main className="playground-page page-width">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/exam" className="text-purple-700 underline">Back to practice</Link>
        <div><div className="eyebrow">A SPACE TO EXPERIMENT</div><h1 className="playground-title">Think it. <em>Write it.</em></h1></div>
        <p>Practice entering fractions, roots, powers and calculus notation before starting an exam. This sandbox does not grade your answer.</p>
        <MathInput value={answer} onChange={setAnswer} disabled={submitted} />
        <button type="button" className="math-tool" onClick={() => setSubmitted(!submitted)}>
          {submitted ? "Edit answer" : "Preview submitted answer"}
        </button>
      </div>
    </main></div>
  );
}
