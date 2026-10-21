import { PALETTES } from '@ditherforge/core';

interface Props {
  fgColor: string;
  bgColor: string;
  transparentBg: boolean;
  paletteId: string;
  effectType: string;
  onFgChange: (color: string) => void;
  onBgChange: (color: string) => void;
  onTransparentBgChange: (val: boolean) => void;
  onPaletteChange: (id: string) => void;
}

export default function PaletteSelector({
  fgColor, bgColor, transparentBg, paletteId, effectType,
  onFgChange, onBgChange, onTransparentBgChange, onPaletteChange,
}: Props) {
  const isPixelArt = effectType === 'pixel-art';

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Colors</h3>

      {!isPixelArt && (
        <>
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            Foreground
            <input type="color" value={fgColor} onChange={(e) => onFgChange(e.target.value)}
              className="w-8 h-6 rounded cursor-pointer" />
            <span className="font-mono text-neutral-500">{fgColor}</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            Background
            <input type="color" value={bgColor} onChange={(e) => onBgChange(e.target.value)}
              className="w-8 h-6 rounded cursor-pointer" disabled={transparentBg} />
            <span className="font-mono text-neutral-500">{transparentBg ? 'transparent' : bgColor}</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            <input type="checkbox" checked={transparentBg}
              onChange={(e) => onTransparentBgChange(e.target.checked)} className="accent-green-400" />
            Transparent background
          </label>
        </>
      )}

      {isPixelArt && (
        <div className="space-y-2">
          {PALETTES.map((p) => (
            <button key={p.id}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                paletteId === p.id
                  ? 'bg-green-500/20 ring-1 ring-green-500/50'
                  : 'bg-neutral-800 hover:bg-neutral-700'
              }`}
              onClick={() => onPaletteChange(p.id)}>
              <div className="flex gap-0.5">
                {p.colors.slice(0, 8).map((c, i) => (
                  <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="text-neutral-300">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
