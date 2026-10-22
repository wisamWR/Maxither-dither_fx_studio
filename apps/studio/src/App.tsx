import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
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

const HardwareMode = lazy(() => import('./components/hardware/HardwareMode.tsx'));

type SidebarTab = 'effect' | 'adjust' | 'export';

function loadExampleImage(): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = reject;
    img.src = '/example.jpg';
  });
}

export default function App() {
  const [state, setState] = useState<StudioState>(() => {
    const saved = readStateFromUrl();
    return saved ? { ...DEFAULT_STATE, ...saved } : DEFAULT_STATE;
  });
  const [lastResult, setLastResult] = useState<EffectResult | null>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [mode, setMode] = useState<'studio' | 'hardware'>('studio');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('effect');
  const [exampleLoading, setExampleLoading] = useState(true);
  const history = useHistory();

  const handleImageLoad = (imageData: ImageData) => {
    setState((prev) => ({ ...prev, sourceImage: imageData }));
  };

  // Load example image on mount
  useEffect(() => {
    loadExampleImage().then(handleImageLoad).catch(() => {}).finally(() => setExampleLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
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
  }, []);

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
      if ((effectType === 'ascii' || effectType === 'color-ascii') && prev.calibratedCharset) {
        updates.effectConfig = { ...prev.effectConfig, charset: prev.calibratedCharset };
      }
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

  const SIDEBAR_TABS: { id: SidebarTab; label: string }[] = [
    { id: 'effect', label: 'Effect' },
    { id: 'adjust', label: 'Adjust' },
    { id: 'export', label: 'Export' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Maxither" className="w-8 h-8 rounded-md object-cover" />
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-green-400">Max</span>ither
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {state.sourceImage && (
            <span className="text-xs text-neutral-500 hidden sm:inline">
              {state.sourceImage.width} &times; {state.sourceImage.height}
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
          {state.sourceImage && (
            <div className="flex gap-1 ml-2">
              <button className={`px-3 py-1 text-xs rounded ${mode === 'studio' ? 'bg-green-500/20 text-green-400' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                onClick={() => setMode('studio')}>Studio</button>
              <button className={`px-3 py-1 text-xs rounded ${mode === 'hardware' ? 'bg-green-500/20 text-green-400' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                onClick={() => setMode('hardware')}>Hardware</button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {!state.sourceImage ? (
          /* Landing: loading example or upload fallback */
          <div className="flex flex-col items-center justify-center gap-6 py-16">
            <img src="/logo.jpg" alt="Maxither" className="w-20 h-20 rounded-xl object-cover shadow-lg shadow-green-500/10" />
            <h2 className="text-2xl font-bold"><span className="text-green-400">Max</span>ither</h2>
            <p className="text-neutral-400 text-sm text-center max-w-md">
              {exampleLoading
                ? 'Dither, ASCII art, pixel effects and more. Loading example...'
                : 'Dither, ASCII art, pixel effects and more. Drop an image to start.'}
            </p>
            <div className="w-full max-w-lg space-y-4">
              <ImageLoader onImageLoad={handleImageLoad} />
              <WebcamCapture onCapture={handleImageLoad} />
            </div>
          </div>
        ) : mode === 'hardware' ? (
          <Suspense fallback={<div className="text-neutral-500 text-sm">Loading hardware mode...</div>}>
            <HardwareMode sourceImage={state.sourceImage} />
          </Suspense>
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-[300px_1fr] gap-4">
            {/* Sidebar */}
            <aside className="space-y-0 overflow-y-auto max-h-[calc(100vh-80px)]">
              {/* Top bar: change image + compare */}
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-800 mb-3">
                <button
                  className="text-xs text-neutral-400 hover:text-neutral-200 px-2 py-1 rounded bg-neutral-800/50 hover:bg-neutral-800"
                  onClick={() => { setState(DEFAULT_STATE); setLastResult(null); setCanvasEl(null); setCompareMode(false); }}
                >
                  New Image
                </button>
                <button
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    compareMode ? 'bg-green-500/20 text-green-400' : 'text-neutral-400 bg-neutral-800/50 hover:bg-neutral-800'
                  }`}
                  onClick={() => setCompareMode(!compareMode)}>
                  {compareMode ? 'Single' : 'Compare'}
                </button>
              </div>

              {/* Tab navigation */}
              <div className="flex border-b border-neutral-800 mb-4">
                {SIDEBAR_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    className={`flex-1 text-xs font-medium py-2 text-center transition-colors border-b-2 ${
                      sidebarTab === tab.id
                        ? 'text-green-400 border-green-400'
                        : 'text-neutral-500 border-transparent hover:text-neutral-300'
                    }`}
                    onClick={() => setSidebarTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="space-y-5 pr-1">
                {sidebarTab === 'effect' && (
                  <>
                    <EffectSelector value={state.effectType} onChange={handleEffectChange} />
                    <div className="border-t border-neutral-800/50 pt-4">
                      <PresetPanel
                        onApply={handlePresetApply}
                        currentEffectType={state.effectType}
                        currentConfig={state.effectConfig}
                        currentFgColor={state.fgColor}
                        currentBgColor={state.bgColor}
                      />
                    </div>
                  </>
                )}

                {sidebarTab === 'adjust' && (
                  <>
                    <EffectControls effectType={state.effectType} config={state.effectConfig} onChange={handleConfigChange} />
                    <div className="border-t border-neutral-800/50 pt-4">
                      <FilterControls config={state.effectConfig} onChange={handleConfigChange} />
                    </div>
                    <div className="border-t border-neutral-800/50 pt-4">
                      <PaletteSelector
                        fgColor={state.fgColor} bgColor={state.bgColor} transparentBg={state.transparentBg}
                        paletteId={(state.effectConfig.paletteId as string) ?? 'mono'}
                        effectType={state.effectType}
                        onFgChange={(c) => setState((s) => ({ ...s, fgColor: c }))}
                        onBgChange={(c) => setState((s) => ({ ...s, bgColor: c }))}
                        onTransparentBgChange={(v) => setState((s) => ({ ...s, transparentBg: v }))}
                        onPaletteChange={handlePaletteChange}
                      />
                    </div>
                  </>
                )}

                {sidebarTab === 'export' && (
                  <>
                    <ExportPanel
                      canvas={canvasEl} result={lastResult} effectType={state.effectType}
                      fgColor={state.fgColor} bgColor={state.bgColor}
                      effectConfig={state.effectConfig} transparentBg={state.transparentBg}
                    />
                    <div className="border-t border-neutral-800/50 pt-4">
                      <EmbedPanel
                        result={lastResult} fgColor={state.fgColor} bgColor={state.bgColor}
                      />
                    </div>
                    <div className="border-t border-neutral-800/50 pt-4">
                      <CodeExportPanel
                        result={lastResult} fgColor={state.fgColor} bgColor={state.bgColor}
                      />
                    </div>
                  </>
                )}
              </div>
            </aside>

            {/* Preview */}
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
