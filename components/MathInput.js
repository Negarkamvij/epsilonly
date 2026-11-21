"use client";
import dynamic from "next/dynamic";

// MathQuill accesses window during import. Keep its entire module client-only.
const MathEditor = dynamic(() => import("./MathEditor"), {
  ssr: false,
  loading: () => <p role="status">Loading math editor…</p>,
});

export default function MathInput(props) {
  return <MathEditor {...props} />;
}
