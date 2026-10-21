import { useCallback, useEffect, useRef, useState } from 'react';
import type { EffectType, EffectResult } from '@ditherforge/core';
import type { WorkerRequest, WorkerResponse } from '../workers/effect.worker.ts';
import { renderToCanvas } from '../lib/canvas-renderer.ts';

interface Props {
  sourceImage: ImageData;
  effectType: EffectType;
  config: Record<string, unknown>;
  fgColor: string;
  bgColor: string;
  transparentBg: boolean;
  onResult: (result: EffectResult) => void;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

export default function PreviewCanvas({
  sourceImage, effectType, config, fgColor, bgColor, transparentBg, onResult, onCanvasReady,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [processing, setProcessing] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/effect.worker.ts', import.meta.url),
      { type: 'module' },
    );
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (canvasRef.current) onCanvasReady(canvasRef.current);
  }, [onCanvasReady]);

  const process = useCallback(() => {
    if (!workerRef.current || !sourceImage) return;
    setProcessing(true);

    const request: WorkerRequest = {
      rgba: sourceImage.data,
      width: sourceImage.width,
      height: sourceImage.height,
      effectType,
      config,
    };

    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { result, durationMs } = e.data;
      setProcessing(false);
      setDuration(durationMs);
      onResult(result);

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) renderToCanvas(ctx, result, effectType, fgColor, bgColor, transparentBg);
    };

    workerRef.current.postMessage(request);
  }, [sourceImage, effectType, config, fgColor, bgColor, transparentBg, onResult]);

  useEffect(() => {
    const timer = setTimeout(process, 50);
    return () => clearTimeout(timer);
  }, [process]);

  return (
    <div className="relative">
      <canvas ref={canvasRef}
        className="max-w-full h-auto border border-neutral-800 rounded bg-neutral-900" />
      <div className="absolute top-2 right-2 text-xs text-neutral-500 bg-neutral-900/80 px-2 py-0.5 rounded">
        {processing ? 'Processing...' : `${duration.toFixed(0)} ms`}
      </div>
    </div>
  );
}
