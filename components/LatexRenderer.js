// components/LatexRenderer.js

import React from 'react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const LatexRenderer = ({ text }) => {
  if (!text) return null;

  // FIX: Unescape backslashes added by the API route for JSON safety.
  // This converts the JSON-safe double backslashes (\\) back into the single backslashes (\) that KaTeX needs.
  const unescapedText = text.replace(/\\\\/g, '\\'); 

  // Split the string by '$...$' to isolate math from regular text.
  const parts = unescapedText.split(/(\$[^\$]+\$)/g).filter(Boolean);

  return (
    <p>
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          // Extract the math content without the '$' delimiters
          const latexContent = part.slice(1, -1);
          
          return <InlineMath key={index} math={latexContent} />;
        }
        // Return plain text
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
};

export default LatexRenderer;