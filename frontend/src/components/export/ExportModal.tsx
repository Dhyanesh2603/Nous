import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  Image as ImageIcon,
  FileSpreadsheet,
  Layers,
  Share2,
} from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';
import type { GraphNode, GraphEdge, GraphSummary } from '../../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary?: GraphSummary;
  layoutDirection?: 'TB' | 'LR';
  currentRepoPath?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  nodes,
  edges,
  summary,
  layoutDirection = 'TB',
  currentRepoPath,
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'mermaid' | 'plantuml' | 'json'>('image');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState<number>(2); // 2x Retina
  const [imageBg, setImageBg] = useState<'dark' | 'transparent'>('dark');
  const [isExportingImage, setIsExportingImage] = useState(false);

  if (!isOpen) return null;

  // 1. Generate Mermaid.js Markdown Diagram
  const generateMermaid = (): string => {
    const dir = layoutDirection === 'LR' ? 'LR' : 'TD';
    const lines: string[] = [`graph ${dir}`];

    // Node id sanitizer (Mermaid ids cannot have dots, slashes, hyphens)
    const sanitizeId = (id: string) =>
      id.replace(/[^a-zA-Z0-9_]/g, '_');

    // Group nodes by module if possible
    const moduleMap = new Map<string, GraphNode[]>();
    const ungrouped: GraphNode[] = [];

    nodes.forEach((n) => {
      const mod = (n.data as any)?.moduleCluster;
      if (mod) {
        if (!moduleMap.has(mod)) moduleMap.set(mod, []);
        moduleMap.get(mod)!.push(n);
      } else {
        ungrouped.push(n);
      }
    });

    moduleMap.forEach((mNodes, modName) => {
      lines.push(`    subgraph "${modName}"`);
      mNodes.forEach((n) => {
        const sid = sanitizeId(n.id);
        const label = n.data?.label || n.id;
        lines.push(`        ${sid}["${label}"]`);
      });
      lines.push('    end');
    });

    ungrouped.forEach((n) => {
      const sid = sanitizeId(n.id);
      const label = n.data?.label || n.id;
      lines.push(`    ${sid}["${label}"]`);
    });

    // Edges
    edges.forEach((e) => {
      const src = sanitizeId(e.source);
      const tgt = sanitizeId(e.target);
      if (e.label) {
        lines.push(`    ${src} -->|"${e.label}"| ${tgt}`);
      } else {
        lines.push(`    ${src} --> ${tgt}`);
      }
    });

    return lines.join('\n');
  };

  // 2. Generate PlantUML Syntax
  const generatePlantUML = (): string => {
    const lines: string[] = ['@startuml', 'skinparam monochrome false', 'skinparam shadowing false', ''];

    const sanitizeId = (id: string) =>
      id.replace(/[^a-zA-Z0-9_]/g, '_');

    nodes.forEach((n) => {
      const sid = sanitizeId(n.id);
      const label = n.data?.label || n.id;
      lines.push(`component [${label}] as ${sid}`);
    });

    lines.push('');

    edges.forEach((e) => {
      const src = sanitizeId(e.source);
      const tgt = sanitizeId(e.target);
      if (e.label) {
        lines.push(`${src} ..> ${tgt} : "${e.label}"`);
      } else {
        lines.push(`${src} ..> ${tgt}`);
      }
    });

    lines.push('', '@enduml');
    return lines.join('\n');
  };

  // 3. Generate JSON Spec
  const generateJSON = (): string => {
    const data = {
      repository: currentRepoPath || 'nous-project',
      exported_at: new Date().toISOString(),
      summary: summary || {
        total_nodes: nodes.length,
        total_edges: edges.length,
      },
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.data?.label,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
      })),
    };
    return JSON.stringify(data, null, 2);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 4. Export High-Res PNG / SVG
  const handleExportImage = async (format: 'png' | 'svg') => {
    const flowElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!flowElement) {
      alert('Graph canvas not found. Please switch to the Graph view first.');
      return;
    }

    setIsExportingImage(true);
    try {
      const bgColor = imageBg === 'dark' ? '#020617' : undefined;
      const filename = `nous-architecture-${Date.now()}.${format}`;

      if (format === 'png') {
        const dataUrl = await toPng(flowElement, {
          backgroundColor: bgColor,
          pixelRatio: imageScale,
          quality: 0.95,
        });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const dataUrl = await toSvg(flowElement, {
          backgroundColor: bgColor,
        });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('Failed to export canvas image. Please try again.');
    } finally {
      setIsExportingImage(false);
    }
  };

  const mermaidCode = generateMermaid();
  const plantUmlCode = generatePlantUML();
  const jsonCode = generateJSON();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Export Architecture Diagram & Code
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {nodes.length} nodes · {edges.length} connections ready to export
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

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/20 flex gap-2 pt-2">
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-semibold border-b-2 transition ${
              activeTab === 'image'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            High-Res Image (PNG / SVG)
          </button>

          <button
            onClick={() => setActiveTab('mermaid')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-semibold border-b-2 transition ${
              activeTab === 'mermaid'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Mermaid.js Diagram
          </button>

          <button
            onClick={() => setActiveTab('plantuml')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-semibold border-b-2 transition ${
              activeTab === 'plantuml'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            PlantUML
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-semibold border-b-2 transition ${
              activeTab === 'json'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            JSON Topology
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'image' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-200">Image Capture Settings</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-slate-400 block mb-1.5">
                      Resolution / Pixel Ratio
                    </label>
                    <select
                      value={imageScale}
                      onChange={(e) => setImageScale(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500"
                    >
                      <option value={1}>1x Standard (Web / Quick Preview)</option>
                      <option value={2}>2x High-DPI (Retina / Presentations)</option>
                      <option value={3}>3x Ultra HD (Print / Design Docs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-400 block mb-1.5">
                      Background Style
                    </label>
                    <select
                      value={imageBg}
                      onChange={(e) => setImageBg(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500"
                    >
                      <option value="dark">Dark Theme (#020617 Slate)</option>
                      <option value="transparent">Transparent Background</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  disabled={isExportingImage}
                  onClick={() => handleExportImage('png')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition disabled:opacity-50 shadow-lg shadow-cyan-600/20"
                >
                  <Download className="w-4 h-4" />
                  {isExportingImage ? 'Generating PNG...' : 'Download High-Res PNG'}
                </button>

                <button
                  disabled={isExportingImage}
                  onClick={() => handleExportImage('svg')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition disabled:opacity-50 border border-slate-700"
                >
                  <Download className="w-4 h-4" />
                  {isExportingImage ? 'Generating SVG...' : 'Download Scalable SVG'}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 text-center font-mono">
                Tip: The export captures the active layout and all visible nodes in your current canvas view.
              </p>
            </div>
          )}

          {activeTab === 'mermaid' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Copy-paste this Mermaid code directly into GitHub PR descriptions, Markdown docs, or Notion.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(mermaidCode, 'mermaid')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold transition"
                  >
                    {copiedType === 'mermaid' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedType === 'mermaid' ? 'Copied!' : 'Copy Code'}
                  </button>

                  <button
                    onClick={() => downloadFile(mermaidCode, 'architecture.mmd', 'text/plain')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .mmd
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-72 overflow-y-auto font-mono text-xs text-cyan-300 leading-relaxed">
                <pre>{mermaidCode}</pre>
              </div>
            </div>
          )}

          {activeTab === 'plantuml' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Standard PlantUML component diagram syntax for architecture documentation.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(plantUmlCode, 'plantuml')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold transition"
                  >
                    {copiedType === 'plantuml' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedType === 'plantuml' ? 'Copied!' : 'Copy Code'}
                  </button>

                  <button
                    onClick={() => downloadFile(plantUmlCode, 'architecture.puml', 'text/plain')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .puml
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-72 overflow-y-auto font-mono text-xs text-purple-300 leading-relaxed">
                <pre>{plantUmlCode}</pre>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Complete graph topology JSON specification for custom scripts, CI tools, and automated pipelines.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(jsonCode, 'json')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold transition"
                  >
                    {copiedType === 'json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedType === 'json' ? 'Copied!' : 'Copy JSON'}
                  </button>

                  <button
                    onClick={() => downloadFile(jsonCode, 'architecture-topology.json', 'application/json')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download JSON
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-72 overflow-y-auto font-mono text-xs text-emerald-300 leading-relaxed">
                <pre>{jsonCode}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
