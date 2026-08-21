import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Package,
} from 'lucide-react';
import { fetchSupplyChain } from '../../services/api';
import type { SupplyChainReport } from '../../types';

interface DependencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRepoPath?: string;
}

export const DependencyModal: React.FC<DependencyModalProps> = ({
  isOpen,
  onClose,
  currentRepoPath,
}) => {
  const [report, setReport] = useState<SupplyChainReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'direct' | 'dev' | 'copyleft'>('all');

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetchSupplyChain()
      .then((res: SupplyChainReport) => setReport(res))
      .catch((err: unknown) => console.error('Supply chain fetch error:', err))
      .finally(() => setLoading(false));
  }, [isOpen, currentRepoPath]);

  if (!isOpen) return null;

  const filteredDeps = (report?.dependencies || []).filter((d) => {
    const matchesSearch = d.name ? d.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    if (!matchesSearch) return false;
    if (activeFilter === 'direct') return !d.is_dev_dependency;
    if (activeFilter === 'dev') return d.is_dev_dependency;
    if (activeFilter === 'copyleft') return d.license_category ? d.license_category.includes('Copyleft') : false;
    return true;
  });

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
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Third-Party Dependencies & Supply Chain</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  {report?.total_dependencies || 0} Packages
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Parsed from package.json, requirements.txt, pyproject.toml, go.mod, and Cargo.toml.
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            <p className="text-xs font-mono">Parsing package manifests & usage references...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Stat Strip */}
            <div className="p-6 bg-slate-950/80 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-slate-500 text-[10px] uppercase block">Total Packages</span>
                <span className="text-base font-bold text-slate-100">{report?.total_dependencies || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-slate-500 text-[10px] uppercase block">Direct Runtime</span>
                <span className="text-base font-bold text-purple-300">{report?.direct_dependencies_count || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-slate-500 text-[10px] uppercase block">Dev Dependencies</span>
                <span className="text-base font-bold text-cyan-300">{report?.dev_dependencies_count || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-slate-500 text-[10px] uppercase block">Copyleft Licenses</span>
                <span className="text-base font-bold text-amber-300">{report?.copyleft_licenses_count || 0}</span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/40">
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono w-72">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter package name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent outline-none flex-1 text-slate-200"
                />
              </div>

              <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
                {(['all', 'direct', 'dev', 'copyleft'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1 rounded-md transition uppercase text-[10px] font-bold ${
                      activeFilter === filter
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Dependency List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono text-xs">
              {filteredDeps.map((dep, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-purple-500/40 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{dep.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-purple-300">
                        {dep.version_spec}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase">
                        {dep.ecosystem}
                      </span>
                      {dep.is_dev_dependency && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          Dev
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-sans">
                      Declared in: <span className="font-mono text-slate-400">{dep.manifest_file}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">License</span>
                      <span className="text-xs text-emerald-400 font-semibold">{dep.license_category}</span>
                    </div>

                    <div className="text-right pl-3 border-l border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Imports in Code</span>
                      <span className="text-xs text-cyan-300 font-bold">{dep.usage_count_in_code} files</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
