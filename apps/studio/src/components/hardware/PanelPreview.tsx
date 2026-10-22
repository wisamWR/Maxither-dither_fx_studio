import { useRef, useEffect } from "react";
import type { Panel } from "@ditherforge/hardware";
import { simulatePanel } from "@ditherforge/hardware";

interface Props {
  data: Uint8Array;
  width: number;
  height: number;
  panel: Panel;
  invert: boolean;
}

export default function PanelPreview({
  data,
  width,
  height,
  panel,
  invert,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const ctx = canvas.getContext("2d")!;

    const grid = simulatePanel(data, width, height, panel, invert);

    // Calculate cell size to fit container (max 600px wide)
    const maxW = 600;
    const cellSize = Math.max(1, Math.min(Math.floor(maxW / width), 8));
    canvas.width = width * cellSize;
    canvas.height = height * cellSize;

    // Draw background (dark)
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!grid[y][x]) continue;
        ctx.fillStyle = panel.tint;
        if (panel.pixelShape === "round" && cellSize >= 3) {
          ctx.beginPath();
          ctx.arc(
            x * cellSize + cellSize / 2,
            y * cellSize + cellSize / 2,
            cellSize / 2 - 0.5,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        } else {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [data, width, height, panel, invert]);

  return (
    <div className="space-y-2">
      <div className="text-xs text-neutral-500">
        {panel.name} - {width}×{height}
      </div>
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto border border-neutral-800 rounded bg-neutral-950"
      />
      <div className="text-xs text-neutral-600">{panel.notes}</div>
    </div>
  );
}
