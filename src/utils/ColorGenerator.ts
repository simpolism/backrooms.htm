/**
 * Utilities for generating and managing colors
 */

/**
 * Generates a sequence of visually distinct colors using the golden ratio
 * @returns An iterator that produces RGB color values
 */
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

/**
 * Converts HSV color values to RGB
 * @param h Hue (0-1)
 * @param s Saturation (0-1)
 * @param v Value (0-1)
 * @returns RGB values as [r, g, b] with values 0-255
 */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
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

/**
 * Converts RGB values to a CSS color string
 * @param rgb RGB values as [r, g, b]
 * @returns CSS color string in the format "rgb(r, g, b)"
 */
export function getRgbColor(rgb: [number, number, number]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}