/**
 * Canvas → PNG snapshot. Downloads to disk with a timestamped filename.
 */
export function downloadSnapshot(canvas: HTMLCanvasElement, prefix = 'gravity-rivers'): void {
  try {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const ts =
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) + '-' +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());
    a.download = `${prefix}-${ts}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error('snapshot failed', err);
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
