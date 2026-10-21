interface Props {
  ansiText: string;
}

export default function AnsiPreview({ ansiText }: Props) {
  const html = ansiToHtml(ansiText);
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded p-3 overflow-x-auto max-h-64 overflow-y-auto">
      <pre className="text-xs font-mono leading-tight whitespace-pre"
        dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function ansiToHtml(text: string): string {
  let html = '';
  let currentColor = '';
  const parts = text.split(/\x1b\[/);

  for (let i = 0; i < parts.length; i++) {
    if (i === 0) {
      html += escapeHtml(parts[i]);
      continue;
    }

    const mIdx = parts[i].indexOf('m');
    if (mIdx === -1) {
      html += escapeHtml(parts[i]);
      continue;
    }

    const code = parts[i].substring(0, mIdx);
    const content = parts[i].substring(mIdx + 1);

    if (code === '0') {
      if (currentColor) html += '</span>';
      currentColor = '';
    } else if (code.startsWith('38;2;')) {
      if (currentColor) html += '</span>';
      const [, , r, g, b] = code.split(';');
      currentColor = `rgb(${r},${g},${b})`;
      html += `<span style="color:${currentColor}">`;
    } else if (code.startsWith('38;5;')) {
      if (currentColor) html += '</span>';
      currentColor = 'inherit';
      html += `<span>`;
    }

    html += escapeHtml(content);
  }

  if (currentColor) html += '</span>';
  return html;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
