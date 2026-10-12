// The track's layers (spec section 8.3, Vault City's compileRoom): the labelled-layer capture. The Strudel
// namespace comes in as `S` (the page passes @strudel/web, Node passes the packages), so this module imports
// nothing from Strudel itself.
export interface Hap {
  whole: { begin: unknown; end: unknown };
  value: unknown;
  hasOnset(): boolean;
}
export interface Pattern {
  queryArc(begin: number, end: number): Hap[];
}

interface PatternClass {
  prototype: { p: (this: Pattern, name: unknown) => Pattern };
}
type Transpile = (code: string, opts: { addReturn: boolean; emitMiniLocations: boolean; emitWidgets: boolean }) => { output: string };

export function compileTrack(code: string, S: Record<string, unknown>): { names: string[]; layers: Pattern[] } {
  const names: string[] = [];
  const layers: Pattern[] = [];
  const P = (S.Pattern as PatternClass).prototype;
  const previous = P.p;
  let anonymous = 0;
  // `p` takes the label of a layer: `$` becomes `$1`, `$2` in order, a label starting with `_` is muted (not
  // captured), a repeated label keeps its first pattern.
  P.p = function capture(this: Pattern, name: unknown): Pattern {
    const key = name === '$' ? `$${++anonymous}` : String(name);
    if (!key.startsWith('_') && !names.includes(key)) {
      names.push(key);
      layers.push(this);
    }
    return this;
  };
  try {
    const scope: Record<string, unknown> = { ...S, setcpm() {}, setcps() {}, hush() {}, evaluate() {} };
    const keys = Object.keys(scope).filter((n) => /^[A-Za-z_$][\w$]*$/.test(n) && !['eval', 'arguments', 'default'].includes(n));
    const { output } = (S.transpiler as Transpile)(code, { addReturn: false, emitMiniLocations: false, emitWidgets: false });
    Function(...keys, `"use strict";${output}`)(...keys.map((k) => scope[k]));
  } finally {
    P.p = previous;
  }
  return { names, layers };
}
