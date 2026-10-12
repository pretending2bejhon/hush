// Reference for tests/fx/flash-limiter.test.mjs (PF-CONTROLS): HUSH-SPEC section 11.
export const FLASH_AREA_LIMIT = 25600;
export const LUM_STEP = 0.1;

export function createFlashLimiter(canvasW, canvasH) {
  const scale = (1280 * 720) / (canvasW * canvasH);
  let sum = 0;
  let full = false;
  return {
    beginFrame() { sum = 0; full = false; },
    request(areaPx, fromLum, toLum) {
      const d = toLum - fromLum;
      if (Math.abs(d) < LUM_STEP) return toLum;
      const area = areaPx * scale;
      if (full || sum + area >= FLASH_AREA_LIMIT) { full = true; return fromLum + Math.sign(d) * (LUM_STEP - 0.001); }
      sum += area;
      return toLum;
    },
  };
}
