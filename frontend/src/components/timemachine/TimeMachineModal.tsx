import React, { useState, useEffect } from 'react';
import {
  History,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  GitCommit,
  User,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import type { TimeMachineReport, CommitFrame } from '../../types';
import { fetchTimeMachineFrames } from '../../services/api';

interface TimeMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const TimeMachineModal: React.FC<TimeMachineModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<TimeMachineReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchTimeMachineFrames(35)
        .then((res) => {
          setReport(res);
          if (res?.frames?.length) {
            setCurrentIndex(res.frames.length - 1);
          }
        })
        .catch((err) => console.error('Failed to load time machine:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentRepoPath]);

  // Autoplay playback loop
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && report?.frames?.length) {
      timer = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= report.frames.length - 1) {
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

  const currentFrame: CommitFrame | undefined = report?.frames?.[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Repository Time Machine</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/30">
                  Git Evolution Scrubber
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Chronological commit playback with cumulative LOC trajectory, velocity curves, and historical snapshot scrubbing.
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

        {/* Hero Velocity Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800 font-mono text-xs">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Total History Frames</span>
            <span className="text-base font-bold text-violet-300">{report?.total_frames || 0} commits</span>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Historical Velocity</span>
            <span className="text-base font-bold text-cyan-300">{report?.average_velocity_commits_per_week || 0} commits/wk</span>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Unique Contributors</span>
            <span className="text-base font-bold text-emerald-300">{report?.total_authors || 0} authors</span>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Timeline Span</span>
            <span className="text-xs text-slate-300 block truncate mt-0.5">{report?.oldest_commit_date} → {report?.latest_commit_date}</span>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/30">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400"></div>
              <span className="text-xs font-mono text-slate-400">Reconstructing git commit frames & LOC timeline...</span>
            </div>
          ) : currentFrame ? (
            <>
              {/* Active Commit Frame Card */}
              <div className="p-6 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/40">
                      <GitCommit className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                          {currentFrame.short_hash}
                        </span>
                        <h3 className="font-bold text-sm text-slate-100">{currentFrame.message}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 font-mono">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          {currentFrame.author_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {currentFrame.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-[10px] uppercase text-slate-500 block">Cumulative Codebase Volume</span>
                    <span className="text-xl font-black text-violet-300">{currentFrame.cumulative_loc.toLocaleString()} LOC</span>
                  </div>
                </div>

                {/* Diff Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 font-mono text-xs">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
                    <span className="text-slate-500 text-[10px] uppercase block">Files Modified</span>
                    <span className="font-bold text-slate-200">{currentFrame.files_changed} files</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
                    <span className="text-slate-500 text-[10px] uppercase block">Lines Added</span>
                    <span className="font-bold text-emerald-400">+{currentFrame.additions} LOC</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
                    <span className="text-slate-500 text-[10px] uppercase block">Lines Deleted</span>
                    <span className="font-bold text-rose-400">-{currentFrame.deletions} LOC</span>
                  </div>
                </div>
              </div>

              {/* LOC Evolution Progression Bar Graph */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5 font-bold">
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                    Evolutionary Codebase Trajectory
                  </span>
                  <span className="text-violet-300 font-bold">
                    Frame {currentIndex + 1} of {report?.frames?.length || 0}
                  </span>
                </div>

                {/* Interactive Scrubber Bars */}
                <div className="flex items-end gap-1 h-24 pt-2">
                  {report?.frames?.map((f, idx) => {
                    const maxLoc = Math.max(...(report.frames.map((x) => x.cumulative_loc) || [1]));
                    const heightPct = Math.max(15, Math.round((f.cumulative_loc / maxLoc) * 100));
                    const isSelected = idx === currentIndex;
                    return (
                      <div
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`flex-1 rounded-t cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'bg-violet-400 shadow-lg shadow-violet-500/50 scale-y-105'
                            : idx <= currentIndex
                            ? 'bg-violet-600/60 hover:bg-violet-500/80'
                            : 'bg-slate-800/50 hover:bg-slate-700/60'
                        }`}
                        style={{ height: `${heightPct}%` }}
                        title={`${f.short_hash}: ${f.message} (${f.cumulative_loc} LOC)`}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Playback Controls Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-violet-900/30"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => Math.min((report?.frames?.length || 1) - 1, prev + 1))}
              disabled={currentIndex >= (report?.frames?.length || 1) - 1}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Scrub Slider */}
          <div className="flex items-center gap-3 w-80">
            <span className="text-[11px] text-slate-500">Scrub:</span>
            <input
              type="range"
              min={0}
              max={(report?.frames?.length || 1) - 1}
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              className="w-full accent-violet-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
