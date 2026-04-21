/**
 * Simple hex/RGB color utilities.
 */
export interface RGB { r: number; g: number; b: number }

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h.padEnd(6, '0');
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function shade(hex: string, amt: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: r + amt, g: g + amt, b: b + amt });
}

export function mix(a: string, b: string, t: number): string {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return rgbToHex({
    r: ra.r + (rb.r - ra.r) * t,
    g: ra.g + (rb.g - ra.g) * t,
    b: ra.b + (rb.b - ra.b) * t,
  });
}

/**
 * Simple HSL → hex used to synthesize rainbow streaks.
 */
export function hsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (0 <= hp && hp < 1) { r = c; g = x; }
  else if (1 <= hp && hp < 2) { r = x; g = c; }
  else if (2 <= hp && hp < 3) { g = c; b = x; }
  else if (3 <= hp && hp < 4) { g = x; b = c; }
  else if (4 <= hp && hp < 5) { r = x; b = c; }
  else if (5 <= hp && hp < 6) { r = c; b = x; }
  const m = l - c / 2;
  return rgbToHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 });
}
