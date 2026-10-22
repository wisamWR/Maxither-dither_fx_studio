import { useCallback, useEffect, useRef, useState } from 'react';
import type { EffectType } from '@ditherforge/core';
import type { WorkerRequest, WorkerResponse } from '../workers/effect.worker.ts';
import { renderToCanvas } from '../lib/canvas-renderer.ts';
import EffectSelector from './EffectSelector.tsx';

interface Props {
  sourceImage: ImageData;
  config: Record<string, unknown>;
  fgColor: string;
  bgColor: string;
  transparentBg: boolean;
}

export default function CompareView({
  sourceImage, config, fgColor, bgColor, transparentBg,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftWorkerRef = useRef<Worker | null>(null);
  const rightWorkerRef = useRef<Worker | null>(null);
  const [dividerX, setDividerX] = useState(50);
  const [leftEffect, setLeftEffect] = useState<EffectType>('ascii');
  const [rightEffect, setRightEffect] = useState<EffectType>('binary');
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const url = new URL('../workers/effect.worker.ts', import.meta.url);
    leftWorkerRef.current = new Worker(url, { type: 'module' });
    rightWorkerRef.current = new Worker(url, { type: 'module' });
    return () => {
      leftWorkerRef.current?.terminate();
      rightWorkerRef.current?.terminate();
    };
  }, []);

  const requestIdRef = useRef(0);

  const processEffect = useCallback(
    (worker: Worker | null, canvas: HTMLCanvasElement | null, effectType: EffectType) => {
      if (!worker || !canvas || !sourceImage) return;
      const request: WorkerRequest = {
        requestId: ++requestIdRef.current,
        rgba: sourceImage.data, width: sourceImage.width,
        height: sourceImage.height, effectType, config,
        fgColor, bgColor,
      };
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data;
        if (msg.type !== 'effect') return;
        const ctx = canvas.getContext('2d');
        if (ctx) renderToCanvas(ctx, msg.result, effectType, fgColor, bgColor, transparentBg);
      };
      worker.postMessage(request);
    },
    [sourceImage, config, fgColor, bgColor, transparentBg],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      processEffect(leftWorkerRef.current, leftCanvasRef.current, leftEffect);
      processEffect(rightWorkerRef.current, rightCanvasRef.current, rightEffect);
    }, 50);
    return () => clearTimeout(t);
  }, [processEffect, leftEffect, rightEffect]);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setDividerX(Math.max(10, Math.min(90, pct)));
    },
    [dragging],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onUp = () => setDragging(false);
    if (dragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchend', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, handleMove]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <p className="text-xs text-neutral-500 mb-1">Left</p>
          <EffectSelector value={leftEffect} onChange={setLeftEffect} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-neutral-500 mb-1">Right</p>
          <EffectSelector value={rightEffect} onChange={setRightEffect} />
        </div>
      </div>

      <div ref={containerRef} className="relative overflow-hidden border border-neutral-800 rounded bg-neutral-900 select-none"
        style={{ aspectRatio: `${sourceImage.width} / ${sourceImage.height}` }}>
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - dividerX}% 0 0)` }}>
          <canvas ref={leftCanvasRef} className="w-full h-full object-contain" />
        </div>
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${dividerX}%)` }}>
          <canvas ref={rightCanvasRef} className="w-full h-full object-contain" />
        </div>
        <div className="absolute top-0 bottom-0 w-0.5 bg-white/60 cursor-col-resize z-10"
          style={{ left: `${dividerX}%` }}
          onMouseDown={() => setDragging(true)}
          onTouchStart={() => setDragging(true)}>
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow">
            <span className="text-neutral-800 text-xs font-bold">||</span>
          </div>
        </div>
      </div>
    </div>
  );
}
