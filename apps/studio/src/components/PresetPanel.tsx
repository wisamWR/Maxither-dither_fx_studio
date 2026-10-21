import { useEffect, useState } from 'react';
import type { EffectType } from '@ditherforge/core';
import type { Preset } from '../lib/presets.ts';
import { BUILT_IN_PRESETS, loadCustomPresets, saveCustomPreset, deleteCustomPreset } from '../lib/presets.ts';

interface Props {
  onApply: (preset: Preset) => void;
  currentEffectType: EffectType;
  currentConfig: Record<string, unknown>;
  currentFgColor: string;
  currentBgColor: string;
}

export default function PresetPanel({
  onApply, currentEffectType, currentConfig, currentFgColor, currentBgColor,
}: Props) {
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setCustomPresets(loadCustomPresets());
  }, []);

  const handleApply = (preset: Preset) => {
    setActiveId(preset.id);
    onApply(preset);
  };

  const handleSave = () => {
    const name = window.prompt('Preset name:');
    if (!name?.trim()) return;
    const newPreset = saveCustomPreset({
      name: name.trim(),
      effectType: currentEffectType,
      config: currentConfig,
      fgColor: currentFgColor,
      bgColor: currentBgColor,
    });
    setCustomPresets((prev) => [...prev, newPreset]);
  };

  const handleDelete = (id: string) => {
    deleteCustomPreset(id);
    setCustomPresets((prev) => prev.filter((p) => p.id !== id));
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">Presets</h3>

      <div className="flex flex-wrap gap-1">
        {BUILT_IN_PRESETS.map((preset) => (
          <button
            key={preset.id}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              activeId === preset.id
                ? 'ring-1 ring-offset-1 ring-offset-neutral-950 bg-neutral-800'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
            style={activeId === preset.id ? { color: preset.fgColor, borderColor: preset.fgColor } : { borderLeft: `2px solid ${preset.fgColor}` }}
            onClick={() => handleApply(preset)}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {customPresets.length > 0 && (
        <div>
          <p className="text-xs text-neutral-500 mb-1">Custom</p>
          <div className="flex flex-wrap gap-1">
            {customPresets.map((preset) => (
              <div key={preset.id} className="flex items-center gap-0.5">
                <button
                  className={`px-3 py-1.5 text-xs rounded-l transition-colors ${
                    activeId === preset.id
                      ? 'ring-1 ring-offset-1 ring-offset-neutral-950 bg-neutral-800'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                  style={activeId === preset.id ? { color: preset.fgColor } : { borderLeft: `2px solid ${preset.fgColor}` }}
                  onClick={() => handleApply(preset)}
                >
                  {preset.name}
                </button>
                <button
                  className="px-1.5 py-1.5 text-xs text-red-400 bg-neutral-800 rounded-r hover:bg-red-500/20 transition-colors"
                  onClick={() => handleDelete(preset.id)}
                  title="Delete preset"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className="w-full px-3 py-2 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
        onClick={handleSave}
      >
        Save Current as Preset
      </button>
    </div>
  );
}
