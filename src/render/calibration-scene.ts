import * as Phaser from 'phaser';

// True once the calibration scene has been created: the page then waits for its first key (the probe's ready()).
export let booted = false;

// The calibration screen (spec section 12): wordless, a rounded key shape in the centre of the canvas. Until the
// calibration passes exist, the first key (any but Escape) hands over to `onFirstKey`, which starts the run.
export class CalibrationScene extends Phaser.Scene {
  private onFirstKey: () => void;

  constructor(onFirstKey: () => void) {
    super('calibration');
    this.onFirstKey = onFirstKey;
  }

  create(): void {
    const g = this.add.graphics();
    g.lineStyle(3, 0x7fd6ff, 0.8);
    g.strokeRoundedRect(600, 320, 80, 80, 14);
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') return;
      window.removeEventListener('keydown', onKey, true);
      this.onFirstKey();
    };
    window.addEventListener('keydown', onKey, true);
    this.events.once('shutdown', () => window.removeEventListener('keydown', onKey, true));
    booted = true;
  }
}
