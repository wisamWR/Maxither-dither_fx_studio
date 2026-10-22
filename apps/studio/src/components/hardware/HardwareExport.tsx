import { useState, useMemo } from 'react';
import type { Panel, BitLayout, CArrayOptions, MicroPythonOptions, EscPosOptions } from '@ditherforge/hardware';
import { toCArray, toMicroPythonFramebuf, toEscPosRaster } from '@ditherforge/hardware';

interface Props {
  data: Uint8Array;
  width: number;
  height: number;
  panel: Panel;
}

type ExportFormat = 'c-array' | 'micropython' | 'escpos';

export default function HardwareExport({ data, width, height, panel }: Props) {
  const [format, setFormat] = useState<ExportFormat>('c-array');
  const [varName, setVarName] = useState('image');
  const [layout, setLayout] = useState<BitLayout>('row-msb');
  const [progmem, setProgmem] = useState(true);
  const [includeSize, setIncludeSize] = useState(true);
  const [invertExport, setInvertExport] = useState(false);
  const [mpFormat, setMpFormat] = useState<'MONO_HLSB' | 'MONO_VLSB'>('MONO_HLSB');
  const [escScale, setEscScale] = useState<0 | 1 | 2 | 3>(0);

  const output = useMemo(() => {
    if (width === 0 || height === 0) return '';
    switch (format) {
      case 'c-array': {
        const opts: CArrayOptions = { name: varName, layout, progmem, invert: invertExport, includeSize };
        return toCArray(data, width, height, panel, opts);
      }
      case 'micropython': {
        const opts: MicroPythonOptions = { name: varName, invert: invertExport, format: mpFormat };
        return toMicroPythonFramebuf(data, width, height, panel, opts);
      }
      case 'escpos': {
        const opts: EscPosOptions = { scale: escScale, feedAfter: 3 };
        const bytes = toEscPosRaster(data, width, height, panel, opts);
        return `// ${bytes.length} bytes\nconst data = new Uint8Array([${Array.from(bytes).join(', ')}]);`;
      }
    }
  }, [data, width, height, panel, format, varName, layout, progmem, includeSize, invertExport, mpFormat, escScale]);

  const handleCopy = () => navigator.clipboard.writeText(output);
  const handleDownload = () => {
    const ext = format === 'c-array' ? 'h' : format === 'micropython' ? 'py' : 'js';
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${varName}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300">Export</h3>

      {/* Format selector */}
      <div className="flex gap-1">
        {(['c-array', 'micropython', 'escpos'] as ExportFormat[]).map((f) => (
          <button key={f} onClick={() => setFormat(f)}
            className={`px-2 py-1 text-xs rounded ${format === f ? 'bg-green-500/20 text-green-400' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}>
            {f === 'c-array' ? 'C Array' : f === 'micropython' ? 'MicroPython' : 'ESC/POS'}
          </button>
        ))}
      </div>

      {/* Common options */}
      <div className="space-y-2 text-xs">
        <label className="flex items-center gap-2 text-neutral-400">
          Variable: <input type="text" value={varName} onChange={(e) => setVarName(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-0.5 w-24 text-neutral-200" />
        </label>
        <label className="flex items-center gap-2 text-neutral-400">
          <input type="checkbox" checked={invertExport} onChange={(e) => setInvertExport(e.target.checked)} /> Invert
        </label>
      </div>

      {/* C Array specific */}
      {format === 'c-array' && (
        <div className="space-y-2 text-xs">
          <label className="flex items-center gap-2 text-neutral-400">
            Layout:
            <select value={layout} onChange={(e) => setLayout(e.target.value as BitLayout)}
              className="bg-neutral-800 border border-neutral-700 rounded px-1 py-0.5 text-neutral-200">
              <option value="row-msb">Row MSB (Adafruit)</option>
              <option value="row-lsb">Row LSB (XBM/U8g2)</option>
              <option value="page-vertical">Page Vertical (SSD1306)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-neutral-400">
            <input type="checkbox" checked={progmem} onChange={(e) => setProgmem(e.target.checked)} /> PROGMEM
          </label>
          <label className="flex items-center gap-2 text-neutral-400">
            <input type="checkbox" checked={includeSize} onChange={(e) => setIncludeSize(e.target.checked)} /> Size defines
          </label>
        </div>
      )}

      {/* MicroPython specific */}
      {format === 'micropython' && (
        <div className="text-xs">
          <label className="flex items-center gap-2 text-neutral-400">
            Format:
            <select value={mpFormat} onChange={(e) => setMpFormat(e.target.value as 'MONO_HLSB' | 'MONO_VLSB')}
              className="bg-neutral-800 border border-neutral-700 rounded px-1 py-0.5 text-neutral-200">
              <option value="MONO_HLSB">MONO_HLSB</option>
              <option value="MONO_VLSB">MONO_VLSB</option>
            </select>
          </label>
        </div>
      )}

      {/* ESC/POS specific */}
      {format === 'escpos' && (
        <div className="text-xs">
          <label className="flex items-center gap-2 text-neutral-400">
            Scale:
            <select value={escScale} onChange={(e) => setEscScale(Number(e.target.value) as 0 | 1 | 2 | 3)}
              className="bg-neutral-800 border border-neutral-700 rounded px-1 py-0.5 text-neutral-200">
              <option value="0">Normal</option>
              <option value="1">Double width</option>
              <option value="2">Double height</option>
              <option value="3">Double both</option>
            </select>
          </label>
        </div>
      )}

      {/* Code preview */}
      <textarea readOnly value={output} rows={8}
        className="w-full bg-neutral-900 border border-neutral-800 rounded p-2 text-xs text-green-400 font-mono resize-y" />

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={handleCopy}
          className="px-3 py-1 text-xs rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700">Copy</button>
        <button onClick={handleDownload}
          className="px-3 py-1 text-xs rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700">Download</button>
      </div>
    </div>
  );
}
