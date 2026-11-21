"use client";
import { useState } from "react";
import Link from "next/link";
import LatexRenderer from "./LatexRenderer";

export default function PracticePreview() {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="practice-scene">
      <div className="floating-note"><span aria-hidden="true">✦</span> One concept at a time.</div>
      <div className="sample-card">
        <div className="sample-card-top"><span className="tiny-label">A LITTLE WARM-UP</span><span className="sample-dots" aria-hidden="true">● ● ●</span></div>
        <div className="sample-meta"><span className="topic-pill">Calculus II</span><span>Definite integrals</span></div>
        <h2>Small steps. Real understanding.</h2>
        <p>Find the area under the curve from 0 to 1.</p>
        <div className="sample-equation"><LatexRenderer text={"$\\int_0^1 x^2\\,dx$"} /></div>
        <svg className="curve-illustration" viewBox="0 0 350 130" role="img" aria-label="The curve y equals x squared, with the area shaded from zero to one">
          <defs><pattern id="graph-grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M 26 0 L 0 0 0 26" fill="none" stroke="#dce5db" strokeWidth="1" /></pattern></defs>
          <rect width="350" height="130" fill="url(#graph-grid)" />
          <path d="M45 112 Q145 112 245 28 L245 112 Z" fill="#c4d8ac" opacity=".65" />
          <path d="M20 112 H330 M45 125 V12" fill="none" stroke="#819581" strokeWidth="1.5" />
          <path d="M45 112 Q145 112 245 28 Q262 11 272 0" fill="none" stroke="#45664e" strokeWidth="3" />
          <path d="M245 28 V112" stroke="#819581" strokeDasharray="4 4" />
          <text x="36" y="128" fill="#58695b" fontSize="11">0</text><text x="242" y="128" fill="#58695b" fontSize="11">1</text><text x="282" y="25" fill="#45664e" fontSize="13">y = x²</text>
        </svg>
        <div className="sample-answer" aria-live="polite">
          {revealed ? <><span className="answer-check" aria-hidden="true">✓</span><div><strong>The area is ⅓.</strong><p>Integrate to get x³/3, then evaluate at 1 and 0.</p></div></> : <><span className="answer-check" aria-hidden="true">↳</span><span>Curiosity is a great place to start.</span></>}
        </div>
        <button type="button" className="sample-reveal" aria-expanded={revealed} onClick={() => setRevealed(!revealed)}>{revealed ? "Try it yourself" : "Explore the solution"}<span aria-hidden="true">{revealed ? "↺" : "→"}</span></button>
      </div>
      <div className="scene-caption"><span className="caption-dot" /> A space to try, make mistakes, and grow.</div>
      <Link href="/math-editor" className="floating-editor"><span className="editor-symbol" aria-hidden="true">a⁄b</span><span>Think in math.<br /><strong>Type it naturally. ↗</strong></span></Link>
    </div>
  );
}
