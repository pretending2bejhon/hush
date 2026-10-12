import * as Phaser from 'phaser';

// True once the calibration scene has been created: the page then waits for its first key (the probe's ready()).
export let booted = false;

// The calibration screen (spec section 12): wordless, a rounded key shape in the centre of the canvas.
export class CalibrationScene extends Phaser.Scene {
  constructor() {
    super('calibration');
  }

  create(): void {
    const g = this.add.graphics();
    g.lineStyle(3, 0x7fd6ff, 0.8);
    g.strokeRoundedRect(600, 320, 80, 80, 14);
    booted = true;
  }
}
