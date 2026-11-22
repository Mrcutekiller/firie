import { COLOR_PALETTE, type Season, type Slot, type Style, hexForColor, isNeutralColor } from "./types";

/* -------------------------------------------------------------------------- */
/* File reading                                                               */
/* -------------------------------------------------------------------------- */

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image."));
    img.src = src;
  });
}

async function drawToCanvas(
  src: string,
  maxDim: number
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; scale: number }> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx, scale };
}

/* -------------------------------------------------------------------------- */
/* Compression                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Resizes + re-encodes a photo as JPEG before it ever leaves the device.
 * Keeps cloud storage and mobile data usage low.
 */
export async function compressImage(dataUrl: string, maxDim = 1080, quality = 0.82): Promise<string> {
  const { canvas } = await drawToCanvas(dataUrl, maxDim);
  return canvas.toDataURL("image/jpeg", quality);
}

/* -------------------------------------------------------------------------- */
/* Background removal                                                         */
/* -------------------------------------------------------------------------- */

function colorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Removes background using multi-seed perimeter flood fill, adaptive color
 * distance tolerance, and soft alpha feathering to produce a crisp transparent PNG.
 */
export async function removeBackground(dataUrl: string): Promise<string> {
  try {
    const { canvas, ctx } = await drawToCanvas(dataUrl, 900);
    const { width, height } = canvas;
    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;

    // Collect perimeter background color samples (every 4th pixel along the edges)
    const samples: [number, number, number][] = [];
    const samplePixel = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      samples.push([data[i], data[i + 1], data[i + 2]]);
    };

    const step = Math.max(1, Math.floor(Math.min(width, height) / 40));
    for (let x = 0; x < width; x += step) {
      samplePixel(x, 0);
      samplePixel(x, 1);
      samplePixel(x, height - 1);
      samplePixel(x, height - 2);
    }
    for (let y = 0; y < height; y += step) {
      samplePixel(0, y);
      samplePixel(1, y);
      samplePixel(width - 1, y);
      samplePixel(width - 2, y);
    }

    // Average background color
    const avgBg = samples.reduce(
      (acc, s) => [acc[0] + s[0] / samples.length, acc[1] + s[1] / samples.length, acc[2] + s[2] / samples.length],
      [0, 0, 0]
    );

    // Multi-pass flood fill with adaptive threshold
    const threshold = 55;
    const visited = new Uint8Array(width * height);
    const stack: number[] = [];
    let transparentCount = 0;

    const push = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const idx = y * width + x;
      if (visited[idx]) return;
      visited[idx] = 1;

      const p = idx * 4;
      const dist = colorDistance(data[p], data[p + 1], data[p + 2], avgBg[0], avgBg[1], avgBg[2]);
      
      // Also test against local perimeter samples
      const minSampleDist = samples.length > 0 
        ? Math.min(
            dist,
            colorDistance(data[p], data[p + 1], data[p + 2], samples[0][0], samples[0][1], samples[0][2]),
            colorDistance(data[p], data[p + 1], data[p + 2], samples[samples.length - 1][0], samples[samples.length - 1][1], samples[samples.length - 1][2])
          )
        : dist;

      if (minSampleDist <= threshold) {
        data[p + 3] = 0; // Transparent
        transparentCount++;
        stack.push(x, y);
      }
    };

    // Seed from all perimeter boundaries
    for (let x = 0; x < width; x++) {
      push(x, 0);
      push(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      push(0, y);
      push(width - 1, y);
    }

    while (stack.length > 0) {
      const y = stack.pop()!;
      const x = stack.pop()!;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }

    // Alpha edge smoothing (feather edges so cutouts are smooth)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const p = idx * 4;
        if (data[p + 3] > 0) {
          // Check if adjacent to transparent pixel
          const hasTransparentNeighbor =
            data[((y - 1) * width + x) * 4 + 3] === 0 ||
            data[((y + 1) * width + x) * 4 + 3] === 0 ||
            data[(y * width + (x - 1)) * 4 + 3] === 0 ||
            data[(y * width + (x + 1)) * 4 + 3] === 0;

          if (hasTransparentNeighbor) {
            data[p + 3] = Math.min(data[p + 3], 180); // Feather boundary
          }
        }
      }
    }

    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

/* -------------------------------------------------------------------------- */
/* Colour detection                                                           */
/* -------------------------------------------------------------------------- */

function nearestPaletteColor(r: number, g: number, b: number) {
  let best = COLOR_PALETTE[0];
  let bestDist = Infinity;
  for (const c of COLOR_PALETTE) {
    const hex = c.hex;
    const cr = parseInt(hex.slice(1, 3), 16);
    const cg = parseInt(hex.slice(3, 5), 16);
    const cb = parseInt(hex.slice(5, 7), 16);
    const d = colorDistance(r, g, b, cr, cg, cb);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

export interface ColorResult {
  color: string;
  colorHex: string;
  isNeutral: boolean;
}

/** Finds the dominant garment colour from the (transparent) photo. */
export async function detectDominantColor(dataUrl: string): Promise<ColorResult> {
  try {
    const { canvas, ctx } = await drawToCanvas(dataUrl, 240);
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    const tally = new Map<string, number>();

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue; // skip removed background
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // skip near-white / near-black extremes coming from lighting
      if (r > 245 && g > 245 && b > 245) continue;
      const match = nearestPaletteColor(r, g, b);
      tally.set(match.name, (tally.get(match.name) ?? 0) + 1);
    }

    let bestName = "Grey";
    let bestCount = 0;
    for (const [name, count] of tally) {
      if (count > bestCount) {
        bestCount = count;
        bestName = name;
      }
    }
    return {
      color: bestName,
      colorHex: hexForColor(bestName),
      isNeutral: isNeutralColor(bestName),
    };
  } catch {
    return { color: "Grey", colorHex: hexForColor("Grey"), isNeutral: true };
  }
}

/* -------------------------------------------------------------------------- */
/* Lightweight on-device tagger                                               */
/* -------------------------------------------------------------------------- */

/**
 * Local heuristic fallback used when the vision AI endpoint is not configured
 * or unreachable. Everything it produces is editable by the user on the
 * Add Item screen.
 */
export function guessSlot(category: string): Slot {
  switch (category) {
    case "tops":
      return "top";
    case "bottoms":
      return "bottom";
    case "shoes":
      return "shoes";
    case "caps":
      return "cap";
    case "rings":
      return "ring";
    case "accessories":
      return "accessory";
    case "traditional":
      return "top";
    default:
      return "top";
  }
}

export function guessStyleFromName(name: string, colorIsNeutral: boolean): Style {
  const n = name.toLowerCase();
  if (/kemis|netela|habesha|kaba|tilet|gabi/.test(n)) return "traditional";
  if (/suit|blazer|oxford|trouser|loafer|heel|dress shirt|formal/.test(n)) return "formal";
  if (/shirt|jacket|blazer|loafer|trouser|dress/.test(n)) return "classy";
  if (/jogger|running|gym|track|sport|athletic/.test(n)) return "sporty";
  if (/hoodie|graphic|tee|street|cargo|sneaker/.test(n)) return "streetwear";
  return colorIsNeutral ? "classy" : "casual";
}

export function guessSeasonFromName(name: string): Season {
  const n = name.toLowerCase();
  if (/wool|knit|sweater|coat|puffer|thermal|jacket|boot/.test(n)) return "winter";
  if (/linen|shorts|tank|sandal|summer|breezy/.test(n)) return "summer";
  if (/cardigan|light|chino/.test(n)) return "autumn";
  return "all";
}
