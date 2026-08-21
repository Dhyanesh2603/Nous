import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Table as TableIcon,
  Key,
  Copy,
  Check,
} from 'lucide-react';
import { fetchDatabaseSchema } from '../../services/api';
import type { DatabaseSchemaReport, TableDefinition } from '../../types';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [report, setReport] = useState<DatabaseSchemaReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableDefinition | null>(null);
  const [viewMode, setViewMode] = useState<'erd' | 'tables'>('tables');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetchDatabaseSchema()
      .then((res: DatabaseSchemaReport) => {
        setReport(res);
        if (res?.tables && res.tables.length > 0) {
          setSelectedTable(res.tables[0]);
        }
      })
      .catch((err: unknown) => console.error('Failed to load database schema:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyErd = () => {
    if (report?.mermaid_erd) {
      navigator.clipboard.writeText(report.mermaid_erd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Database Schema & Entity-Relationship (ERD)</h2>
                {report?.schema_type && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {report.schema_type}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Auto-extracted SQL DDL, Prisma, Drizzle, TypeORM, and Mongoose schemas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setViewMode('tables')}
                className={`px-3 py-1 rounded-md transition ${
                  viewMode === 'tables'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tables ({report?.tables_count || 0})
              </button>
              <button
                onClick={() => setViewMode('erd')}
                className={`px-3 py-1 rounded-md transition ${
                  viewMode === 'erd'
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ERD Definition
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

        {/* Modal Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="text-xs font-mono">Parsing database entities and schema relationships...</p>
          </div>
        ) : !report || !report.detected || report.tables_count === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 p-8 text-center">
            <Database className="w-12 h-12 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-200">No Database Schemas Detected</h3>
            <p className="text-xs text-slate-500 max-w-md">
              Nous looked for .sql DDL files, schema.prisma, Drizzle schemas, TypeORM entities, and Mongoose schemas in this repository.
            </p>
          </div>
        ) : viewMode === 'erd' ? (
          <div className="flex-1 bg-slate-950/80 overflow-auto p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                Mermaid Entity-Relationship Diagram Definition ({report.relationships_count} foreign key relations)
              </span>
              <button
                onClick={handleCopyErd}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy ERD'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-xl text-xs font-mono text-cyan-300 overflow-auto flex-1 border border-slate-800">
              <code>{report.mermaid_erd}</code>
            </pre>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left list of tables */}
            <div className="w-72 border-r border-slate-800 bg-slate-950/40 flex flex-col">
              <div className="p-3 border-b border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>Tables & Collections</span>
                <span className="text-cyan-400 font-semibold">{report.tables_count}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
                {report.tables.map((tbl) => (
                  <button
                    key={tbl.name}
                    onClick={() => setSelectedTable(tbl)}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between ${
                      selectedTable?.name === tbl.name
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <TableIcon className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span className="truncate font-semibold">{tbl.name}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {tbl.columns.length} cols
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Selected Table columns & details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
              {selectedTable && (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-100">{selectedTable.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                          {selectedTable.schema_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        Defined in: {selectedTable.relative_path}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Columns & Fields ({selectedTable.columns.length})
                    </span>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[11px]">
                            <th className="p-3">Column Name</th>
                            <th className="p-3">Data Type</th>
                            <th className="p-3">Attributes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {selectedTable.columns.map((col) => (
                            <tr key={col.name} className="hover:bg-slate-900/40 transition">
                              <td className="p-3 font-semibold text-slate-200 flex items-center gap-1.5">
                                {col.is_primary_key && <Key className="w-3 h-3 text-amber-400" />}
                                {col.name}
                              </td>
                              <td className="p-3 text-cyan-300">{col.data_type}</td>
                              <td className="p-3 space-x-1.5">
                                {col.is_primary_key && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    PRIMARY KEY
                                  </span>
                                )}
                                {col.is_foreign_key && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                    FOREIGN KEY
                                  </span>
                                )}
                                {!col.is_nullable && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400">
                                    NOT NULL
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
