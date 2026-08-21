import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Play,
  Pause,
  GitBranch,
  Calendar,
  User,
} from 'lucide-react';
import { fetchTimelineEvolution } from '../../services/api';
import type { RepositoryTimelineReport, TimelineCommitSnapshot } from '../../types';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const TimelineModal: React.FC<TimelineModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<RepositoryTimelineReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetchTimelineEvolution(50)
      .then((res: RepositoryTimelineReport) => {
        setReport(res);
        if (res?.timeline_snapshots && res.timeline_snapshots.length > 0) {
          setCurrentIndex(res.timeline_snapshots.length - 1);
        }
      })
      .catch((err: unknown) => console.error('Timeline fetch error:', err))
      .finally(() => setLoading(false));
  }, [isOpen, currentRepoPath]);

  // Auto-play replay timer
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && report && report.timeline_snapshots.length > 0) {
      timer = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= report.timeline_snapshots.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, report]);

  if (!isOpen) return null;

  const currentSnapshot: TimelineCommitSnapshot | undefined =
    report?.timeline_snapshots?.[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Repository Replay & Git Evolution Timeline</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  DevTrace Replay
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Move the timeline slider or hit play to replay repository growth, commits, and structural milestones.
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

        {/* Modal Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="text-xs font-mono">Parsing Git commit graph and milestone deltas...</p>
          </div>
        ) : !report || report.timeline_snapshots.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 p-8 text-center font-mono">
            <GitBranch className="w-12 h-12 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-200">No Git History Found</h3>
            <p className="text-xs text-slate-500 max-w-md">
              This folder does not contain a .git directory.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Interactive Player Strip */}
            <div className="p-6 bg-slate-950/80 border-b border-slate-800 space-y-4">
              <div className="flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPlaying((prev) => !prev)}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-2 transition shadow-lg shadow-cyan-900/30"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{isPlaying ? 'Pause Replay' : 'Play Timeline'}</span>
                  </button>

                  <span className="text-slate-400 text-[11px]">
                    Step <strong className="text-cyan-300">{currentIndex + 1}</strong> of {report.timeline_snapshots.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <span>Timeline Span: {report.first_commit_date} → {report.latest_commit_date}</span>
                </div>
              </div>

              {/* Range Slider */}
              <input
                type="range"
                min={0}
                max={report.timeline_snapshots.length - 1}
                value={currentIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentIndex(parseInt(e.target.value, 10));
                }}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Middle: Active Snapshot Details */}
            {currentSnapshot && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Commit SHA</span>
                    <span className="font-mono text-sm font-bold text-cyan-300">{currentSnapshot.short_sha}</span>
                    <span className="text-[11px] font-mono text-slate-400 block truncate">{currentSnapshot.commit_sha}</span>
                  </div>

                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Author & Date</span>
                    <span className="font-mono text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {currentSnapshot.author_name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {currentSnapshot.commit_date}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Architectural Delta</span>
                    <span className="font-mono text-xs font-bold text-emerald-300">
                      +{currentSnapshot.lines_added} / -{currentSnapshot.lines_deleted} lines
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 block">
                      {currentSnapshot.files_changed_count} files changed
                    </span>
                  </div>
                </div>

                {/* Commit Message & Impact */}
                <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Commit Message</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px]">
                      {currentSnapshot.architectural_impact}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-100 font-sans leading-relaxed">
                    {currentSnapshot.message}
                  </p>
                </div>

                {/* Feature Evolution Breakdown */}
                {report.feature_milestones.length > 0 && (
                  <div className="space-y-3 font-mono text-xs">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Feature Evolution History
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {report.feature_milestones.map((fm, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{fm.feature_name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                              {fm.lifecycle_stage}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {fm.total_revisions} revisions · Last modified: {fm.last_modified_date || 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
