export function generateDistinctColors() {
  let hue = 0;
  const goldenRatioConjugate = 0.618033988749895;
  
  return {
    next: () => {
      hue += goldenRatioConjugate;
      hue %= 1;
      const rgb = hsvToRgb(hue, 0.95, 0.95);
      return rgb;
    }
  };
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  let r: number, g: number, b: number;
  
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    default: r = 0; g = 0; b = 0;
  }
  
  return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}

export function getRgbColor(rgb: [number, number, number]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString()
    .replace(/T/, '_')
    .replace(/\..+/, '')
    .replace(/:/g, '');
}

export function formatLogFilename(models: string[], template: string): string {
  const timestamp = formatTimestamp();
  return `${models.join('_')}_${template}_${timestamp}.txt`;
}

export function getCurrentTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function generateUniqueId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}