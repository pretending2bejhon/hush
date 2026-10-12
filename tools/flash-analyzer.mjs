// The flash predicate of WCAG 2.3.1 as D10 and X6 state it, on a sequence of RGBA frames of the canvas.
// General flash: a transition is a change in relative luminance of 0.1 or more where the darker state is below
// 0.80; each pixel's transitions are found with hysteresis (from its last extreme). Red flash (WCAG 2.2's
// working definition): a transition between two states one of which has R/(R+G+B) >= 0.8, more than 0.2 apart
// in the CIE 1976 u'v' chromaticity diagram; the luminance exception never covers red. The two are counted
// separately. More than three flashes in one second is eight or more transitions inside the last 1000 ms. At
// every frame the pixels over that count are summed, separately for general and red, in canvas pixels; the
// run fails when either sum reaches AREA_LIMIT, 25% of a 10 degree field taken as 2.78% of the 1280 by 720
// canvas (HUSH-SPEC section 11).
export const AREA_LIMIT = 25600;
export const LUM_STEP = 0.1;
export const DARK_LIMIT = 0.8;
export const RED_RATIO = 0.8;
export const RED_DUV = 0.2;
export const TRANSITIONS_OVER = 8;
export const WINDOW_MS = 1000;
const RING = TRANSITIONS_OVER;
const WHITE_U = 0.1978;
const WHITE_V = 0.4683;

export const LINEAR = Float32Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

export function luminance(r, g, b) {
  return 0.2126 * LINEAR[r] + 0.7152 * LINEAR[g] + 0.0722 * LINEAR[b];
}

// Red ratio and u'v' of one sRGB colour (linear components); near black is achromatic.
export function chroma(r, g, b) {
  const R = LINEAR[r];
  const G = LINEAR[g];
  const B = LINEAR[b];
  const sum = R + G + B;
  const X = 0.4124 * R + 0.3576 * G + 0.1805 * B;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = 0.0193 * R + 0.1192 * G + 0.9505 * B;
  const den = X + 15 * Y + 3 * Z;
  if (Y < 1e-4 || den <= 0) return { ratio: sum > 0 ? R / sum : 0, u: WHITE_U, v: WHITE_V };
  return { ratio: R / sum, u: (4 * X) / den, v: (9 * Y) / den };
}

// pxArea: canvas pixels covered by one analysed pixel.
export function createFlashAnalyzer({ width, height, pxArea = 1 }) {
  const n = width * height;
  const gDir = new Int8Array(n);
  const gExt = new Float32Array(n);
  const gTimes = new Float64Array(n * RING);
  const gHead = new Uint8Array(n);
  const gCount = new Uint32Array(n);
  const rRatio = new Float32Array(n);
  const rU = new Float32Array(n);
  const rV = new Float32Array(n);
  const rTimes = new Float64Array(n * RING);
  const rHead = new Uint8Array(n);
  const rCount = new Uint32Array(n);
  let frames = 0;
  let firstT = 0;
  let lastT = 0;
  const intervals = [];
  const worst = { general: 0, generalAt: 0, red: 0, redAt: 0 };
  const series = [];

  function mark(times, head, count, p, t) {
    times[p * RING + head[p]] = t;
    head[p] = (head[p] + 1) % RING;
    count[p] += 1;
  }
  const over = (times, head, count, p, t) => count[p] >= TRANSITIONS_OVER && times[p * RING + head[p]] > t - WINDOW_MS;

  return {
    // rgba: Uint8Array-like of width*height*4 bytes; t: milliseconds.
    push(rgba, t) {
      if (frames > 0) intervals.push(t - lastT);
      else firstT = t;
      for (let p = 0, o = 0; p < n; p++, o += 4) {
        const r = rgba[o];
        const g = rgba[o + 1];
        const b = rgba[o + 2];
        const L = 0.2126 * LINEAR[r] + 0.7152 * LINEAR[g] + 0.0722 * LINEAR[b];
        if (frames === 0) {
          gExt[p] = L;
          const c = chroma(r, g, b);
          rRatio[p] = c.ratio; rU[p] = c.u; rV[p] = c.v;
          continue;
        }
        const d = gDir[p];
        const e = gExt[p];
        if (d > 0) {
          if (L > e) gExt[p] = L;
          else if (e - L >= LUM_STEP && L < DARK_LIMIT) { gDir[p] = -1; gExt[p] = L; mark(gTimes, gHead, gCount, p, t); }
        } else if (d < 0) {
          if (L < e) gExt[p] = L;
          else if (L - e >= LUM_STEP && e < DARK_LIMIT) { gDir[p] = 1; gExt[p] = L; mark(gTimes, gHead, gCount, p, t); }
        } else if (L - e >= LUM_STEP && e < DARK_LIMIT) { gDir[p] = 1; gExt[p] = L; mark(gTimes, gHead, gCount, p, t); }
        else if (e - L >= LUM_STEP && L < DARK_LIMIT) { gDir[p] = -1; gExt[p] = L; mark(gTimes, gHead, gCount, p, t); }
        const R = LINEAR[r];
        const sum = R + LINEAR[g] + LINEAR[b];
        const ratio = sum > 0 ? R / sum : 0;
        if (ratio >= RED_RATIO || rRatio[p] >= RED_RATIO) {
          const c = chroma(r, g, b);
          const du = c.u - rU[p];
          const dv = c.v - rV[p];
          if (du * du + dv * dv > RED_DUV * RED_DUV) {
            rRatio[p] = c.ratio; rU[p] = c.u; rV[p] = c.v;
            mark(rTimes, rHead, rCount, p, t);
          }
        }
      }
      let ga = 0;
      let ra = 0;
      for (let p = 0; p < n; p++) {
        if (over(gTimes, gHead, gCount, p, t)) ga += 1;
        if (over(rTimes, rHead, rCount, p, t)) ra += 1;
      }
      const general = ga * pxArea;
      const red = ra * pxArea;
      if (general > worst.general) { worst.general = general; worst.generalAt = t - firstT; }
      if (red > worst.red) { worst.red = red; worst.redAt = t - firstT; }
      if (general || red) series.push([Math.round(t - firstT), Math.round(general), Math.round(red)]);
      frames += 1;
      lastT = t;
    },
    result() {
      const sorted = [...intervals].sort((a, b) => a - b);
      const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : Infinity;
      return {
        frames,
        seconds: frames ? (lastT - firstT) / 1000 : 0,
        medianFrameMs: Math.round(median * 100) / 100,
        maxGeneralArea: Math.round(worst.general),
        maxGeneralAtMs: Math.round(worst.generalAt),
        maxRedArea: Math.round(worst.red),
        maxRedAtMs: Math.round(worst.redAt),
        areaLimit: AREA_LIMIT,
        overFrames: series.length,
        series: series.slice(0, 50),
      };
    },
  };
}
