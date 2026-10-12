// CT1 (HUSH-SPEC section 6.1): the gauntlet's obstacles are built from the pattern. On the transcribed files,
// every mask bit of rooms/11-gauntlet.txt is an onset of its layer in music/area1.strudel at that sixteenth of
// that bar's cycle, and the melody line is the arp layer's scale degrees, in order.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as O from '../fixtures/oracle/index.mjs';
import { barOnsets, compileTrack, loadStrudel } from '../../tools/strudel-node.mjs';

// HUSH_CONTENT_DIR reads the two files from another folder laid out like the repo (the controls).
const ROOT = process.env.HUSH_CONTENT_DIR ? path.resolve(process.env.HUSH_CONTENT_DIR) : path.resolve(import.meta.dirname, '..', '..');
const track = fs.readFileSync(path.join(ROOT, 'music', 'area1.strudel'), 'utf8');
const gauntlet = O.parseGauntlet('11-gauntlet.txt', fs.readFileSync(path.join(ROOT, 'rooms', '11-gauntlet.txt'), 'utf8'));

describe('the gauntlet is built from the pattern', () => {
  it('puts every obstacle on an onset of its layer', async () => {
    const layers = await compileTrack(track);
    expect([...layers.keys()]).toEqual(['kick', 'pad', 'hat', 'bass', 'clap', 'arp', 'perc', 'lead', 'ohat', 'sub']);
    let checked = 0;
    gauntlet.program.forEach((bar, b) => {
      for (const [layer, sixteenths] of Object.entries(bar.masks)) {
        const onsets = barOnsets(layers.get(layer), b).filter((o) => o.exact).map((o) => o.sixteenth);
        for (const s of sixteenths) { expect(onsets).toContain(s); checked += 1; }
      }
    });
    expect(checked).toBeGreaterThan(40);
  });

  it('follows the arp with the wave corridor', async () => {
    const layers = await compileTrack(track);
    const arp = barOnsets(layers.get('arp'), 0);
    expect(arp.map((o) => o.sixteenth)).toEqual([...Array(16).keys()]);
    // The arp's degrees become notes through its scale: the melody line, through the same scale, gives the same notes.
    const { scope } = await loadStrudel();
    const melody = barOnsets(scope.n(gauntlet.melody.join(' ')).scale('C4:minor'), 0);
    expect(arp.map((o) => o.value.note)).toEqual(melody.map((o) => o.value.note));
    expect(new Set(melody.map((o) => o.value.note)).size).toBeGreaterThan(4);
  });
});
