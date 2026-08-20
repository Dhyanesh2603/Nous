import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  X,
  Copy,
  Check,
  Download,
} from 'lucide-react';
import type { DocumentationReport, GeneratedDocSection } from '../../types';
import { fetchGeneratedDocs } from '../../services/api';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<DocumentationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState<GeneratedDocSection | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchGeneratedDocs()
        .then((res) => {
          setReport(res);
          if (res?.sections?.length) {
            setSelectedSection(res.sections[0]);
          }
        })
        .catch((err) => console.error('Failed to generate documentation:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentRepoPath]);

  const handleCopy = () => {
    if (selectedSection) {
      navigator.clipboard.writeText(selectedSection.markdown_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (selectedSection) {
      const blob = new Blob([selectedSection.markdown_content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedSection.doc_type}_docs.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Automatic Documentation Generator</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  Markdown Synthesizer
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generates live onboarding guides, architectural blueprints, API catalogs, and model schemas from parsed ASTs.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
              <span className="text-xs font-mono text-slate-400">Synthesizing markdown documentation sections...</span>
            </div>
          ) : (
            <>
              {/* Left Section Navigation */}
              <div className="w-72 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/20">
                <div className="p-3 text-[11px] font-mono uppercase text-slate-500 font-bold bg-slate-950/40">
                  Documentation Catalog ({report?.sections?.length || 0})
                </div>
                {report?.sections?.map((sec, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedSection(sec)}
                    className={`p-3.5 cursor-pointer transition flex flex-col gap-1 ${
                      selectedSection?.doc_type === sec.doc_type
                        ? 'bg-indigo-500/10 border-l-2 border-indigo-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-200">{sec.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{sec.summary}</p>
                  </div>
                ))}
              </div>

              {/* Right Markdown Viewer */}
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/30">
                {selectedSection ? (
                  <>
                    {/* Viewer Controls */}
                    <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                      <div>
                        <h3 className="font-bold text-sm text-white font-mono">{selectedSection.title}</h3>
                        <p className="text-[11px] text-slate-400">{selectedSection.summary}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopy}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? 'Copied Markdown' : 'Copy Markdown'}</span>
                        </button>
                        <button
                          onClick={handleDownload}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-mono text-white flex items-center gap-1.5 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export .md</span>
                        </button>
                      </div>
                    </div>

                    {/* Markdown Preview Body */}
                    <div className="flex-1 overflow-y-auto p-6">
                      <pre className="p-5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {selectedSection.markdown_content}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                    Select a section to view documentation
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
