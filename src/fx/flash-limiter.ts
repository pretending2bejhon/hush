// The flash limiter (spec section 11): within one frame, a beat-driven change of 0.1 or more in relative luminance
// passes until the summed area (in canvas pixels at 1280 by 720) would reach FLASH_AREA_LIMIT; that change and
// every later one in the frame come back as a change under 0.1. Smaller changes pass uncounted.
export const FLASH_AREA_LIMIT = 25600;
export const LUM_STEP = 0.1;

export function createFlashLimiter(canvasW: number, canvasH: number): {
  beginFrame(): void;
  request(areaPx: number, fromLum: number, toLum: number): number;
} {
  const scale = (1280 * 720) / (canvasW * canvasH);
  let sum = 0;
  let full = false;
  return {
    beginFrame(): void {
      sum = 0;
      full = false;
    },
    request(areaPx: number, fromLum: number, toLum: number): number {
      const d = toLum - fromLum;
      if (Math.abs(d) < LUM_STEP) return toLum;
      const area = areaPx * scale;
      if (full || sum + area >= FLASH_AREA_LIMIT) {
        full = true;
        return fromLum + Math.sign(d) * 0.099;
      }
      sum += area;
      return toLum;
    },
  };
}
