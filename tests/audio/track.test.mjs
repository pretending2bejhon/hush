// AU1: the labelled-layer capture (src/audio/track.ts, Vault City's compileRoom): music/area1.strudel compiles to
// its ten layers in file order, each with the onsets of HUSH-SPEC section 7; `$:` labels are numbered and `_`
// labels muted. Node runs it on the Strudel packages (tools/strudel-node.mjs); the page passes @strudel/web.
import { describe, expect, it } from 'vitest';
import { load } from '../helpers/load.mjs';
import { barOnsets, loadStrudel } from '../../tools/strudel-node.mjs';
import { specBlocks } from '../../tools/spec-content.mjs';

const A = await load('HUSH_AUDIO_MODULE', new URL('../../src/audio/track.ts', import.meta.url));
const { scope, transpiler } = await loadStrudel();
const S = { ...scope, transpiler };
const TRACK = specBlocks().get('music/area1.strudel');

describe('AU1 track layers', () => {
  it('captures the ten layers of area1 in order with their onsets', () => {
    const { names, layers } = A.compileTrack(TRACK, S);
    expect(names).toEqual(['kick', 'pad', 'hat', 'bass', 'clap', 'arp', 'perc', 'lead', 'ohat', 'sub']);
    const want = {
      kick: [0, 4, 8, 12], pad: [0], hat: [0, 2, 4, 6, 8, 10, 12, 14], bass: [1, 3, 5, 6, 9, 11, 13, 15], clap: [4, 12],
      arp: [...Array(16).keys()], perc: [0, 4, 6, 10, 12], lead: [0, 6, 12], ohat: [2, 6, 10, 14], sub: [0],
    };
    names.forEach((n, i) => {
      for (let bar = 0; bar < 4; bar++) expect([n, bar, [...new Set(barOnsets(layers[i], bar).map((o) => o.sixteenth))]]).toEqual([n, bar, want[n]]);
    });
  });

  it('numbers $ labels, mutes _ labels, and ignores the tempo call', () => {
    const { names } = A.compileTrack('setcpm(140/4)\n$: s("sbd")\n_quiet: s("white")\nhat: s("white*2")\n$: s("sbd*2")\n', S);
    expect(names).toEqual(['$1', 'hat', '$2']);
  });
});
