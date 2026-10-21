interface Props {
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

export default function FilterControls({ config, onChange }: Props) {
  const blur = (config.filterBlur as number) ?? 0;
  const sharpn = (config.filterSharpen as number) ?? 0;
  const poster = (config.filterPosterize as number) ?? 0;

  const hasFilters = blur > 0 || sharpn > 0 || poster >= 2;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Filters</h3>
        {hasFilters && (
          <button className="text-[10px] text-neutral-500 hover:text-neutral-300"
            onClick={() => { onChange('filterBlur', 0); onChange('filterSharpen', 0); onChange('filterPosterize', 0); }}>
            Reset
          </button>
        )}
      </div>

      <Slider label="Blur" value={blur} min={0} max={10}
        onChange={(v) => onChange('filterBlur', v)} />
      <Slider label="Sharpen" value={sharpn} min={0} max={10} step={0.5}
        onChange={(v) => onChange('filterSharpen', v)} />
      <Slider label="Posterize" value={poster} min={0} max={32}
        onChange={(v) => onChange('filterPosterize', v)} />
      <p className="text-[10px] text-neutral-600">Posterize: 0=off, 2=binary, higher=more levels</p>
    </div>
  );
}
