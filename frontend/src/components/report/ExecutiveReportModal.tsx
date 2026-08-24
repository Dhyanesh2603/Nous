import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck2,
  Download,
  Copy,
  Check,
  Printer,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { fetchExecutiveReport } from '../../services/api';
import type { ExecutiveAuditReportResponse } from '../../types';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<ExecutiveAuditReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'markdown'>('dashboard');

  const loadReport = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchExecutiveReport();
      setReport(data);
    } catch (err: any) {
      console.error('Failed to load executive report:', err);
      setErrorMsg(err?.response?.data?.detail || 'Failed to compile executive audit report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen, currentRepoPath]);

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.full_markdown_report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!report) return;
    const blob = new Blob([report.full_markdown_report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.repository_name || 'repository'}-executive-audit-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Executive Architecture & Security Audit Report
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {report ? `${report.repository_name} · Compiled on ${report.generated_at}` : 'Compiling system telemetry...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadReport}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Refresh Report"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab & Action Bar */}
        <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Executive Summary
            </button>
            <button
              onClick={() => setActiveTab('markdown')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                activeTab === 'markdown'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Markdown Audit
            </button>
          </div>

          {report && (
            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .md</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-mono text-slate-400">Compiling executive audit matrix...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-mono">
              {errorMsg}
            </div>
          ) : report ? (
            activeTab === 'dashboard' ? (
              <div className="space-y-6">
                {/* Top Health Scores Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Overall Health
                    </span>
                    <div className="text-2xl font-black text-cyan-400 font-mono">
                      {report.overall_health_score}/100
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono block">
                      {report.overall_health_score >= 80 ? '● Compliant' : '▲ Action Needed'}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Architecture Score
                    </span>
                    <div className="text-2xl font-black text-indigo-400 font-mono">
                      {report.architecture_score}/100
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {report.circular_cycles_count} circular cycles
                    </span>
                  </div>

                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Security SAST
                    </span>
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      {report.security_score}/100
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {report.security_findings_count} vulnerabilities
                    </span>
                  </div>

                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Maintainability
                    </span>
                    <div className="text-2xl font-black text-purple-400 font-mono">
                      {report.maintainability_score}/100
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {report.dead_code_items_count} dead symbols
                    </span>
                  </div>
                </div>

                {/* Telemetry Stats Strip */}
                <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block">Total Files</span>
                    <span className="font-bold text-slate-200 text-sm">{report.total_files}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Indexed Symbols</span>
                    <span className="font-bold text-slate-200 text-sm">{report.total_symbols}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Dependencies</span>
                    <span className="font-bold text-slate-200 text-sm">{report.total_dependencies}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Database Entities</span>
                    <span className="font-bold text-slate-200 text-sm">{report.database_tables_count}</span>
                  </div>
                </div>

                {/* Prioritized Action Items Matrix */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Prioritized Remediation Matrix ({report.recommendations.length} items)
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {report.recommendations.length === 0 ? (
                      <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl text-center text-xs font-mono text-emerald-400">
                        ✓ No critical issues detected. Architecture meets enterprise benchmarks.
                      </div>
                    ) : (
                      report.recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  rec.priority.startsWith('P0')
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : rec.priority.startsWith('P1')
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                }`}
                              >
                                {rec.priority}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                                {rec.category}
                              </span>
                              <span className="font-bold text-xs text-slate-200">{rec.title}</span>
                            </div>
                            <p className="text-xs text-slate-400">{rec.description}</p>
                          </div>

                          {rec.impact_file && (
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800 flex-shrink-0">
                              {rec.impact_file}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
                <pre className="whitespace-pre-wrap">{report.full_markdown_report}</pre>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
};
