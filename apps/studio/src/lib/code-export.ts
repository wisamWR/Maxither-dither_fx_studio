import type { TextResult, ColorTextResult } from '@ditherforge/core';

export type CodeFormat = 'react' | 'web-component' | 'html';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isColorResult(result: TextResult | ColorTextResult): result is ColorTextResult {
  return 'colors' in result;
}

function buildColorSpans(result: ColorTextResult): string {
  const lines = result.text.split('\n');
  return lines
    .map((line, row) => {
      const colors = result.colors[row];
      if (!colors) return escapeHtml(line);
      return Array.from(line)
        .map((ch, col) => {
          const color = colors[col];
          if (!color) return escapeHtml(ch);
          return `<span style="color:${color}">${escapeHtml(ch)}</span>`;
        })
        .join('');
    })
    .join('\n');
}

function buildReactColorSpans(result: ColorTextResult): string {
  const lines = result.text.split('\n');
  return lines
    .map((line, row) => {
      const colors = result.colors[row];
      if (!colors) return escapeHtml(line);
      return Array.from(line)
        .map((ch, col) => {
          const color = colors[col];
          if (!color) return escapeHtml(ch);
          return `<span style={{ color: '${color}' }}>${escapeHtml(ch)}</span>`;
        })
        .join('');
    })
    .join('\n');
}

function generateReact(
  result: TextResult | ColorTextResult,
  fgColor: string,
  bgColor: string,
): string {
  if (isColorResult(result)) {
    const spans = buildReactColorSpans(result);
    return `export default function AsciiArt() {
  return (
    <pre style={{
      fontFamily: 'monospace',
      fontSize: '14px',
      lineHeight: '1.2',
      color: '${fgColor}',
      backgroundColor: '${bgColor}',
      padding: '16px',
      overflow: 'auto',
    }}>
${spans}
    </pre>
  );
}`;
  }

  const escaped = escapeHtml(result.text);
  return `export default function AsciiArt() {
  return (
    <pre style={{
      fontFamily: 'monospace',
      fontSize: '14px',
      lineHeight: '1.2',
      color: '${fgColor}',
      backgroundColor: '${bgColor}',
      padding: '16px',
      overflow: 'auto',
    }}>
{\`${escaped}\`}
    </pre>
  );
}`;
}

function generateWebComponent(
  result: TextResult | ColorTextResult,
  fgColor: string,
  bgColor: string,
): string {
  const content = isColorResult(result)
    ? buildColorSpans(result)
    : escapeHtml(result.text);

  return `<script>
class AsciiArt extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = \`
      <style>
        pre { font-family: monospace; font-size: 14px; line-height: 1.2; color: ${fgColor}; background: ${bgColor}; padding: 16px; overflow: auto; }
      </style>
      <pre>${content}</pre>
    \`;
  }
}
customElements.define('ascii-art', AsciiArt);
</script>
<ascii-art></ascii-art>`;
}

function generateHtml(
  result: TextResult | ColorTextResult,
  fgColor: string,
  bgColor: string,
): string {
  const content = isColorResult(result)
    ? buildColorSpans(result)
    : escapeHtml(result.text);

  return `<pre style="font-family:monospace;font-size:14px;line-height:1.2;color:${fgColor};background:${bgColor};padding:16px;overflow:auto;">
${content}
</pre>`;
}

export function generateCode(
  result: TextResult | ColorTextResult,
  format: CodeFormat,
  fgColor: string,
  bgColor: string,
): string {
  switch (format) {
    case 'react':
      return generateReact(result, fgColor, bgColor);
    case 'web-component':
      return generateWebComponent(result, fgColor, bgColor);
    case 'html':
      return generateHtml(result, fgColor, bgColor);
  }
}
