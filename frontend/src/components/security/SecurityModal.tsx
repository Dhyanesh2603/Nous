import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  FileCode,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { fetchSecurityAudit } from '../../services/api';
import type { SecurityAuditReport, SecurityVulnerability } from '../../types';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<SecurityAuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedVuln, setSelectedVuln] = useState<SecurityVulnerability | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setReport(null);
    setSelectedVuln(null);
    setLoading(true);
    fetchSecurityAudit()
      .then((res: SecurityAuditReport) => {
        setReport(res);
        if (res?.vulnerabilities && res.vulnerabilities.length > 0) {
          setSelectedVuln(res.vulnerabilities[0]);
        }
      })
      .catch((err: unknown) => console.error('Failed to run security audit:', err))
      .finally(() => setLoading(false));
  }, [isOpen, currentRepoPath]);

  if (!isOpen) return null;

  const filteredVulns = (report?.vulnerabilities || []).filter((v) => {
    if (severityFilter === 'all') return true;
    return v.severity === severityFilter;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Security & Vulnerability Audit</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Static SAST
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audits hardcoded secrets, SQL injections, unsafe code execution, and sensitive logging.
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

        {/* Score & Severity Summary Strip */}
        {report && (
          <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Security Score:</span>
                <span
                  className={`text-lg font-bold ${
                    report.security_score >= 85
                      ? 'text-emerald-400'
                      : report.security_score >= 65
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {report.security_score}/100 (Grade {report.grade})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSeverityFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  severityFilter === 'all'
                    ? 'bg-slate-800 text-slate-100 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({report.total_issues})
              </button>
              <button
                onClick={() => setSeverityFilter('critical')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  severityFilter === 'critical'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                    : 'text-rose-400 hover:bg-rose-500/10'
                }`}
              >
                Critical ({report.critical_count})
              </button>
              <button
                onClick={() => setSeverityFilter('high')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  severityFilter === 'high'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                    : 'text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                High ({report.high_count})
              </button>
              <button
                onClick={() => setSeverityFilter('medium')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  severityFilter === 'medium'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold'
                    : 'text-blue-400 hover:bg-blue-500/10'
                }`}
              >
                Medium ({report.medium_count})
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
            <p className="text-xs font-mono">Running AST security rules and entropy analysis...</p>
          </div>
        ) : !report || report.total_issues === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 p-8 text-center font-mono">
            <ShieldCheck className="w-12 h-12 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">No Security Vulnerabilities Detected</h3>
            <p className="text-xs text-slate-500 max-w-md">
              Your codebase passed static credential audits, SQL injection scans, and unsafe execution checks.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left list of vulnerabilities */}
            <div className="w-80 border-r border-slate-800 bg-slate-950/40 flex flex-col">
              <div className="p-3 border-b border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>Vulnerabilities ({filteredVulns.length})</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono text-xs">
                {filteredVulns.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVuln(v)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      selectedVuln?.id === v.id
                        ? 'bg-rose-500/10 border-rose-500/40 text-slate-100 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded uppercase font-bold ${
                          v.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : v.severity === 'high'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {v.severity}
                      </span>
                      {v.cwe && <span className="text-[10px] text-slate-500">{v.cwe}</span>}
                    </div>
                    <div className="font-semibold text-xs text-slate-200 truncate">{v.title}</div>
                    <div className="text-[11px] text-slate-500 truncate mt-1">
                      {v.relative_path}:{v.line_number}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Selected Vulnerability Detail */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 font-mono text-xs">
              {selectedVuln && (
                <>
                  <div className="border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-bold uppercase ${
                          selectedVuln.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : selectedVuln.severity === 'high'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        }`}
                      >
                        {selectedVuln.severity}
                      </span>
                      <span className="text-slate-400">{selectedVuln.category}</span>
                      {selectedVuln.cwe && (
                        <span className="text-slate-500">· {selectedVuln.cwe}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-100">{selectedVuln.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                      {selectedVuln.relative_path}:{selectedVuln.line_number}
                    </p>
                  </div>

                  {/* Matched Snippet */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Flagged Code Snippet
                    </span>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-rose-300 overflow-x-auto text-[11px]">
                      <code>{selectedVuln.matched_snippet}</code>
                    </pre>
                  </div>

                  {/* Remediation */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Recommended Remediation
                    </span>
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs leading-relaxed font-sans">
                      {selectedVuln.remediation}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
