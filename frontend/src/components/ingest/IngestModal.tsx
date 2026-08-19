import React, { useState, useRef } from 'react';
import {
  X,
  FolderGit2,
  Play,
  Sparkles,
  HardDrive,
  Globe,
  Upload,
  FileCode,
  CheckCircle2,
  GitBranch,
  Archive,
} from 'lucide-react';
import {
  ingestRepository,
  ingestGitRepository,
  uploadFileForIngest,
  uploadZipForIngest,
  ingestSample,
} from '../../services/api';
import type { SampleItem } from '../../types';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  samples: SampleItem[];
  currentRepoPath?: string;
}

export const IngestModal: React.FC<IngestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  samples,
  currentRepoPath,
}) => {
  const [activeTab, setActiveTab] = useState<'local' | 'git' | 'upload'>('local');

  // Local folder / file state
  const [localPath, setLocalPath] = useState('');

  // Git state
  const [gitUrl, setGitUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('');

  // File / Zip upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Scan Local Path (folder or single file)
  const handleScanLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localPath.trim()) return;

    setIsScanning(true);
    setErrorMsg(null);
    setStatusMessage('Scanning and parsing files with RipEx v0.3.0...');
    try {
      await ingestRepository(localPath.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Local ingest error:', err);
      setErrorMsg(
        err?.response?.data?.detail ||
          `Could not ingest path '${localPath}'. Please verify the folder or file path exists.`
      );
    } finally {
      setIsScanning(false);
      setStatusMessage(null);
    }
  };

  // 2. Clone and Scan Remote Git Repository
  const handleScanGit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitUrl.trim()) return;

    setIsScanning(true);
    setErrorMsg(null);
    setStatusMessage(`Cloning ${gitUrl.trim()} (shallow clone --depth 1)...`);
    try {
      await ingestGitRepository(gitUrl.trim(), gitBranch.trim() || undefined);
      setStatusMessage('Parsing cloned repository with RipEx v0.3.0...');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Git ingest error:', err);
      setErrorMsg(
        err?.response?.data?.detail ||
          `Failed to clone git repository from '${gitUrl}'. Please verify the URL and network connection.`
      );
    } finally {
      setIsScanning(false);
      setStatusMessage(null);
    }
  };

  // 3. Upload and Parse Single File or ZIP Archive
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsScanning(true);
    setErrorMsg(null);
    const isZip = selectedFile.name.toLowerCase().endsWith('.zip');
    setStatusMessage(
      isZip
        ? `Extracting and indexing ZIP archive ${selectedFile.name}...`
        : `Uploading and parsing ${selectedFile.name}...`
    );
    try {
      if (isZip) {
        await uploadZipForIngest(selectedFile);
      } else {
        await uploadFileForIngest(selectedFile);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('File upload ingest error:', err);
      setErrorMsg(
        err?.response?.data?.detail || `Failed to upload and parse '${selectedFile.name}'.`
      );
    } finally {
      setIsScanning(false);
      setStatusMessage(null);
    }
  };

  const handleSelectSample = async (sampleId: string) => {
    setIsScanning(true);
    setErrorMsg(null);
    setStatusMessage('Loading demo project...');
    try {
      await ingestSample(sampleId);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Sample ingest error:', err);
      setErrorMsg(`Failed to load sample project.`);
    } finally {
      setIsScanning(false);
      setStatusMessage(null);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Scan & Ingest Codebase</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> RipEx v0.3.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Analyze local folders, single source files, ZIP archives, or remote GitHub repositories.
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

        {/* Ingest Source Tabs */}
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('local')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              activeTab === 'local'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Local Folder / File
          </button>
          <button
            onClick={() => setActiveTab('git')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              activeTab === 'git'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Git Repo URL
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File / ZIP
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* TAB 1: Local Folder or Single File */}
          {activeTab === 'local' && (
            <form onSubmit={handleScanLocal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Local Folder or File Path
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <HardDrive className="w-4 h-4 absolute left-3 top-3 text-cyan-400 pointer-events-none" />
                    <input
                      type="text"
                      autoFocus
                      value={localPath}
                      onChange={(e) => setLocalPath(e.target.value)}
                      placeholder="e.g. D:\my-repo or C:\Users\name\project\main.py"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isScanning || !localPath.trim()}
                    className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-cyan-900/30 flex-shrink-0"
                  >
                    {isScanning ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>Scan Path</span>
                  </button>
                </div>
              </div>

              {currentRepoPath && (
                <p className="text-[11px] font-mono text-slate-500 truncate">
                  Active codebase: <span className="text-slate-400">{currentRepoPath}</span>
                </p>
              )}
            </form>
          )}

          {/* TAB 2: Remote Git Clone URL */}
          {activeTab === 'git' && (
            <form onSubmit={handleScanGit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Remote Git Repository URL
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-3 text-cyan-400 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    placeholder="e.g. https://github.com/fastapi/fastapi or git@github.com:owner/repo.git"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <GitBranch className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                    placeholder="Branch or Tag (optional, default: HEAD)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isScanning || !gitUrl.trim()}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-cyan-900/30 flex-shrink-0"
                >
                  {isScanning ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>Clone & Scan</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Upload Single File or ZIP Archive */}
          {activeTab === 'upload' && (
            <form onSubmit={handleUploadFile} className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".zip,.py,.ts,.tsx,.js,.jsx,.go,.rs,.c,.cpp,.h,.hpp,.cs"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-950/40 space-y-2 group"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto group-hover:scale-110 transition">
                  <Upload className="w-5 h-5" />
                </div>
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-100 font-mono flex items-center justify-center gap-1.5">
                      {selectedFile.name.toLowerCase().endsWith('.zip') ? (
                        <Archive className="w-4 h-4 text-amber-400" />
                      ) : (
                        <FileCode className="w-4 h-4 text-cyan-400" />
                      )}
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Click or drag to change
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-slate-200">
                      Drag & Drop a <span className="text-cyan-400 font-bold">.ZIP repository archive</span> or single source file here
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-1">
                      Supports: .ZIP archives, Python (.py), TypeScript (.ts, .tsx), JavaScript (.js), Go (.go), Rust (.rs), C/C++, C#
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isScanning || !selectedFile}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-cyan-900/30"
                >
                  {isScanning ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{selectedFile?.name.toLowerCase().endsWith('.zip') ? 'Extract & Ingest ZIP' : 'Parse File'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Progress / Status feedback */}
          {statusMessage && (
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-300 text-xs font-mono flex items-center gap-2">
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-cyan-400"></div>
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono">
              {errorMsg}
            </div>
          )}

          {/* Sample Projects Section */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Or Load a Sample Project
              </span>
              <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Quick Demo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {samples.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSample(s.id)}
                  disabled={isScanning}
                  className="p-3.5 bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 rounded-xl text-left transition group space-y-1"
                >
                  <div className="font-semibold text-xs text-slate-200 group-hover:text-cyan-300 transition">
                    {s.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 truncate" title={s.path}>
                    {s.path}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Supported: Python, TS/JS, Go, Rust, C, C++, C#</span>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>RipEx v0.3.0 Engine Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
