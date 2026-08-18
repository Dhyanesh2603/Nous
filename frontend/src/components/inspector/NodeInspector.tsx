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
  Database,
} from 'lucide-react';
import type { GraphNodeData, FileContentResponse, SymbolFactsResponse } from '../../types';
import { fetchFileContent, fetchSymbolFacts } from '../../services/api';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'facts'>('overview');
  const [fileContent, setFileContent] = useState<FileContentResponse | null>(null);
  const [symbolFacts, setSymbolFacts] = useState<SymbolFactsResponse | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isLoadingFacts, setIsLoadingFacts] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!node) {
      setFileContent(null);
      setSymbolFacts(null);
      return;
    }

    const filePath = node.filePath || node.relativePath || (node.id.startsWith('mod::') ? null : node.id);
    if (filePath && !node.id.startsWith('mod::')) {
      setIsLoadingFile(true);
      fetchFileContent(filePath, node.startLine, node.endLine)
        .then((res) => setFileContent(res))
        .catch((err) => console.error('Failed to load file content:', err))
        .finally(() => setIsLoadingFile(false));
    } else {
      setFileContent(null);
    }

    // Load symbol facts
    if (!node.id.startsWith('mod::')) {
      setIsLoadingFacts(true);
      fetchSymbolFacts(node.id)
        .then((res) => setSymbolFacts(res))
        .catch((err) => console.error('Failed to load facts:', err))
        .finally(() => setIsLoadingFacts(false));
    } else {
      setSymbolFacts(null);
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
      <div className="p-3 border-b border-slate-800 bg-slate-950/20 flex items-center gap-2">
        <button
          onClick={() => onCalculateBlastRadius(node.id)}
          className="flex-1 py-2 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold text-xs transition flex items-center justify-center gap-2"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          Blast Radius
        </button>

        {isSymbol && onTraceSequence && (
          <button
            onClick={() => onTraceSequence(node.id)}
            className="py-2 px-3 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-semibold text-xs transition flex items-center justify-center gap-2"
            title="Trace execution sequence"
          >
            <Workflow className="w-3.5 h-3.5" />
            Trace Flow
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="px-4 border-b border-slate-800 flex items-center gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview
        </button>
        {!isModule && (
          <button
            onClick={() => setActiveTab('code')}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Code
          </button>
        )}
        {!isModule && (
          <button
            onClick={() => setActiveTab('facts')}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'facts'
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            RipEx Facts {symbolFacts && `(${symbolFacts.total_facts})`}
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {activeTab === 'overview' ? (
          <>
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {node.language && (
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Language</span>
                  <span className="font-bold text-slate-200 uppercase">{node.language}</span>
                </div>
              )}
              {node.lineCount !== undefined && (
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Lines of Code</span>
                  <span className="font-bold text-slate-200">{node.lineCount} LOC</span>
                </div>
              )}
              {node.symbolCount !== undefined && (
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">AST Symbols</span>
                  <span className="font-bold text-slate-200">{node.symbolCount}</span>
                </div>
              )}
              {node.complexity !== undefined && (
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Cyclomatic</span>
                  <span className={`font-bold ${node.complexity > 10 ? 'text-amber-400' : 'text-slate-200'}`}>
                    v(G) = {node.complexity}
                  </span>
                </div>
              )}
            </div>

            {/* Signature & Docstring */}
            {node.signature && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Signature
                </span>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 break-all">
                  {node.signature}
                </div>
              </div>
            )}

            {node.docstring && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Docstring / Description
                </span>
                <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg text-xs text-slate-300 italic">
                  "{node.docstring}"
                </div>
              </div>
            )}

            {/* In-Module Files list if module */}
            {isModule && node.files && node.files.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Contained Files ({node.files.length})
                </span>
                <div className="max-h-60 overflow-y-auto space-y-1 font-mono text-xs">
                  {node.files.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-slate-950/50 border border-slate-800/80 rounded flex items-center gap-2 text-slate-300"
                    >
                      <FileCode className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'code' ? (
          isLoadingFile ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading code slice...</div>
          ) : fileContent ? (
            <CodePreview
              content={fileContent.content}
              language={fileContent.language}
              startLine={fileContent.start_line}
            />
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">No code preview available.</div>
          )
        ) : (
          /* RipEx Facts Tab */
          isLoadingFacts ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading RipEx relational facts...</div>
          ) : symbolFacts ? (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-between">
                <span>RipEx Provenance Facts</span>
                <span className="font-bold">{symbolFacts.total_facts} Relations</span>
              </div>

              {symbolFacts.calls_made.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Calls Made ({symbolFacts.calls_made.length})</span>
                  {symbolFacts.calls_made.map((f) => (
                    <div key={f.id} className="p-2 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                      <span className="text-cyan-300">{f.object_id}()</span>
                      <span className="text-slate-500 text-[10px]">Line {f.line_number}</span>
                    </div>
                  ))}
                </div>
              )}

              {symbolFacts.called_by.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Called By ({symbolFacts.called_by.length})</span>
                  {symbolFacts.called_by.map((f) => (
                    <div key={f.id} className="p-2 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                      <span className="text-emerald-300">{f.subject_id.split('::').pop()}</span>
                      <span className="text-slate-500 text-[10px]">{f.relative_path}:{f.line_number}</span>
                    </div>
                  ))}
                </div>
              )}

              {symbolFacts.instantiates.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Instantiates ({symbolFacts.instantiates.length})</span>
                  {symbolFacts.instantiates.map((f) => (
                    <div key={f.id} className="p-2 bg-slate-950 border border-amber-500/20 rounded flex items-center justify-between">
                      <span className="text-amber-300">new {f.object_id}()</span>
                      <span className="text-slate-500 text-[10px]">Line {f.line_number}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">No relational facts found.</div>
          )
        )}
      </div>
    </aside>
  );
};
