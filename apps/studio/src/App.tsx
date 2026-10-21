import { useCallback, useEffect, useState } from 'react';
import type { EffectType, EffectResult } from '@ditherforge/core';
import { PALETTES, buildCalibratedCharset } from '@ditherforge/core';
import type { StudioState } from './types.ts';
import { DEFAULT_STATE } from './types.ts';
import { readStateFromUrl } from './lib/url-state.ts';
import { generateGlyphBitmaps } from './lib/glyph-atlas.ts';
import { useHistory } from './lib/history.ts';
import type { Preset } from './lib/presets.ts';
import ImageLoader from './components/ImageLoader.tsx';
import WebcamCapture from './components/WebcamCapture.tsx';
import EffectSelector from './components/EffectSelector.tsx';
import EffectControls from './components/EffectControls.tsx';
import FilterControls from './components/FilterControls.tsx';
import PaletteSelector from './components/PaletteSelector.tsx';
import PresetPanel from './components/PresetPanel.tsx';
import PreviewCanvas from './components/PreviewCanvas.tsx';
import ExportPanel from './components/ExportPanel.tsx';
import CompareView from './components/CompareView.tsx';
import EmbedPanel from './components/EmbedPanel.tsx';
import CodeExportPanel from './components/CodeExportPanel.tsx';

export default function App() {
  const [state, setState] = useState<StudioState>(() => {
    const saved = readStateFromUrl();
    return saved ? { ...DEFAULT_STATE, ...saved } : DEFAULT_STATE;
  });
  const [lastResult, setLastResult] = useState<EffectResult | null>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const history = useHistory();

  const handleImageLoad = (imageData: ImageData) => {
    setState((prev) => ({ ...prev, sourceImage: imageData }));
  };

  // Global paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (state.sourceImage) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          const url = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            handleImageLoad(ctx.getImageData(0, 0, img.width, img.height));
            URL.revokeObjectURL(url);
          };
          img.src = url;
          return;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [state.sourceImage]);

  // Generate glyph bitmaps when shape-ascii is first selected
  useEffect(() => {
    if (state.effectType === 'shape-ascii' && !state.glyphBitmaps) {
      const bitmaps = generateGlyphBitmaps();
      const calibrated = buildCalibratedCharset(bitmaps);
      setState((prev) => ({
        ...prev,
        glyphBitmaps: bitmaps,
        calibratedCharset: calibrated,
        effectConfig: { ...prev.effectConfig, glyphs: bitmaps },
      }));
    }
  }, [state.effectType, state.glyphBitmaps]);

  // Undo/redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const prev = history.undo();
        if (prev) setState((s) => ({ ...s, effectType: prev.effectType as EffectType, effectConfig: prev.effectConfig, fgColor: prev.fgColor, bgColor: prev.bgColor }));
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        const next = history.redo();
        if (next) setState((s) => ({ ...s, effectType: next.effectType as EffectType, effectConfig: next.effectConfig, fgColor: next.fgColor, bgColor: next.bgColor }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history]);

  const handleEffectChange = (effectType: EffectType) => {
    setState((prev) => {
      const updates: Partial<StudioState> = { effectType };
      // Auto-inject calibrated charset if available
      if ((effectType === 'ascii' || effectType === 'color-ascii') && prev.calibratedCharset) {
        updates.effectConfig = { ...prev.effectConfig, charset: prev.calibratedCharset };
      }
      // Inject glyphs for shape-ascii
      if (effectType === 'shape-ascii' && prev.glyphBitmaps) {
        updates.effectConfig = { ...prev.effectConfig, glyphs: prev.glyphBitmaps };
      }
      return { ...prev, ...updates };
    });
  };

  const handleConfigChange = (key: string, value: unknown) => {
    setState((prev) => {
      const next = { ...prev, effectConfig: { ...prev.effectConfig, [key]: value } };
      history.push({ effectType: next.effectType, effectConfig: next.effectConfig, fgColor: next.fgColor, bgColor: next.bgColor });
      return next;
    });
  };

  const handlePaletteChange = (id: string) => {
    const palette = PALETTES.find((p) => p.id === id);
    if (palette) {
      setState((prev) => ({
        ...prev,
        effectConfig: { ...prev.effectConfig, paletteId: id, palette: palette.colors },
      }));
    }
  };

  const handlePresetApply = (preset: Preset) => {
    setState((prev) => ({
      ...prev,
      effectType: preset.effectType,
      effectConfig: { ...prev.effectConfig, ...preset.config },
      fgColor: preset.fgColor,
      bgColor: preset.bgColor,
    }));
    history.push({ effectType: preset.effectType, effectConfig: preset.config, fgColor: preset.fgColor, bgColor: preset.bgColor });
  };

  const handleResult = useCallback((result: EffectResult) => {
    setLastResult(result);
  }, []);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    setCanvasEl(canvas);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-green-400">Dither</span>Forge
        </h1>
        <div className="flex items-center gap-3">
          {state.sourceImage && (
            <span className="text-xs text-neutral-500">
              {state.sourceImage.width} x {state.sourceImage.height}
            </span>
          )}
          {state.sourceImage && (
            <div className="flex gap-1">
              <button className="px-2 py-0.5 text-xs rounded bg-neutral-800 text-neutral-400 hover:bg-neutral-700 disabled:opacity-30"
                disabled={!history.canUndo} onClick={() => { const prev = history.undo(); if (prev) setState((s) => ({ ...s, effectType: prev.effectType as EffectType, effectConfig: prev.effectConfig, fgColor: prev.fgColor, bgColor: prev.bgColor })); }}
                title="Undo (Ctrl+Z)">Undo</button>
              <button className="px-2 py-0.5 text-xs rounded bg-neutral-800 text-neutral-400 hover:bg-neutral-700 disabled:opacity-30"
                disabled={!history.canRedo} onClick={() => { const next = history.redo(); if (next) setState((s) => ({ ...s, effectType: next.effectType as EffectType, effectConfig: next.effectConfig, fgColor: next.fgColor, bgColor: next.bgColor })); }}
                title="Redo (Ctrl+Y)">Redo</button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {!state.sourceImage ? (
          <div className="space-y-6">
            <ImageLoader onImageLoad={handleImageLoad} />
            <WebcamCapture onCapture={handleImageLoad} />
          </div>
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-6">
            <aside className="space-y-6 overflow-y-auto max-h-[calc(100vh-120px)] pr-2">
              <div className="flex items-center gap-4">
                <button
                  className="text-sm text-neutral-400 hover:text-neutral-200"
                  onClick={() => { setState(DEFAULT_STATE); setLastResult(null); setCanvasEl(null); setCompareMode(false); }}
                >
                  &larr; New image
                </button>
                <button
                  className={`text-sm px-3 py-1 rounded transition-colors ${
                    compareMode ? 'bg-green-500/20 text-green-400' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  onClick={() => setCompareMode(!compareMode)}>
                  {compareMode ? 'Single View' : 'Compare'}
                </button>
              </div>

              <EffectSelector value={state.effectType} onChange={handleEffectChange} />
              <EffectControls effectType={state.effectType} config={state.effectConfig} onChange={handleConfigChange} />
              <FilterControls config={state.effectConfig} onChange={handleConfigChange} />
              <PresetPanel
                onApply={handlePresetApply}
                currentEffectType={state.effectType}
                currentConfig={state.effectConfig}
                currentFgColor={state.fgColor}
                currentBgColor={state.bgColor}
              />
              <PaletteSelector
                fgColor={state.fgColor} bgColor={state.bgColor} transparentBg={state.transparentBg}
                paletteId={(state.effectConfig.paletteId as string) ?? 'mono'}
                effectType={state.effectType}
                onFgChange={(c) => setState((s) => ({ ...s, fgColor: c }))}
                onBgChange={(c) => setState((s) => ({ ...s, bgColor: c }))}
                onTransparentBgChange={(v) => setState((s) => ({ ...s, transparentBg: v }))}
                onPaletteChange={handlePaletteChange}
              />
              <ExportPanel
                canvas={canvasEl} result={lastResult} effectType={state.effectType}
                fgColor={state.fgColor} bgColor={state.bgColor}
                effectConfig={state.effectConfig} transparentBg={state.transparentBg}
              />
              <EmbedPanel
                result={lastResult} fgColor={state.fgColor} bgColor={state.bgColor}
              />
              <CodeExportPanel
                result={lastResult} fgColor={state.fgColor} bgColor={state.bgColor}
              />
            </aside>

            <section>
              {compareMode ? (
                <CompareView
                  sourceImage={state.sourceImage}
                  config={state.effectConfig}
                  fgColor={state.fgColor}
                  bgColor={state.bgColor}
                  transparentBg={state.transparentBg}
                />
              ) : (
                <PreviewCanvas
                  sourceImage={state.sourceImage} effectType={state.effectType}
                  config={state.effectConfig} fgColor={state.fgColor} bgColor={state.bgColor}
                  transparentBg={state.transparentBg}
                  onResult={handleResult} onCanvasReady={handleCanvasReady}
                />
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
