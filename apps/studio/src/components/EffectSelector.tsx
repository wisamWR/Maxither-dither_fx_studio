import type { EffectType } from '@ditherforge/core';

const EFFECTS: { id: EffectType; label: string; group: string }[] = [
  { id: 'binary', label: 'Binary (0/1)', group: 'Text' },
  { id: 'ascii', label: 'ASCII', group: 'Text' },
  { id: 'braille', label: 'Braille', group: 'Text' },
  { id: 'floyd-steinberg', label: 'Floyd-Steinberg', group: 'Dither' },
  { id: 'atkinson', label: 'Atkinson', group: 'Dither' },
  { id: 'bayer', label: 'Bayer', group: 'Dither' },
  { id: 'halftone', label: 'Halftone', group: 'Dots' },
  { id: 'pixel-art', label: 'Pixel Art', group: 'Color' },
  { id: 'shape-ascii', label: 'Shape Match', group: 'Advanced' },
  { id: 'edge-ascii', label: 'Edge Detect', group: 'Advanced' },
  { id: 'color-ascii', label: 'Color ASCII', group: 'Advanced' },
];

interface Props {
  value: EffectType;
  onChange: (effect: EffectType) => void;
}

export default function EffectSelector({ value, onChange }: Props) {
  const groups = [...new Set(EFFECTS.map((e) => e.group))];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Effect</h3>
      {groups.map((group) => (
        <div key={group}>
          <p className="text-xs text-neutral-500 mb-1">{group}</p>
          <div className="flex flex-wrap gap-1">
            {EFFECTS.filter((e) => e.group === group).map((effect) => (
              <button
                key={effect.id}
                className={`px-3 py-1.5 text-xs rounded transition-colors ${
                  value === effect.id
                    ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
                onClick={() => onChange(effect.id)}
              >
                {effect.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
