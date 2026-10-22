import { useState, useMemo } from 'react';
import {
  rgbaToGrayscale, floydSteinberg, atkinsonDither, bayerDither,
  resizeGray,
} from '@ditherforge/core';
import type { DitherResult, DitherConfig, BayerConfig } from '@ditherforge/core';
import { PANELS } from '@ditherforge/hardware';
import type { Panel } from '@ditherforge/hardware';
import PanelPreview from './PanelPreview.tsx';
import HardwareExport from './HardwareExport.tsx';

interface Props {
  sourceImage: ImageData;
}

type DitherMethod = 'floyd-steinberg' | 'atkinson' | 'bayer';

export default function HardwareMode({ sourceImage }: Props) {
  const [panelId, setPanelId] = useState(PANELS[0].id);
  const [method, setMethod] = useState<DitherMethod>('floyd-steinberg');
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [threshold, setThreshold] = useState(128);
  const [matrixSize, setMatrixSize] = useState<2 | 4 | 8>(4);
  const [fit, setFit] = useState<'contain' | 'cover' | 'stretch'>('contain');
  const [invertPreview, setInvertPreview] = useState(false);

  const panel = PANELS.find(p => p.id === panelId) ?? PANELS[0];

  const result: DitherResult | null = useMemo(() => {
    const gray = rgbaToGrayscale(sourceImage.data, sourceImage.width, sourceImage.height);

    // Compute effective panel height (auto from aspect ratio if 0)
    const targetH = panel.height === 0
      ? Math.round(gray.height * panel.width / gray.width)
      : panel.height;

    const resized = resizeGray(gray, panel.width, targetH, fit, panel.oneIs === 'bright' ? 0 : 255);

    const base = { brightness, contrast, invert: false };
    switch (method) {
      case 'floyd-steinberg':
        return floydSteinberg(resized, { ...base, threshold } satisfies DitherConfig);
      case 'atkinson':
        return atkinsonDither(resized, { ...base, threshold } satisfies DitherConfig);
      case 'bayer':
        return bayerDither(resized, { ...base, matrixSize } satisfies BayerConfig);
    }
  }, [sourceImage, panel, method, brightness, contrast, threshold, matrixSize, fit]);

  if (!result) return null;

  const grouped = PANELS.reduce((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {} as Record<string, Panel[]>);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-6">
      <aside className="space-y-4 overflow-y-auto max-h-[calc(100vh-120px)] pr-2">
        <h2 className="text-sm font-semibold text-neutral-300">Hardware Export</h2>

        {/* Panel selector */}
        <div className="space-y-1">
          <label className="text-xs text-neutral-400">Target Panel</label>
          <select value={panelId} onChange={(e) => setPanelId(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200">
            {Object.entries(grouped).map(([cat, panels]) => (
              <optgroup key={cat} label={cat.toUpperCase()}>
                {panels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Dither method */}
        <div className="space-y-1">
          <label className="text-xs text-neutral-400">Dither Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value as DitherMethod)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200">
            <option value="floyd-steinberg">Floyd-Steinberg</option>
            <option value="atkinson">Atkinson</option>
            <option value="bayer">Bayer Ordered</option>
          </select>
        </div>

        {/* Fit mode */}
        <div className="space-y-1">
          <label className="text-xs text-neutral-400">Resize Fit</label>
          <select value={fit} onChange={(e) => setFit(e.target.value as 'contain' | 'cover' | 'stretch')}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200">
            <option value="contain">Contain (pad)</option>
            <option value="cover">Cover (crop)</option>
            <option value="stretch">Stretch</option>
          </select>
        </div>

        {/* Sliders */}
        <div className="space-y-2">
          <label className="flex justify-between text-xs text-neutral-400">
            Brightness <span>{brightness}</span>
          </label>
          <input type="range" min={-100} max={100} value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-full" />
        </div>
        <div className="space-y-2">
          <label className="flex justify-between text-xs text-neutral-400">
            Contrast <span>{contrast}</span>
          </label>
          <input type="range" min={-100} max={100} value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="w-full" />
        </div>
        <div className="space-y-2">
          <label className="flex justify-between text-xs text-neutral-400">
            Threshold <span>{threshold}</span>
          </label>
          <input type="range" min={0} max={255} value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full" />
        </div>
        {method === 'bayer' && (
          <div className="space-y-1">
            <label className="text-xs text-neutral-400">Matrix Size</label>
            <select value={matrixSize} onChange={(e) => setMatrixSize(Number(e.target.value) as 2 | 4 | 8)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200">
              <option value="2">2x2</option>
              <option value="4">4x4</option>
              <option value="8">8x8</option>
            </select>
          </div>
        )}

        {/* Preview invert toggle */}
        <label className="flex items-center gap-2 text-xs text-neutral-400">
          <input type="checkbox" checked={invertPreview} onChange={(e) => setInvertPreview(e.target.checked)} />
          Invert Preview
        </label>

        {/* Export panel */}
        <HardwareExport data={result.data} width={result.width} height={result.height} panel={panel} />
      </aside>

      <section>
        <PanelPreview data={result.data} width={result.width} height={result.height} panel={panel} invert={invertPreview} />
      </section>
    </div>
  );
}
