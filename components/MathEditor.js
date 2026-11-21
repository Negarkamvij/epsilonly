"use client";
import { useId, useRef, useState } from "react";
import { addStyles, EditableMathField } from "react-mathquill";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

addStyles();

const groups = [
  { name: "Essentials", tools: [
    ["Fraction", "a/b", "\\frac"], ["Power", "xⁿ", "^"],
    ["Subscript", "xₙ", "_"], ["Square root", "√", "\\sqrt"],
    ["Nth root", "ⁿ√", "\\nthroot"],
    ["Parentheses", "( )", "("], ["Absolute value", "|x|", "|"],
    ["Pi", "π", "\\pi"], ["Infinity", "∞", "\\infty"],
  ] },
  { name: "Functions", tools: [
    ["Sine", "sin", "\\sin"], ["Cosine", "cos", "\\cos"],
    ["Tangent", "tan", "\\tan"], ["Natural logarithm", "ln", "\\ln"],
    ["Logarithm", "log", "\\log"],
  ] },
  { name: "Calculus & notation", tools: [
    ["Integral", "∫", "\\int"],
    ["Definite integral", "∫ₐᵇ", "\\int_{}^{}", "template"],
    ["Derivative", "d/dx", "\\frac{d}{dx}", "write"],
    ["Partial derivative", "∂/∂x", "\\frac{\\partial}{\\partial x}", "write"],
    ["Summation", "Σ", "\\sum"],
    ["Limit", "lim", "\\lim_{x\\to{}}", "template"],
    ["Vector brackets", "⟨ ⟩", "\\langle"],
    ["Approaches", "→", "\\to"], ["Comma for tuples and vectors", ",", ","],
    ["Less than or equal", "≤", "\\le"], ["Greater than or equal", "≥", "\\ge"],
  ] },
];

export default function MathEditor({ value = "", onChange, disabled = false,
  placeholder = "Type your answer or choose a template below." }) {
  const id = useId();
  const field = useRef(null);
  const history = useRef({ entries: [value], index: 0 });
  const current = useRef(value);
  const [revision, setRevision] = useState(0);
  const [textMode, setTextMode] = useState(false);
  const [inputError, setInputError] = useState("");
  current.current = value;

  function change(next) {
    if (disabled || next === current.current) return;
    const h = history.current;
    h.entries = [...h.entries.slice(0, h.index + 1), next].slice(-200);
    h.index = h.entries.length - 1;
    current.current = next;
    setInputError("");
    onChange(next);
    setRevision((n) => n + 1);
  }

  function restore(direction) {
    const h = history.current;
    const index = h.index + direction;
    if (disabled || index < 0 || index >= h.entries.length) return;
    h.index = index;
    current.current = h.entries[index];
    onChange(current.current);
    setRevision((n) => n + 1);
  }

  function insert(command, method) {
    if (disabled || !field.current) return;
    field.current.focus();
    if (method) {
      field.current.write(command);
      if (method === "template") field.current.keystroke("Left");
    } else field.current.cmd(command);
  }

  const h = history.current;
  return (
    <section className="math-answer rounded-xl border border-purple-200 bg-white p-4 text-gray-800 shadow-sm"
      aria-label="Math answer editor" data-revision={revision}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
          event.preventDefault();
          restore(event.shiftKey ? 1 : -1);
        }
      }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span id={`${id}-label`} className="font-semibold">Your answer</span>
        <button type="button" onClick={() => setTextMode(!textMode)} disabled={disabled}
          aria-pressed={textMode} className="text-sm text-purple-700 underline disabled:opacity-50">
          {textMode ? "Use visual editor" : "Use LaTeX text input"}
        </button>
      </div>
      {disabled ? (
        <div className="math-answer-field bg-gray-50" aria-label="Submitted answer">
          {value ? <InlineMath math={value} renderError={() => <span>{value}</span>} /> : <span>No answer entered</span>}
        </div>
      ) : textMode ? (
        <textarea value={value} onChange={(event) => change(event.target.value)}
          aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`}
          spellCheck={false} maxLength={4000}
          className="math-answer-field w-full font-mono" placeholder="e.g. \\frac{1}{2} or x^{2}" />
      ) : (
        <EditableMathField latex={value} mathquillDidMount={(instance) => {
          field.current = instance;
          if (value.trim() && !instance.latex()) {
            setInputError("The visual editor cannot display this LaTeX. Your text is preserved; edit it here using the supported examples.");
            setTextMode(true);
          }
          const textarea = instance.el().querySelector("textarea");
          textarea?.setAttribute("aria-labelledby", `${id}-label`);
          textarea?.setAttribute("aria-describedby", `${id}-help`);
        }} onChange={(instance) => {
          // Initialization may normalize or reject LaTeX. Never erase the saved answer.
          if (field.current && instance.el() === field.current.el()) change(instance.latex());
        }}
          config={{ autoCommands: "pi sqrt sum int infinity", autoOperatorNames: "sin cos tan ln log lim",
            spaceBehavesLikeTab: true }} className="math-answer-field w-full" />
      )}
      <p id={`${id}-help`} className="mt-2 text-sm text-gray-600">
        {textMode
          ? "LaTeX syntax: \\frac{1}{2}, x^{2}, \\sqrt{x}, \\sin(x). Switch to the visual editor to see your expression."
          : `${placeholder} Use / for fractions, ^ for powers, and arrow keys or Tab to move between slots.`}
      </p>
      {inputError && <p role="alert" className="mt-2 text-sm text-red-700">{inputError}</p>}
      <fieldset disabled={disabled} className="mt-4 space-y-3">
        <legend className="sr-only">Math symbols and templates</legend>
        {groups.map((group) => (
          <div key={group.name} role="group" aria-label={group.name}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{group.name}</p>
            <div className="flex flex-wrap gap-2">
              {group.tools.map(([name, label, command, method]) => (
                <button key={name} type="button" aria-label={name} title={name}
                  disabled={textMode || disabled} onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insert(command, method)} className="math-tool">{label}</button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <button type="button" className="math-tool" disabled={disabled || h.index === 0}
            onClick={() => restore(-1)}>Undo</button>
          <button type="button" className="math-tool" disabled={disabled || h.index >= h.entries.length - 1}
            onClick={() => restore(1)}>Redo</button>
          <button type="button" className="math-tool" disabled={disabled || !value}
            onClick={() => change("")}>Clear answer</button>
        </div>
      </fieldset>
    </section>
  );
}
