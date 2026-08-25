import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  X,
  Copy,
  Check,
  Download,
  Printer,
  Search,
  ChevronRight,
} from 'lucide-react';
import { fetchPlatformDocs } from '../../services/api';

interface PlatformDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DocSection {
  id: string;
  title: string;
  level: number;
  content: string;
}

export const PlatformDocumentationModal: React.FC<PlatformDocumentationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSectionId, setActiveSectionId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchPlatformDocs()
        .then((res) => {
          setMarkdown(res.markdown || '');
        })
        .catch((err) => {
          console.error('Failed to load platform documentation:', err);
          setMarkdown('# Error\nFailed to load platform documentation from backend service.');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  // Parse markdown into navigable structured sections
  const sections: DocSection[] = useMemo(() => {
    if (!markdown) return [];
    const lines = markdown.split('\n');
    const parsedSections: DocSection[] = [];
    let currentTitle = 'Introduction';
    let currentLevel = 1;
    let currentId = 'intro';
    let currentLines: string[] = [];

    lines.forEach((line) => {
      const h2Match = line.match(/^##\s+(.+)$/);
      const h3Match = line.match(/^###\s+(.+)$/);

      if (h2Match) {
        if (currentLines.length > 0) {
          parsedSections.push({
            id: currentId,
            title: currentTitle,
            level: currentLevel,
            content: currentLines.join('\n'),
          });
          currentLines = [];
        }
        currentTitle = h2Match[1].trim();
        currentLevel = 2;
        currentId = currentTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      } else if (h3Match) {
        if (currentLines.length > 0) {
          parsedSections.push({
            id: currentId,
            title: currentTitle,
            level: currentLevel,
            content: currentLines.join('\n'),
          });
          currentLines = [];
        }
        currentTitle = h3Match[1].trim();
        currentLevel = 3;
        currentId = currentTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      } else {
        currentLines.push(line);
      }
    });

    if (currentLines.length > 0) {
      parsedSections.push({
        id: currentId,
        title: currentTitle,
        level: currentLevel,
        content: currentLines.join('\n'),
      });
    }

    return parsedSections;
  }, [markdown]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)
    );
  }, [sections, searchQuery]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NOUS_DOCUMENTATION.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const el = document.getElementById(`doc-sec-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Platform Documentation & User Manual</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  Comprehensive Guide
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Complete architecture guide, ingestion workflows, visual canvas controls, and all 20 diagnostic subsystems.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition"
              title="Copy markdown text to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition"
              title="Download DOCUMENTATION.md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-mono text-white flex items-center gap-1.5 transition shadow-lg shadow-indigo-900/20"
              title="Print Documentation to PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
              <span className="text-xs font-mono text-slate-400">Loading comprehensive platform manual...</span>
            </div>
          ) : (
            <>
              {/* Left Sidebar Table of Contents */}
              <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-950/40">
                {/* Search Bar */}
                <div className="p-3 border-b border-slate-800">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter documentation sections..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                    />
                  </div>
                </div>

                {/* Section Navigation Links */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-500 px-2 py-1 block font-bold">
                    Table of Contents ({filteredSections.length})
                  </span>
                  {filteredSections.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition group ${
                        activeSectionId === sec.id
                          ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className={`truncate ${sec.level === 3 ? 'pl-2 text-[11px]' : 'font-medium'}`}>
                        {sec.title}
                      </span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400 transition" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Content Viewer */}
              <div className="flex-1 p-8 overflow-y-auto bg-slate-900/30 space-y-8 print:p-0 print:bg-white print:text-black">
                {filteredSections.map((sec) => (
                  <div key={sec.id} id={`doc-sec-${sec.id}`} className="space-y-3 scroll-mt-6">
                    <h2
                      className={`font-bold font-mono tracking-tight pb-2 border-b border-slate-800 flex items-center gap-2 ${
                        sec.level === 2
                          ? 'text-lg text-indigo-300 border-indigo-500/20 pt-4'
                          : 'text-base text-slate-100'
                      }`}
                    >
                      <span>{sec.title}</span>
                    </h2>
                    <div className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap space-y-2 font-mono">
                      {sec.content}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
