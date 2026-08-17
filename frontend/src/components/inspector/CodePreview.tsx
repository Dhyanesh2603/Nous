import React, { useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';

interface CodePreviewProps {
  content: string;
  language?: string;
  startLine?: number;
  endLine?: number;
}

export const CodePreview: React.FC<CodePreviewProps> = ({
  content,
  language = 'typescript',
  startLine,
  endLine,
}) => {
  const codeRef = useRef<HTMLElement>(null);

  const prismLang =
    language === 'python' ? 'python' :
    language === 'tsx' ? 'tsx' :
    language === 'jsx' ? 'jsx' :
    language === 'javascript' ? 'javascript' : 'typescript';

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [content, prismLang]);

  const lines = content.split('\n');

  return (
    <div className="code-viewer-container rounded-lg bg-slate-950 border border-slate-800/90 font-mono text-xs overflow-x-auto">
      <div className="flex select-none">
        {/* Line Numbers Column */}
        <div className="bg-slate-900/60 text-slate-600 px-3 py-3 text-right select-none border-r border-slate-800/80">
          {lines.map((_, idx) => {
            const lineNo = idx + 1;
            const isHighlighted = startLine && endLine && lineNo >= startLine && lineNo <= endLine;
            return (
              <div
                key={idx}
                className={`${isHighlighted ? 'text-cyan-400 font-bold bg-cyan-950/30' : ''} leading-5`}
              >
                {lineNo}
              </div>
            );
          })}
        </div>

        {/* Code Content Column */}
        <div className="p-3 flex-1 overflow-x-auto">
          <pre className="!m-0 !p-0 !bg-transparent font-mono leading-5">
            <code ref={codeRef} className={`language-${prismLang}`}>
              {content}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};
