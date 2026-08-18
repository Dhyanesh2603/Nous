import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Code2,
  FileCode,
  Layers,
  Copy,
  Check,
  Workflow,
} from 'lucide-react';
import type { GraphNodeData, FileContentResponse } from '../../types';
import { getFileContent } from '../../services/api';
import { CodePreview } from './CodePreview';

interface NodeInspectorProps {
  node: GraphNodeData | null;
  onClose: () => void;
  onCalculateBlastRadius: (nodeId: string) => void;
  onTraceSequence?: (symbolId: string) => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  node,
  onClose,
  onCalculateBlastRadius,
  onTraceSequence,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'code'>('overview');
  const [fileContent, setFileContent] = useState<FileContentResponse | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!node) {
      setFileContent(null);
      return;
    }

    const filePath = node.filePath || node.relativePath || (node.id.startsWith('mod::') ? null : node.id);
    if (filePath && !node.id.startsWith('mod::')) {
      setIsLoadingFile(true);
      getFileContent(filePath, node.startLine, node.endLine)
        .then((res) => setFileContent(res))
        .catch((err) => console.error('Failed to load file content:', err))
        .finally(() => setIsLoadingFile(false));
    } else {
      setFileContent(null);
    }
  }, [node]);

  if (!node) return null;

  const isModule = node.id.startsWith('mod::') || node.fileCount !== undefined;
  const isSymbol = !!node.kind || node.id.includes('::');
  const isFile = !isModule && !isSymbol;

  const handleCopy = () => {
    const textToCopy = node.filePath || node.relativePath || node.name || node.label || '';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="fixed right-0 top-14 bottom-0 w-96 md:w-[480px] bg-slate-900/95 backdrop-blur-md border-l border-slate-800 shadow-2xl flex flex-col z-40 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/40">
        <div className="flex items-center gap-2.5 truncate">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex-shrink-0">
            {isModule ? <Layers className="w-5 h-5" /> : isFile ? <FileCode className="w-5 h-5" /> : <Code2 className="w-5 h-5" />}
          </div>
          <div className="truncate">
            <h3 className="text-sm font-bold text-slate-100 truncate font-mono">
              {node.name || node.label}
            </h3>
            <p className="text-[11px] text-slate-400 truncate font-mono">
              {node.relativePath || (isModule ? 'Architectural Module' : node.id)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Copy path"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
        <button
          onClick={() => onCalculateBlastRadius(node.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition shadow-sm truncate"
        >
          <Zap className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
          <span className="truncate">Blast Radius</span>
        </button>

        {isSymbol && onTraceSequence && (
          <button
            onClick={() => onTraceSequence(node.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition shadow-sm truncate"
          >
            <Workflow className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="truncate">Trace Flow</span>
          </button>
        )}

        {/* Tab Switcher */}
        {!isModule && (
          <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-2.5 py-1.5 rounded-md transition ${
                activeTab === 'overview' ? 'bg-slate-800 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Info
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-2.5 py-1.5 rounded-md transition ${
                activeTab === 'code' ? 'bg-slate-800 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Code
            </button>
          </div>
        )}
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
        {activeTab === 'overview' || isModule ? (
          <>
            {/* Metadata Card */}
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3.5 space-y-2.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Node Properties</h4>
              
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">Type</span>
                  <span className="font-semibold text-cyan-400 capitalize">{node.kind || (isModule ? 'Module' : 'File')}</span>
                </div>
                {node.language && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">Language</span>
                    <span className="font-semibold text-slate-200 uppercase">{node.language}</span>
                  </div>
                )}
                {node.lineCount !== undefined && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total LOC</span>
                    <span className="font-semibold text-slate-200">{node.lineCount}</span>
                  </div>
                )}
                {node.complexity !== undefined && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">Cyclomatic Complexity</span>
                    <span className="font-semibold text-amber-400">{node.complexity}</span>
                  </div>
                )}
                {node.instability !== undefined && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">Instability Index</span>
                    <span className="font-semibold text-emerald-400">{node.instability}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Signature or Docstring */}
            {node.signature && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Signature</h4>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300">
                  {node.signature}
                </div>
              </div>
            )}

            {node.docstring && (
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Docstring / Documentation</h4>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 italic text-[11px] leading-relaxed">
                  "{node.docstring}"
                </div>
              </div>
            )}

            {/* Module Internal Files */}
            {isModule && node.files && node.files.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Contained Files ({node.files.length})
                </h4>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {node.files.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300 flex items-center justify-between"
                    >
                      <span className="truncate">{file}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File AST Symbols */}
            {isFile && node.symbols && node.symbols.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Defined Symbols ({node.symbols.length})
                </h4>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {node.symbols.map((sym, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] uppercase text-cyan-400">
                          {sym.kind}
                        </span>
                        <span className="font-semibold text-slate-200 truncate">{sym.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">L{sym.line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Code Preview Tab */
          <div className="space-y-3">
            {isLoadingFile ? (
              <div className="flex items-center justify-center p-12 text-slate-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mr-3"></div>
                Loading source code...
              </div>
            ) : fileContent ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{fileContent.relative_path}</span>
                  <span>{fileContent.total_lines} lines</span>
                </div>
                <CodePreview
                  content={fileContent.content}
                  language={fileContent.language}
                  startLine={node.startLine}
                  endLine={node.endLine}
                />
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                No source code available for this element.
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
