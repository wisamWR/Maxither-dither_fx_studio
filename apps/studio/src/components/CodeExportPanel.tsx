import { useState } from 'react';
import type { EffectResult } from '@ditherforge/core';
import { generateCode, type CodeFormat } from '../lib/code-export.ts';

interface Props {
  result: EffectResult | null;
  fgColor: string;
  bgColor: string;
}

const FORMATS: { id: CodeFormat; label: string }[] = [
  { id: 'react', label: 'React' },
  { id: 'web-component', label: 'Web Component' },
  { id: 'html', label: 'HTML' },
];

export default function CodeExportPanel({ result, fgColor, bgColor }: Props) {
  const [format, setFormat] = useState<CodeFormat>('html');
  const [copied, setCopied] = useState(false);

  const isText = result && 'text' in result;
  if (!isText) return null;

  const code = generateCode(result, format, fgColor, bgColor);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Code Export</h3>

      <label className="block">
        <span className="text-xs text-neutral-400">Format</span>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as CodeFormat)}
          className="w-full bg-neutral-800 rounded px-2 py-1 text-sm text-neutral-200 mt-1"
        >
          {FORMATS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </label>

      <pre className="text-[10px] text-neutral-400 bg-neutral-900 rounded p-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
        {code}
      </pre>

      <button
        className="w-full px-3 py-2 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
        onClick={handleCopy}
      >
        {copied ? 'Copied!' : 'Copy Code'}
      </button>
    </div>
  );
}
