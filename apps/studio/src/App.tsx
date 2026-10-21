import { useCallback, useEffect, useState } from 'react';
import type { EffectType, EffectResult } from '@ditherforge/core';
import { PALETTES } from '@ditherforge/core';
import type { StudioState } from './types.ts';
import { DEFAULT_STATE } from './types.ts';
import { readStateFromUrl } from './lib/url-state.ts';
import ImageLoader from './components/ImageLoader.tsx';
import EffectSelector from './components/EffectSelector.tsx';
import EffectControls from './components/EffectControls.tsx';
import PaletteSelector from './components/PaletteSelector.tsx';
import PreviewCanvas from './components/PreviewCanvas.tsx';
import ExportPanel from './components/ExportPanel.tsx';

export default function App() {
  const [state, setState] = useState<StudioState>(() => {
    const saved = readStateFromUrl();
    return saved ? { ...DEFAULT_STATE, ...saved } : DEFAULT_STATE;
  });
  const [lastResult, setLastResult] = useState<EffectResult | null>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

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

  const handleEffectChange = (effectType: EffectType) => {
    setState((prev) => ({ ...prev, effectType }));
  };

  const handleConfigChange = (key: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      effectConfig: { ...prev.effectConfig, [key]: value },
    }));
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
        {state.sourceImage && (
          <span className="text-xs text-neutral-500">
            {state.sourceImage.width} x {state.sourceImage.height}
          </span>
        )}
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {!state.sourceImage ? (
          <ImageLoader onImageLoad={handleImageLoad} />
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-6">
            <aside className="space-y-6 overflow-y-auto max-h-[calc(100vh-120px)] pr-2">
              <button
                className="text-sm text-neutral-400 hover:text-neutral-200"
                onClick={() => { setState(DEFAULT_STATE); setLastResult(null); setCanvasEl(null); }}
              >
                &larr; New image
              </button>

              <EffectSelector value={state.effectType} onChange={handleEffectChange} />
              <EffectControls effectType={state.effectType} config={state.effectConfig} onChange={handleConfigChange} />
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
            </aside>

            <section>
              <PreviewCanvas
                sourceImage={state.sourceImage} effectType={state.effectType}
                config={state.effectConfig} fgColor={state.fgColor} bgColor={state.bgColor}
                transparentBg={state.transparentBg}
                onResult={handleResult} onCanvasReady={handleCanvasReady}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
