import type { EffectType } from '@ditherforge/core';

interface Props {
  effectType: EffectType;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

function Slider({
  label, value, min, max, step, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-neutral-400 flex justify-between">
        {label} <span className="text-neutral-500">{value}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step ?? 1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-green-400"
      />
    </label>
  );
}

export default function EffectControls({ effectType, config, onChange }: Props) {
  const isText = effectType === 'binary' || effectType === 'ascii' || effectType === 'braille';
  const isDither = effectType === 'floyd-steinberg' || effectType === 'atkinson' || effectType === 'bayer';

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Controls</h3>

      <Slider label="Brightness" value={(config.brightness as number) ?? 0} min={-100} max={100}
        onChange={(v) => onChange('brightness', v)} />
      <Slider label="Contrast" value={(config.contrast as number) ?? 0} min={-100} max={100}
        onChange={(v) => onChange('contrast', v)} />
      <label className="flex items-center gap-2 text-xs text-neutral-400">
        <input type="checkbox" checked={(config.invert as boolean) ?? false}
          onChange={(e) => onChange('invert', e.target.checked)} className="accent-green-400" />
        Invert
      </label>

      {isText && (
        <Slider label="Columns" value={(config.cols as number) ?? 80} min={10} max={200}
          onChange={(v) => onChange('cols', v)} />
      )}

      {(effectType === 'binary' || effectType === 'braille') && (
        <Slider label="Threshold" value={(config.threshold as number) ?? 128} min={0} max={255}
          onChange={(v) => onChange('threshold', v)} />
      )}

      {effectType === 'ascii' && (
        <label className="block">
          <span className="text-xs text-neutral-400">Charset (dark -&gt; bright)</span>
          <input type="text" value={(config.charset as string) ?? ' .:-=+*#%@'}
            onChange={(e) => onChange('charset', e.target.value)}
            className="w-full bg-neutral-800 rounded px-2 py-1 text-sm font-mono text-neutral-200 mt-1" />
        </label>
      )}

      {isDither && effectType !== 'bayer' && (
        <Slider label="Threshold" value={(config.threshold as number) ?? 128} min={0} max={255}
          onChange={(v) => onChange('threshold', v)} />
      )}

      {effectType === 'bayer' && (
        <label className="block">
          <span className="text-xs text-neutral-400">Matrix Size</span>
          <select value={(config.matrixSize as number) ?? 4}
            onChange={(e) => onChange('matrixSize', Number(e.target.value))}
            className="w-full bg-neutral-800 rounded px-2 py-1 text-sm text-neutral-200 mt-1">
            <option value={2}>2x2</option>
            <option value={4}>4x4</option>
            <option value={8}>8x8</option>
          </select>
        </label>
      )}

      {effectType === 'halftone' && (
        <>
          <Slider label="Dot Spacing" value={(config.dotSpacing as number) ?? 8} min={3} max={30}
            onChange={(v) => onChange('dotSpacing', v)} />
          <Slider label="Max Dot Radius" value={(config.maxDotRadius as number) ?? 4} min={1} max={15}
            onChange={(v) => onChange('maxDotRadius', v)} />
          <Slider label="Angle" value={(config.angle as number) ?? 0} min={0} max={360}
            onChange={(v) => onChange('angle', v)} />
        </>
      )}

      {effectType === 'pixel-art' && (
        <Slider label="Pixel Size" value={(config.pixelSize as number) ?? 8} min={2} max={32}
          onChange={(v) => onChange('pixelSize', v)} />
      )}

      {effectType === 'shape-ascii' && (
        <Slider label="Columns" value={(config.cols as number) ?? 80} min={10} max={200}
          onChange={(v) => onChange('cols', v)} />
      )}

      {effectType === 'edge-ascii' && (
        <>
          <Slider label="Columns" value={(config.cols as number) ?? 80} min={10} max={200}
            onChange={(v) => onChange('cols', v)} />
          <Slider label="Edge Threshold" value={(config.edgeThreshold as number) ?? 30} min={0} max={255}
            onChange={(v) => onChange('edgeThreshold', v)} />
          <label className="block">
            <span className="text-xs text-neutral-400">Mode</span>
            <select value={(config.edgeMode as string) ?? 'hybrid'}
              onChange={(e) => onChange('edgeMode', e.target.value)}
              className="w-full bg-neutral-800 rounded px-2 py-1 text-sm text-neutral-200 mt-1">
              <option value="edge-only">Edge Only</option>
              <option value="hybrid">Hybrid (edges + brightness)</option>
            </select>
          </label>
        </>
      )}

      {effectType === 'color-ascii' && (
        <>
          <Slider label="Columns" value={(config.cols as number) ?? 80} min={10} max={200}
            onChange={(v) => onChange('cols', v)} />
          <label className="block">
            <span className="text-xs text-neutral-400">Charset (dark → bright)</span>
            <input type="text" value={(config.charset as string) ?? ' .:-=+*#%@'}
              onChange={(e) => onChange('charset', e.target.value)}
              className="w-full bg-neutral-800 rounded px-2 py-1 text-sm font-mono text-neutral-200 mt-1" />
          </label>
        </>
      )}

      {effectType === 'glitch' && (
        <>
          <Slider label="Intensity" value={(config.intensity as number) ?? 50} min={0} max={100}
            onChange={(v) => onChange('intensity', v)} />
          <Slider label="Seed" value={(config.seed as number) ?? 42} min={0} max={9999}
            onChange={(v) => onChange('seed', v)} />
          <Slider label="Scanlines" value={(config.scanlineCount as number) ?? 10} min={1} max={50}
            onChange={(v) => onChange('scanlineCount', v)} />
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            <input type="checkbox" checked={(config.rgbSplit as boolean) ?? true}
              onChange={(e) => onChange('rgbSplit', e.target.checked)} className="accent-green-400" />
            RGB Split
          </label>
          {(config.rgbSplit as boolean) !== false && (
            <Slider label="Split Distance" value={(config.rgbSplitDistance as number) ?? 5} min={1} max={20}
              onChange={(v) => onChange('rgbSplitDistance', v)} />
          )}
        </>
      )}
    </div>
  );
}
