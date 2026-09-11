import React, { useState, useEffect } from 'react';
import {
  Compass,
  X,
  Search,
  History,
  GitCommit,
  User,
  Calendar,
  Flame,
  CheckCircle2,
  FileCode,
  Tag,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { ArchaeologyResponse, LegacyFlagItem } from '../../types';
import {
  fetchArchaeology,
  fetchArchaeologyFiles,
  fetchLegacyFlags,
} from '../../services/api';

interface ArchaeologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFile?: string;
}

export const ArchaeologyModal: React.FC<ArchaeologyModalProps> = ({
  isOpen,
  onClose,
  initialFile,
}) => {
  const [activeTab, setActiveTab] = useState<'why' | 'flags'>('why');
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>(initialFile || '');
  const [fileFilter, setFileFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [archaeologyData, setArchaeologyData] = useState<ArchaeologyResponse | null>(null);
  const [legacyFlags, setLegacyFlags] = useState<LegacyFlagItem[]>([]);
  const [flagSeverityFilter, setFlagSeverityFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      loadFiles();
      loadAllFlags();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedFile) {
      loadInvestigation(selectedFile);
    }
  }, [isOpen, selectedFile]);

  const loadFiles = async () => {
    try {
      const res = await fetchArchaeologyFiles();
      if (res && res.files && res.files.length > 0) {
        setFiles(res.files);
        if (!selectedFile) {
          setSelectedFile(res.files[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load archaeology files:', err);
    }
  };

  const loadInvestigation = async (filePath: string) => {
    setLoading(true);
    try {
      const data = await fetchArchaeology(filePath);
      setArchaeologyData(data);
    } catch (err) {
      console.error('Failed to load code archaeology:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllFlags = async () => {
    try {
      const flags = await fetchLegacyFlags();
      setLegacyFlags(flags || []);
    } catch (err) {
      console.error('Failed to load legacy flags:', err);
    }
  };

  if (!isOpen) return null;

  const filteredFiles = files.filter((f) =>
    f.toLowerCase().includes(fileFilter.toLowerCase())
  );

  const displayedFlags = legacyFlags.filter((f) => {
    if (flagSeverityFilter !== 'all' && f.severity !== flagSeverityFilter) {
      return false;
    }
    return true;
  });

  const getRiskColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'high':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Code Archaeology & Intent Forensics
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Origin Analysis & Legacy Flags
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Answers "Why does this code exist?" through Git provenance, author intent, and technical debt safety markers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab switch */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('why')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition ${
                  activeTab === 'why'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Why This Code Exists
              </button>
              <button
                onClick={() => setActiveTab('flags')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition ${
                  activeTab === 'flags'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Legacy Flags Forensics
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200">
                  {legacyFlags.length}
                </span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'why' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar: File Picker */}
            <div className="w-80 border-r border-slate-800 bg-slate-950/40 flex flex-col">
              <div className="p-3 border-b border-slate-800">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={fileFilter}
                    onChange={(e) => setFileFilter(e.target.value)}
                    placeholder="Search files for archaeology..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {filteredFiles.map((file) => (
                  <button
                    key={file}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center justify-between group ${
                      selectedFile === file
                        ? 'bg-amber-500/15 text-amber-200 font-medium border border-amber-500/30'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-500 group-hover:text-amber-400" />
                      <span className="truncate">{file}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-slate-500 shrink-0" />
                  </button>
                ))}
                {filteredFiles.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No files match filter
                  </div>
                )}
              </div>
            </div>

            {/* Right Pane: Investigation Details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-900/60">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-mono text-slate-400">Excavating Git provenance and author intent...</p>
                </div>
              ) : archaeologyData ? (
                <>
                  {/* File Target & Summary Header */}
                  <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                          Investigated Target
                        </span>
                        <h3 className="text-base font-mono font-bold text-white">
                          {archaeologyData.target}
                        </h3>
                        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed mt-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                          {archaeologyData.summary}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`px-3 py-1 text-xs font-mono font-bold rounded-xl border ${getRiskColor(archaeologyData.risk_level)}`}>
                          Risk: {archaeologyData.risk_level}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                          Refactor: {archaeologyData.suggested_refactor_priority}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80">
                      <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] uppercase font-mono text-slate-500 block">Original Author</span>
                        <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5 mt-0.5">
                          <User className="w-3.5 h-3.5 text-amber-400" />
                          {archaeologyData.original_author}
                        </span>
                      </div>
                      <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] uppercase font-mono text-slate-500 block">Total Revisions</span>
                        <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5 mt-0.5">
                          <History className="w-3.5 h-3.5 text-indigo-400" />
                          {archaeologyData.total_revisions} commits
                        </span>
                      </div>
                      <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] uppercase font-mono text-slate-500 block">Primary Purpose</span>
                        <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          {archaeologyData.primary_purpose}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Origin Commit Card */}
                  {archaeologyData.origin_commit && (
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <GitCommit className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                          Birth of the Code (Origin Commit)
                        </h4>
                      </div>
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded border border-amber-500/20 font-bold">
                            {archaeologyData.origin_commit.short_hash}
                          </span>
                          <span className="text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {archaeologyData.origin_commit.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
                          {archaeologyData.origin_commit.message}
                        </p>
                        <span className="text-[11px] text-slate-400 block">
                          Committed by <strong className="text-slate-300">{archaeologyData.origin_commit.author}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Recent Revisions */}
                  {archaeologyData.recent_changes && archaeologyData.recent_changes.length > 0 && (
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                          Recent Architectural Modifications
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {archaeologyData.recent_changes.map((rev) => (
                          <div
                            key={rev.hash}
                            className="p-3 bg-slate-900/70 border border-slate-800/80 rounded-lg flex items-center justify-between hover:border-slate-700 transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 font-bold">
                                  {rev.short_hash}
                                </span>
                                <span className="text-xs font-medium text-slate-200">{rev.message}</span>
                              </div>
                              <span className="text-[11px] text-slate-400 block">
                                {rev.author} &bull; {rev.timestamp}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Embedded File Legacy Flags */}
                  {archaeologyData.legacy_flags && archaeologyData.legacy_flags.length > 0 && (
                    <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-rose-400" />
                          <h4 className="text-xs font-bold font-mono text-rose-200 uppercase tracking-wider">
                            Debt Flags in this File ({archaeologyData.legacy_flags.length})
                          </h4>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {archaeologyData.legacy_flags.map((flag, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${getSeverityBadge(flag.severity)}`}>
                                {flag.flag_type}
                              </span>
                              <span className="text-xs font-mono text-slate-400">
                                Line {flag.line_number}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 font-mono bg-slate-950/70 p-2 rounded border border-slate-800">
                              {flag.context}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-2 text-slate-500">
                  <Compass className="w-8 h-8 opacity-40" />
                  <p className="text-xs font-mono">Select a file from the sidebar to inspect its origin and purpose.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Legacy Flags Forensics View */
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/40 p-6 space-y-4">
            {/* Filter Toolbar */}
            <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-slate-200">Filter Severity:</span>
                {['all', 'critical', 'high', 'medium', 'low'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFlagSeverityFilter(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono capitalize transition ${
                      flagSeverityFilter === s
                        ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono text-slate-400">
                Found {displayedFlags.length} legacy markers across repository
              </span>
            </div>

            {/* Flags Grid */}
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {displayedFlags.map((flag, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl space-y-2 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-lg border ${getSeverityBadge(flag.severity)}`}>
                        {flag.flag_type}
                      </span>
                      <span className="text-xs font-mono text-slate-200 font-semibold">
                        {flag.file}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        :L{flag.line_number}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(flag.file);
                        setActiveTab('why');
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition"
                    >
                      Investigate History
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300">
                    {flag.context}
                  </div>
                </div>
              ))}
              {displayedFlags.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center space-y-2 text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-80" />
                  <p className="text-xs font-mono">No legacy flags found matching filter.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
